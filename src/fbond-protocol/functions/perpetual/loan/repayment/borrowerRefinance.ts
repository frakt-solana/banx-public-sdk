import {
  BOND_OFFER_VAULT_PREFIX,
  BOND_TRADE_TRANSACTOIN_PREFIX,
  EMPTY_PUBKEY,
  ENCODER,
  MUTUAL_BOND_TRADE_TXN_VAULT,
  PERPETUAL_SPONSOR_VAULT,
} from '../../../../constants';
import { returnAnchorProgram } from '../../../../helpers';
import { BondOfferV2, BondTradeTransactionV2, FraktBond } from '../../../../types';
import {
  calculateCurrentInterestSolPure,
  checkIsHadomarketSponsored,
  nowInSeconds,
  optimisticBorrowPerpetual,
  optimisticRepayBondTradeTransaction,
  optimisticRepayUpdateBondingBondOffer,
} from '../../offer';
import { BN, web3 } from '@project-serum/anchor';

type BorrowerRefinance = (params: {
  programId: web3.PublicKey;
  connection: web3.Connection;

  addComputeUnits?: boolean;

  args: {
    solToRefinance: number;
  };

  accounts: {
    fbond: web3.PublicKey;
    userPubkey: web3.PublicKey;
    hadoMarket: web3.PublicKey;
    protocolFeeReceiver: web3.PublicKey;
    previousBondTradeTransaction: web3.PublicKey;
    bondOffer: web3.PublicKey;
    previousLender: web3.PublicKey;
    oldBondOffer: web3.PublicKey;

  };
  optimistic: {
    oldBondTradeTransaction: BondTradeTransactionV2;
    oldBondOffer?: BondOfferV2;

    bondOffer: BondOfferV2;
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
    oldBondOffer?: BondOfferV2;

    newBondTradeTransaction: BondTradeTransactionV2;
    fraktBond: FraktBond;
    oldBondTradeTransaction: BondTradeTransactionV2;
  };
}>;

export const borrowerRefinance: BorrowerRefinance = async ({
  programId,
  connection,
  accounts,
  args,
  optimistic,
  addComputeUnits,
  sendTxn,
}) => {
  const program = returnAnchorProgram(programId, connection);
  const instructions: web3.TransactionInstruction[] = [];
  const bondTradeTransactionV2Seed = Math.ceil(Math.random() * 1000000);

  const mockBondOffer = new web3.PublicKey("AzCWVy3S2NCW5HVKUuxsbf8Cw5jAYuh3pE3hjAUgKhPL");
  const [bondTradeTransactionV2, bondTradeTransactionV2Bump] = await web3.PublicKey.findProgramAddress(
    [
      ENCODER.encode(BOND_TRADE_TRANSACTOIN_PREFIX),
      accounts.userPubkey.toBuffer(),
      ENCODER.encode(bondTradeTransactionV2Seed.toString()),
    ],
    program.programId,
  );

  const [sponsorVault, sponsorVaultBump] = await web3.PublicKey.findProgramAddress(
    [ENCODER.encode(PERPETUAL_SPONSOR_VAULT)],
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
      .borroweRefinance(new BN(args.solToRefinance), new BN(bondTradeTransactionV2Seed))
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
        rent: web3.SYSVAR_RENT_PUBKEY,
        lender: accounts.previousLender,
        uninitializedOldBondOfferV2: accounts.oldBondOffer,
        sponsorVault: sponsorVault,
        bondOfferVault: bondOfferVault,
        oldBondOfferVault: oldBondOfferVault ,
      })
      .instruction(),
  );
  const transaction = new web3.Transaction();
  for (let instruction of instructions) transaction.add(instruction);

  const signers = [];
  await sendTxn(transaction, signers);

  const optimisticResult = optimisticBorrowPerpetual({
    fraktBond: optimistic.fraktBond,
    bondTradeTransactionV2: bondTradeTransactionV2.toBase58(),

    bondOffer: optimistic.bondOffer,

    userPubkey: accounts.userPubkey.toBase58(),

    amountOfSolToGet: args.solToRefinance,
    minMarketFee: optimistic.minMarketFee,
    inputFee: false,
    isRefinance: true,
    isBorrower: true
  });

  const fullLoanBody = optimistic.oldBondTradeTransaction.solAmount + optimistic.oldBondTradeTransaction.feeAmount;
  const solInterest =     calculateCurrentInterestSolPure({
    loanValue: fullLoanBody,
    startTime:  optimistic.oldBondTradeTransaction.soldAt,
    currentTime: nowInSeconds(),
    rateBasePoints:  optimistic.oldBondTradeTransaction.amountOfBonds,
  });
  
  const updatedOldBondOffer = optimistic.oldBondOffer ? optimisticRepayUpdateBondingBondOffer(optimistic.oldBondOffer, fullLoanBody, solInterest, false) : optimistic.oldBondOffer;

  const updatedOldBondTradeTransaction = optimisticRepayBondTradeTransaction(optimistic.oldBondTradeTransaction, true);


  return {
    instructions,
    signers,
    optimisticResult: {
      bondOffer: optimisticResult.bondOffer,
      fraktBond: { ...optimisticResult.fraktBond, borrowedAmount: args.solToRefinance },
      newBondTradeTransaction: optimisticResult.bondTradeTransaction,
      oldBondTradeTransaction: updatedOldBondTradeTransaction,
      oldBondOffer: updatedOldBondOffer
    },
  };
};
