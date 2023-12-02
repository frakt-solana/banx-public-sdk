import { BN, web3 } from '@project-serum/anchor';
import {
  ENCODER,
  AUTOCOMPOUND_DEPOSIT_PREFIX,
  BOND_OFFER_PREFIX,
  HADOMARKET_REGISTRY_PREFIX,
  PERPETUAL_REFINANCE_INTEREST_REFRESH_RATE,
  PERPETUAL_REFINANCE_INTEREST_TIC,
  PROTOCOL_FEE,
  BASE_POINTS,
  PERPETUAL_SPONSOR_VAULT,
  MAX_PERPETUAL_APR,
  MUTUAL_BOND_TRADE_TXN_VAULT,
  BOND_OFFER_VAULT_PREFIX,
  REPAY_FEE_APR,
} from '../../../../constants';

import { returnAnchorProgram } from '../../../../helpers';
import {
  BondAndTransactionOptimistic,
  calculateCurrentInterestSolPure,
  nowInSeconds,
  optimisticRepayBondTradeTransaction,
  optimisticInitializeBondOffer,
  optimisticInitializeBondTradeTransaction,
  checkIsHadomarketSponsored,
  optimisticRepayUpdateBondingBondOffer,
} from '../../offer';
import { BondOfferV2, BondTradeTransactionV2, FraktBond } from '../../../../types';

type RefinancePerpetualLoan = (params: {
  programId: web3.PublicKey;
  connection: web3.Connection;

  addComputeUnits?: boolean;

  accounts: {
    fbond: web3.PublicKey;
    userPubkey: web3.PublicKey;
    hadoMarket: web3.PublicKey;
    protocolFeeReceiver: web3.PublicKey;
    previousBondTradeTransaction: web3.PublicKey;
    previousLender: web3.PublicKey;
    oldBondOffer: web3.PublicKey;

  };

  optimistic: {
     oldBondOffer?: BondOfferV2;
      fraktBond: FraktBond;
      bondTradeTransaction: BondTradeTransactionV2;
    };
  sendTxn: (transaction: web3.Transaction, signers: web3.Signer[]) => Promise<void>;
}) => Promise<{
  bondOfferV2: web3.PublicKey;
  instructions: web3.TransactionInstruction[];
  signers: web3.Signer[];
  addressesForLookupTable: web3.PublicKey[];
  optimisticResult: {
    oldBondTradeTransaction: BondTradeTransactionV2;
    fraktBond: FraktBond;
    newBondOffer: BondOfferV2;
    newBondTradeTransaction: BondTradeTransactionV2;
    oldBondOffer?: BondOfferV2;

  };
}>;

