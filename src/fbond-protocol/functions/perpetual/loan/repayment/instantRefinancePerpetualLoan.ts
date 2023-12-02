import { BN, web3 } from '@project-serum/anchor';
import {
  ENCODER,
  AUTOCOMPOUND_DEPOSIT_PREFIX,
  BOND_OFFER_PREFIX,
  HADOMARKET_REGISTRY_PREFIX,
  MUTUAL_BOND_TRADE_TXN_VAULT,
  PERPETUAL_SPONSOR_VAULT,
  BOND_OFFER_VAULT_PREFIX,
  REPAY_FEE_APR,
  EMPTY_PUBKEY,
} from '../../../../constants';

import { returnAnchorProgram } from '../../../../helpers';
import {
  BondAndTransactionOptimistic,
  calculateCurrentInterestSolPure,
  nowInSeconds,
  optimisticBorrowPerpetual,
  optimisticRepayBondTradeTransaction,
  optimisticRepayUpdateBondingBondOffer,
} from '../../offer';
import { BondOfferV2, BondTradeTransactionV2, FraktBond, HadoMarket } from '../../../../types';

type InstantRefinancePerpetualLoan = (params: {
  programId: web3.PublicKey;
  connection: web3.Connection;

  addComputeUnits?: boolean;

  accounts: {
    fbond: web3.PublicKey;
    userPubkey: web3.PublicKey;
    hadoMarket: web3.PublicKey;
    protocolFeeReceiver: web3.PublicKey;
    previousBondTradeTransaction: web3.PublicKey;
    bondOffer: web3.PublicKey;
    oldBondOffer: web3.PublicKey;

  };
  optimistic: {
    oldBondTradeTransaction: BondTradeTransactionV2;

    bondOffer: BondOfferV2;
    oldBondOffer?: BondOfferV2;
    fraktBond: FraktBond;
    // hadoMarket: HadoMarket;
    minMarketFee: number;
  };

  sendTxn: (transaction: web3.Transaction, signers: web3.Signer[]) => Promise<void>;
}) => Promise<{
  instructions: web3.TransactionInstruction[];
  signers: web3.Signer[];
  optimisticResult: {
    bondOffer: BondOfferV2;
    newBondTradeTransaction: BondTradeTransactionV2;
    fraktBond: FraktBond;
    oldBondTradeTransaction: BondTradeTransactionV2;
    oldBondOffer?: BondOfferV2;
  };
}>;

