import { BASE_POINTS, BOND_OFFER_VAULT_PREFIX, ENCODER, MUTUAL_BOND_TRADE_TXN_VAULT, REPAY_FEE_APR } from '../../../../constants';
import { BondOfferV2, BondTradeTransactionV2, BondTradeTransactionV2State, FraktBond, RedeemResult } from '../../../../types';
import { BondAndTransactionOptimistic, calculateCurrentInterestSolPure, nowInSeconds, optimisticRepayUpdateBondingBondOffer } from '../../offer';
import { returnAnchorProgram } from './../../../../helpers';
import { BN, web3 } from '@project-serum/anchor';

type RepayPartialPerpetualLoan = (params: {
  programId: web3.PublicKey;
  connection: web3.Connection;

  args: {
    fractionToRepay: number;
    optimistic:  {
      oldBondOffer?: BondOfferV2;
       fraktBond: FraktBond;
       bondTradeTransaction: BondTradeTransactionV2;
     };
  };
  addComputeUnits?: boolean;

  accounts: {
    lender: web3.PublicKey;
    oldBondTradeTransactionV2: web3.PublicKey;

    fbond: web3.PublicKey;

    userPubkey: web3.PublicKey;
    protocolFeeReceiver: web3.PublicKey;
    oldBondOffer: web3.PublicKey;

  };

  sendTxn: (transaction: web3.Transaction, signers: web3.Signer[]) => Promise<void>;
}) => Promise<{
  // fbond: web3.PublicKey;
  instructions: web3.TransactionInstruction[];
  signers: web3.Signer[];
  optimisticResults: {
    fraktBond: FraktBond;
    bondTradeTransaction: BondTradeTransactionV2;
    repaidBondTradeTransaction: BondTradeTransactionV2;
    oldBondOffer?: BondOfferV2;

  }[];
}>;

export const repayPartialPerpetualLoan: RepayPartialPerpetualLoan = async ({
  programId,
  connection,
  args,
  addComputeUnits,
  accounts,
  sendTxn,
}) => {
  const program = returnAnchorProgram(programId, connection);
  const instructions: web3.TransactionInstruction[] = [];

  const repaidBondTradeTransaction = web3.Keypair.generate();

  const [mutualBondTradeTxnVault] = await web3.PublicKey.findProgramAddress(
    [ENCODER.encode(MUTUAL_BOND_TRADE_TXN_VAULT)],
    program.programId,
  );

  const [oldBondOfferVault, oldBondOfferVaultBump] = await web3.PublicKey.findProgramAddress(
    [
      ENCODER.encode(BOND_OFFER_VAULT_PREFIX),
      accounts.oldBondOffer.toBuffer(),
    ],
    program.programId,
  );

  const modifyComputeUnits = web3.ComputeBudgetProgram.setComputeUnitLimit({
    units: Math.round(800000 + Math.ceil(Math.random() * 10000)),
  });
  const requestHeap = web3.ComputeBudgetProgram.requestHeapFrame({ bytes: 1024 * 250 });
  instructions.push(requestHeap);

  if (!!addComputeUnits) instructions.push(modifyComputeUnits);

  instructions.push(
    await program.methods
      .repayPartialPerpetualLoan(new BN(args.fractionToRepay))
      .accountsStrict({
        user: accounts.userPubkey,

        fbond: accounts.fbond,
        lender: accounts.lender,
        oldBondTradeTransactionV2: accounts.oldBondTradeTransactionV2,
        repaidBondTradeTransactionV2: repaidBondTradeTransaction.publicKey,

        protocolFeeReceiver: accounts.protocolFeeReceiver,
        systemProgram: web3.SystemProgram.programId,
        rent: web3.SYSVAR_RENT_PUBKEY,
        uninitializedOldBondOfferV2: accounts.oldBondOffer,
        mutualBondTradeTxnVault: mutualBondTradeTxnVault,
        bondOfferVault: oldBondOfferVault
      })
      .instruction(),
  );

  const transaction = new web3.Transaction();
  for (let instruction of instructions) transaction.add(instruction);

  const signers = [repaidBondTradeTransaction];
  await sendTxn(transaction, signers);

  const partialLoanValueToRepay = (args.optimistic.bondTradeTransaction.solAmount * args.fractionToRepay) / BASE_POINTS;

  const now = nowInSeconds();
  const interestSol = calculateCurrentInterestSolPure({
    loanValue: partialLoanValueToRepay,
    startTime: args.optimistic.bondTradeTransaction.soldAt,

    currentTime: now,
    rateBasePoints: args.optimistic.bondTradeTransaction.amountOfBonds,
  });
  const repayFeeSol = calculateCurrentInterestSolPure({
    loanValue: partialLoanValueToRepay,
    startTime: args.optimistic.bondTradeTransaction.soldAt,

    currentTime: now,
    rateBasePoints: REPAY_FEE_APR,
  });
  const amountToReturn = partialLoanValueToRepay + interestSol + repayFeeSol;
  const updatedBond: FraktBond = {
    ...args.optimistic.fraktBond,
    currentPerpetualBorrowed: args.optimistic.fraktBond.currentPerpetualBorrowed - amountToReturn,
    lastTransactedAt: nowInSeconds(),
  };
  //  optimisticRepayFraktBond(args.optimistic.fraktBond, amountToReturn);
  const updatedBondTradeTransaction: BondTradeTransactionV2 = {
    ...args.optimistic.bondTradeTransaction,
    solAmount: args.optimistic.bondTradeTransaction.solAmount - partialLoanValueToRepay,
  };

  const repaidBondTradeTransactionOptimistic: BondTradeTransactionV2 = {
    ...args.optimistic.bondTradeTransaction,
    publicKey: repaidBondTradeTransaction.publicKey.toBase58(),
    bondTradeTransactionState: BondTradeTransactionV2State.PerpetualPartialRepaid,
    solAmount: partialLoanValueToRepay,
    feeAmount: 0,
    redeemedAt: nowInSeconds(),
    redeemResult: RedeemResult.AutoReceiveSol,
  };

  const updatedOldBondOffer = args.optimistic.oldBondOffer ? optimisticRepayUpdateBondingBondOffer(args.optimistic.oldBondOffer, partialLoanValueToRepay, interestSol, true) : args.optimistic.oldBondOffer
  
  const optimisticResult = {
    fraktBond: updatedBond,
    bondTradeTransaction: updatedBondTradeTransaction,
    repaidBondTradeTransaction: repaidBondTradeTransactionOptimistic,
    oldBondOffer: updatedOldBondOffer,
  };

  return {
    instructions,
    signers,
    optimisticResults: [optimisticResult] ,
  };
};