export const refinancePerpetualLoan: RefinancePerpetualLoan = async ({
  programId,
  connection,
  accounts,
  addComputeUnits,
  optimistic,
  sendTxn,
}) => {
  const program = returnAnchorProgram(programId, connection);
  const instructions: web3.TransactionInstruction[] = [];

  const bondOfferSeed = Math.ceil(Math.random() * 1000000);
  const [bondOfferV2] = await web3.PublicKey.findProgramAddress(
    [ENCODER.encode(BOND_OFFER_PREFIX), accounts.userPubkey.toBuffer(), ENCODER.encode(bondOfferSeed.toString())],
    program.programId,
  );

  const [bondTradeTransactionV2] = await web3.PublicKey.findProgramAddress(
    [
      ENCODER.encode(AUTOCOMPOUND_DEPOSIT_PREFIX),
      accounts.fbond.toBuffer(),
      bondOfferV2.toBuffer(),
      ENCODER.encode('1'),
      ENCODER.encode('1'),
    ],
    program.programId,
  );

  const [hadoRegistry] = await web3.PublicKey.findProgramAddress(
    [ENCODER.encode(HADOMARKET_REGISTRY_PREFIX), accounts.hadoMarket.toBuffer()],
    program.programId,
  );

  const [sponsorVault, sponsorVaultBump] = await web3.PublicKey.findProgramAddress(
    [ENCODER.encode(PERPETUAL_SPONSOR_VAULT)],
    program.programId,
  );
  
  const [mutualBondTradeTxnVault] = await web3.PublicKey.findProgramAddress(
    [ENCODER.encode(MUTUAL_BOND_TRADE_TXN_VAULT)],
    program.programId,
  );

  const modifyComputeUnits = web3.ComputeBudgetProgram.setComputeUnitLimit({
    units: Math.round(800000 + Math.ceil(Math.random() * 10000)),
  });
  const requestHeap = web3.ComputeBudgetProgram.requestHeapFrame({ bytes: 1024 * 250 });
  instructions.push(requestHeap);

  if (!!addComputeUnits) instructions.push(modifyComputeUnits);

  // console.log(
  //   'accounts: ',
  //   anchorRawBNsAndPubkeysToNumsAndStrings({ publicKey: hadoRegistry, account: accountsIntoInstruction }),
  // );

  const [oldBondOfferVault, oldBondOfferVaultBump] = await web3.PublicKey.findProgramAddress(
    [
      ENCODER.encode(BOND_OFFER_VAULT_PREFIX),
      accounts.oldBondOffer.toBuffer(),
    ],
    program.programId,
  );

  instructions.push(
    await program.methods
      .refinancePerpetualLoan(new BN(bondOfferSeed))
      .accountsStrict({
        oldBondTradeTransactionV2: accounts.previousBondTradeTransaction,
        lender: accounts.previousLender,
        fbond: accounts.fbond,
        bondOfferV2: bondOfferV2,
        bondTradeTransactionV2: bondTradeTransactionV2,
        user: accounts.userPubkey,

        protocolFeeReceiver: accounts.protocolFeeReceiver,

        hadoMarket: accounts.hadoMarket,

        systemProgram: web3.SystemProgram.programId,
        rent: web3.SYSVAR_RENT_PUBKEY,
        sponsorVault: sponsorVault,

        uninitializedOldBondOfferV2: accounts.oldBondOffer,
        mutualBondTradeTxnVault: mutualBondTradeTxnVault,
        oldBondOfferVault: oldBondOfferVault
      })
      .instruction(),
  );
  const transaction = new web3.Transaction();
  for (let instruction of instructions) transaction.add(instruction);

  const addressesForLookupTable = [];
  const signers = [];
  await sendTxn(transaction, signers);

  let inputFee = checkIsHadomarketSponsored(accounts.hadoMarket.toBase58()) ? false : true;

  // const fullLoanBodyWithoutFee = optimistic.bondTradeTransaction.solAmount + optimistic.bondTradeTransaction.feeAmount;

  const fullLoanBody = optimistic.bondTradeTransaction.solAmount + optimistic.bondTradeTransaction.feeAmount;
  //  (fullLoanBodyWithoutFee * BASE_POINTS) / (BASE_POINTS - PROTOCOL_FEE);
  // const refinanceFee = (fullLoanBodyWithoutFee * PROTOCOL_FEE) / BASE_POINTS;

  // fullLoanBodyWithoutFee + refinanceFee;
  const now = nowInSeconds();
  const interestSol = calculateCurrentInterestSolPure({
    loanValue: fullLoanBody,
    startTime: optimistic.bondTradeTransaction.soldAt,

    currentTime: now,
    rateBasePoints: optimistic.bondTradeTransaction.amountOfBonds,
  });

  const repayFeeSol = calculateCurrentInterestSolPure({
    loanValue: fullLoanBody,
    startTime: optimistic.bondTradeTransaction.soldAt,

    currentTime: now,
    rateBasePoints: REPAY_FEE_APR,
  });
  const amountToReturn = fullLoanBody + interestSol + repayFeeSol;

  const initializedOffer = optimisticInitializeBondOffer({
    loanValue: amountToReturn,
    hadoMarket: accounts.hadoMarket.toBase58(),
    assetReceiver: accounts.userPubkey.toBase58(),
    bondOffer: bondOfferV2.toBase58(),
  });

  let aprToSet = optimistic.bondTradeTransaction.amountOfBonds;

  const newBondTradeTransaction = optimisticInitializeBondTradeTransaction({
    loanValue: amountToReturn,
    bondOffer: bondOfferV2.toBase58(),
    bondTradeTransaction: bondTradeTransactionV2.toBase58(),
    assetReceiver: accounts.userPubkey.toBase58(),
    borrower: optimistic.fraktBond.fbondIssuer,
    fraktBond: optimistic.fraktBond.publicKey,
    marketApr: aprToSet,
    inputFee: inputFee,
    isStakedBanx: false,
    isRefinance: true,
    isBorrower: false,
  });
  const updatedOldBondOffer = optimistic.oldBondOffer ? optimisticRepayUpdateBondingBondOffer(optimistic.oldBondOffer, fullLoanBody, interestSol, false) : optimistic.oldBondOffer


  const optimisticResult: {
    oldBondTradeTransaction: BondTradeTransactionV2;
    fraktBond: FraktBond;
    newBondOffer: BondOfferV2;
    newBondTradeTransaction: BondTradeTransactionV2;
    oldBondOffer?: BondOfferV2;
  } = {
    oldBondTradeTransaction: optimisticRepayBondTradeTransaction(optimistic.bondTradeTransaction, true),
    fraktBond: {
      ...optimistic.fraktBond,
      currentPerpetualBorrowed: amountToReturn,
      lastTransactedAt: now,
      refinanceAuctionStartedAt: 0,
    },

    newBondOffer: initializedOffer,
    newBondTradeTransaction,
    oldBondOffer: updatedOldBondOffer,
    
  };

  return { bondOfferV2: bondOfferV2, instructions, signers, addressesForLookupTable, optimisticResult };
};