export const instantRefinancePerpetualLoan: InstantRefinancePerpetualLoan = async ({
  programId,
  connection,
  accounts,
  optimistic,
  addComputeUnits,
  sendTxn,
}) => {
  const program = returnAnchorProgram(programId, connection);
  const instructions: web3.TransactionInstruction[] = [];
  const mockBondOffer = new web3.PublicKey("AzCWVy3S2NCW5HVKUuxsbf8Cw5jAYuh3pE3hjAUgKhPL");

  const [bondTradeTransactionV2] = await web3.PublicKey.findProgramAddress(
    [
      ENCODER.encode(AUTOCOMPOUND_DEPOSIT_PREFIX),
      accounts.fbond.toBuffer(),
      accounts.bondOffer.toBuffer(),
      ENCODER.encode('1'),
      ENCODER.encode('1'),
    ],
    program.programId,
  );

  const [sponsorVault, sponsorVaultBump] = await web3.PublicKey.findProgramAddress(
    [ENCODER.encode(PERPETUAL_SPONSOR_VAULT),],
    program.programId,
  );

  const modifyComputeUnits = web3.ComputeBudgetProgram.setComputeUnitLimit({
    units: Math.round(800000 + Math.ceil(Math.random() * 10000)),
  });
  const requestHeap = web3.ComputeBudgetProgram.requestHeapFrame({ bytes: 1024 * 250 });
  instructions.push(requestHeap);

  if (!!addComputeUnits) instructions.push(modifyComputeUnits);
  const [mutualBondTradeTxnVault] = await web3.PublicKey.findProgramAddress(
    [ENCODER.encode(MUTUAL_BOND_TRADE_TXN_VAULT)],
    program.programId,
  );

  // console.log(
  //   'accounts: ',
  //   anchorRawBNsAndPubkeysToNumsAndStrings({ publicKey: hadoRegistry, account: accountsIntoInstruction }),
  // );

  const [bondOfferVault, bondOfferVaultBump] = await web3.PublicKey.findProgramAddress(
    [
      ENCODER.encode(BOND_OFFER_VAULT_PREFIX),
      accounts.bondOffer.toBuffer(),
    ],
    program.programId,
  );
  const [oldBondOfferVault, oldBondOfferVaultBump] = await web3.PublicKey.findProgramAddress(
    [
      ENCODER.encode(BOND_OFFER_VAULT_PREFIX),
      accounts.oldBondOffer.toBuffer(),
    ],
    program.programId,
  );

  instructions.push(
    await program.methods
      .instantRefinancePerpetualLoan()
      .accountsStrict({
        oldBondTradeTransactionV2: accounts.previousBondTradeTransaction,
        fbond: accounts.fbond,
        bondOfferV2: accounts.bondOffer,
        bondTradeTransactionV2: bondTradeTransactionV2,
        user: accounts.userPubkey,

        protocolFeeReceiver: accounts.protocolFeeReceiver,

        hadoMarket: accounts.hadoMarket,

        systemProgram: web3.SystemProgram.programId,
        mutualBondTradeTxnVault,
        uninitializedOldBondOfferV2: accounts.oldBondOffer,
        rent: web3.SYSVAR_RENT_PUBKEY,
        sponsorVault: sponsorVault,
        bondOfferVault: bondOfferVault,
        oldBondOfferVault: oldBondOfferVault
      })
      .instruction(),
  );
  const transaction = new web3.Transaction();
  for (let instruction of instructions) transaction.add(instruction);

  const signers = [];
  await sendTxn(transaction, signers);

  const updatedOldBondTradeTransaction = optimisticRepayBondTradeTransaction(optimistic.oldBondTradeTransaction, true);
  const fullLoanBody = optimistic.oldBondTradeTransaction.solAmount + optimistic.oldBondTradeTransaction.feeAmount;
  const now = nowInSeconds();
  const interestSol = calculateCurrentInterestSolPure({
    loanValue: fullLoanBody,
    startTime: optimistic.oldBondTradeTransaction.soldAt,

    currentTime: now,
    rateBasePoints: optimistic.oldBondTradeTransaction.amountOfBonds,
  });
  const repayFeeSol = calculateCurrentInterestSolPure({
    loanValue: fullLoanBody,
    startTime: optimistic.oldBondTradeTransaction.soldAt,

    currentTime: now,
    rateBasePoints: REPAY_FEE_APR,
  });
  const amountToReturn = fullLoanBody + interestSol + repayFeeSol;

  const optimisticResult = optimisticBorrowPerpetual({
    fraktBond: optimistic.fraktBond,
    bondTradeTransactionV2: bondTradeTransactionV2.toBase58(),

    bondOffer: optimistic.bondOffer,

    userPubkey: accounts.userPubkey.toBase58(),

    amountOfSolToGet: amountToReturn,
    minMarketFee: optimistic.minMarketFee,
    inputFee: false,
    isRefinance: true,
    isBorrower: false
  });

  const updatedOldBondOffer = optimistic.oldBondOffer ? optimisticRepayUpdateBondingBondOffer(optimistic.oldBondOffer, fullLoanBody, interestSol, false) : optimistic.oldBondOffer;

  return {
    instructions,
    signers,
    optimisticResult: {
      bondOffer: optimisticResult.bondOffer,
      fraktBond: optimisticResult.fraktBond,
      newBondTradeTransaction: optimisticResult.bondTradeTransaction,
      oldBondTradeTransaction: updatedOldBondTradeTransaction,
      oldBondOffer: updatedOldBondOffer
    },
  };
};
