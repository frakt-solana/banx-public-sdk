import { now } from 'lodash';
import {
  BASE_POINTS,
  CONSTANT_BID_CAP,
  DRIP_THE_FACELESS_HADOMARKET_PRIVATE,
  ENCODER,
  PROTOCOL_FEE,
  SECONDS_IN_YEAR,
  SOL_WAD,
  SPONSORED_HADOMARKETS_LIST,
  STAKED_BANX_HADOMARKET,
  TERMINATION_PERIOD,
} from '../../../constants';
import {
  BondFeatures,
  BondOfferV2,
  BondTradeTransactionV2,
  BondTradeTransactionV2State,
  BondTradeTransactionV2Type,
  BondingCurveType,
  FraktBond,
  FraktBondState,
  HadoMarket,
  PairState,
  RedeemResult,
} from '../../../types';
import { borrowPerpetualParamsAndAccounts } from '../loan';
import { web3 } from '@project-serum/anchor';
import { optimisticBorrowUpdateBondingBondOffer } from './amm_helpers';

export interface BondOfferOptimistic {
  bondOffer: BondOfferV2;
}

export interface HadoMarketAndOfferOptimistic extends BondOfferOptimistic {
  hadoMarket: HadoMarket;
}

export interface BondAndTransactionOptimistic {
  // bondOffer: BondOfferV2;
  fraktBond: FraktBond;
  bondTradeTransaction: BondTradeTransactionV2;
}

export interface BondAndTransactionAndOfferOptimistic extends BondAndTransactionOptimistic {
  bondOffer: BondOfferV2;
}

export const optimisticInitializeBondTradeTransaction = (args: {
  loanValue: number;
  fraktBond: string;
  assetReceiver: string;
  borrower: string;

  bondOffer: string;
  bondTradeTransaction: string;

  marketApr: number;
  inputFee: boolean;
  isStakedBanx: boolean;
  isRefinance: boolean;
  isBorrower: boolean;

}): BondTradeTransactionV2 => {
  const feeAmount = args.inputFee ? (args.loanValue * PROTOCOL_FEE) / BASE_POINTS : 0;
  const solAmount = args.loanValue - feeAmount;
  return {
    bondTradeTransactionState: args.isStakedBanx
      ? BondTradeTransactionV2State.PerpetualManualTerminating
      : args.isRefinance
      ? BondTradeTransactionV2State.PerpetualRefinancedActive
      : BondTradeTransactionV2State.PerpetualActive,
    bondOffer: args.bondOffer,
    user: args.assetReceiver,
    amountOfBonds: args.marketApr,
    solAmount: solAmount,
    feeAmount: feeAmount,
    bondTradeTransactionType: BondTradeTransactionV2Type.AutoReceiveAndReceiveNft,
    fbondTokenMint: args.fraktBond,
    soldAt: nowInSeconds(),
    redeemedAt: 0,
    redeemResult: RedeemResult.None,
    seller: args.borrower,
    isDirectSell: args.isBorrower,
    publicKey: args.bondTradeTransaction,
  };
};

export const optimisticInitializeBondOffer = (args: {
  loanValue: number;
  hadoMarket: string;
  assetReceiver: string;
  bondOffer: string;
}): BondOfferV2 => ({
  hadoMarket: args.hadoMarket,
  pairState: PairState.PerpetualOnMarket,
  bondingCurve: { delta: 0, bondingType: BondingCurveType.Linear },
  baseSpotPrice: args.loanValue,
  mathCounter: 0,
  currentSpotPrice: args.loanValue,
  concentrationIndex: 0,
  bidCap: CONSTANT_BID_CAP,
  bidSettlement: 0,
  edgeSettlement: 0,
  fundsSolOrTokenBalance: 0,
  buyOrdersQuantity: 1,
  lastTransactedAt: nowInSeconds(),
  assetReceiver: args.assetReceiver,
  validation: {
    loanToValueFilter: 0,
    durationFilter: 604800,
    maxReturnAmountFilter: 0,
    bondFeatures: BondFeatures.AutoReceiveAndReceiveNft,
  },
  publicKey: args.bondOffer,
});

export const optimisticRepayFraktBond = (fraktBond: FraktBond, repaidAmount: number): FraktBond => {
  // const newFundsSolOrTokenBalance = bondOffer.fundsSolOrTokenBalance + amountOfSolToDeposit;
  return {
    ...fraktBond,
    fraktBondState: FraktBondState.PerpetualRepaid,
    currentPerpetualBorrowed: repaidAmount,
    actualReturnedAmount: repaidAmount,
    repaidOrLiquidatedAt: nowInSeconds(),
    lastTransactedAt: nowInSeconds(),
  };
};


export const optimisticClaimBondOfferInterest = (bondOffer: BondOfferV2): BondOfferV2 => {
  // const newFundsSolOrTokenBalance = bondOffer.fundsSolOrTokenBalance + amountOfSolToDeposit;
  return {
    ...bondOffer,
    concentrationIndex: 0,
    lastTransactedAt: nowInSeconds(),
  };
};

export const getRepayAmountOfBondTradeTransaction = (bondTradeTransaction: BondTradeTransactionV2): number => {
  const fullLoanBody = bondTradeTransaction.solAmount + bondTradeTransaction.feeAmount;
  const now = nowInSeconds();
  const interestSol = calculateCurrentInterestSolPure({
    loanValue: fullLoanBody,
    startTime: bondTradeTransaction.soldAt,

    currentTime: now,
    rateBasePoints: bondTradeTransaction.amountOfBonds,
  });
  return fullLoanBody + interestSol;
};
export const optimisticRepayBondTradeTransaction = (
  bondTradeTransaction: BondTradeTransactionV2,
  
  isRefinance: boolean,
): BondTradeTransactionV2 => {
  return {
    ...bondTradeTransaction,
    bondTradeTransactionState: isRefinance
      ? BondTradeTransactionV2State.PerpetualRefinanceRepaid
      : BondTradeTransactionV2State.PerpetualRepaid,
    redeemResult: RedeemResult.AutoReceiveSol,
    redeemedAt: nowInSeconds(),
  };
};

export const optimisticDepositToBondOffer = (bondOffer: BondOfferV2, amountOfSolToDeposit: number): BondOfferV2 => {
  const newFundsSolOrTokenBalance = bondOffer.fundsSolOrTokenBalance + amountOfSolToDeposit;
  return {
    ...bondOffer,
    fundsSolOrTokenBalance: newFundsSolOrTokenBalance,
    edgeSettlement: newFundsSolOrTokenBalance,
    bidSettlement: CONSTANT_BID_CAP * -1 + newFundsSolOrTokenBalance,
    lastTransactedAt: nowInSeconds(),
  };
};

export const optimisticWithdrawFromBondOffer = (bondOffer: BondOfferV2, amountOfSolToWithdraw: number): BondOfferV2 => {
  const newFundsSolOrTokenBalance = bondOffer.fundsSolOrTokenBalance - amountOfSolToWithdraw;
  return {
    ...bondOffer,
    fundsSolOrTokenBalance: newFundsSolOrTokenBalance,
    edgeSettlement: newFundsSolOrTokenBalance,
    bidSettlement: CONSTANT_BID_CAP * -1 + newFundsSolOrTokenBalance,
    lastTransactedAt: nowInSeconds(),
  };
};

export const optimisticUpdateBondOffer = (
  bondOffer: BondOfferV2,
  loanValue: number,
  amountOfLoans: number,
): BondOfferV2 => {
  const newBalance = loanValue * amountOfLoans;

  if (newBalance > bondOffer.fundsSolOrTokenBalance) {
    const amountToDeposit = newBalance - bondOffer.fundsSolOrTokenBalance;
    return optimisticDepositToBondOffer(
      { ...bondOffer, baseSpotPrice: loanValue, currentSpotPrice: loanValue },
      amountToDeposit,
    );
  } else {
    const amountToWithdraw = bondOffer.fundsSolOrTokenBalance - newBalance;

    return optimisticWithdrawFromBondOffer(
      { ...bondOffer, baseSpotPrice: loanValue, currentSpotPrice: loanValue },
      amountToWithdraw,
    );
  }
};

export const nowInSeconds = () => Math.floor(now() / 1000);

export const wadMul = (x: number, y: number) => Math.floor((x * y) / SOL_WAD);

export const wadDiv = (x: number, y: number) => Math.floor((x * SOL_WAD) / y);

export const basePointsToWads = (basePoints: number) => Math.floor((basePoints * SOL_WAD) / BASE_POINTS);

export const calculateCurrentInterestSolPure = ({
  loanValue,
  startTime,
  currentTime,
  rateBasePoints,
}: {
  loanValue: number;
  startTime: number;
  currentTime: number;
  rateBasePoints: number;
}) => {
  const loanTime = currentTime - startTime;
  const secondsInYearWad = SECONDS_IN_YEAR * SOL_WAD;

  const yearsWad = wadDiv(loanTime * SOL_WAD, secondsInYearWad);
  const result = wadMul(loanValue, wadMul(yearsWad, basePointsToWads(rateBasePoints)));
  return result;
};

export const optimisticBorrowPerpetual = (args: {
  fraktBond: FraktBond;
  bondOffer: BondOfferV2;

  bondTradeTransactionV2: string;
  userPubkey: string;

  amountOfSolToGet: number;
  minMarketFee: number;
  inputFee: boolean;
  isRefinance: boolean;
  isBorrower: boolean;

}) => {

  const updatedBondOffer = args.bondOffer.pairState === PairState.PerpetualOnMarket ? optimisticWithdrawFromBondOffer(args.bondOffer, args.amountOfSolToGet) :
   optimisticBorrowUpdateBondingBondOffer(args.bondOffer, args.amountOfSolToGet);
   const protocolFeeAmount = (args.amountOfSolToGet * PROTOCOL_FEE) / BASE_POINTS;

  const newBond: FraktBond = {
    ...args.fraktBond,
    borrowedAmount: args.isBorrower ? args.amountOfSolToGet - protocolFeeAmount : args.fraktBond.borrowedAmount,
    currentPerpetualBorrowed: args.amountOfSolToGet,
    lastTransactedAt: nowInSeconds(),
  };

  const isStakedBanx = false; //args.fraktBond.hadoMarket == STAKED_BANX_HADOMARKET;

  const newBondTradeTransaction = optimisticInitializeBondTradeTransaction({
    loanValue: args.amountOfSolToGet,
    bondOffer: args.bondOffer.publicKey,
    bondTradeTransaction: args.bondTradeTransactionV2,
    assetReceiver: args.bondOffer.assetReceiver,
    borrower: args.userPubkey,
    fraktBond: args.fraktBond.publicKey,
    marketApr: args.minMarketFee,
    inputFee: args.inputFee,
    isStakedBanx: isStakedBanx,
    isRefinance: args.isRefinance,
    isBorrower: args.isBorrower,
  });

  return {
    bondOffer: updatedBondOffer,
    fraktBond: newBond,
    bondTradeTransaction: newBondTradeTransaction,
  };
};

export interface PerpetualLenderActivity {
  lent: number;
  currentRemainingLentAmount: number;

  isNewLoan: boolean;
  interest: number;
  apr: number;
  status: BondTradeTransactionV2State;
  duration: number;
  received: number;
  nftMint: string;
  timestamp: number;

  lender: string;
  borrower: string;
  publicKey: string;
}

export const getPerpetualLenderActivity = (args: {
  fraktBond: FraktBond;
  bondTradeTransaction: BondTradeTransactionV2;
}): PerpetualLenderActivity[] => {
  const loanValue = args.bondTradeTransaction.solAmount + args.bondTradeTransaction.feeAmount;
  const initializeActivity: PerpetualLenderActivity = {
    lent: args.fraktBond.currentPerpetualBorrowed,
    currentRemainingLentAmount: loanValue,

    isNewLoan: args.bondTradeTransaction.isDirectSell,
    interest: 0,
    apr: args.bondTradeTransaction.amountOfBonds,
    status: BondTradeTransactionV2State.PerpetualActive,
    duration: 0,
    received: 0,
    nftMint: args.fraktBond.fbondTokenMint,
    lender: args.bondTradeTransaction.user,
    borrower: args.fraktBond.fbondIssuer,
    timestamp: args.bondTradeTransaction.soldAt,
    publicKey: args.bondTradeTransaction.publicKey,
  };

  const initializeActivityToAdd =
    args.bondTradeTransaction.bondTradeTransactionState == BondTradeTransactionV2State.PerpetualActive
      ? [initializeActivity]
      : [];

  const manualTerminationActivity: PerpetualLenderActivity[] =
    args.bondTradeTransaction.bondTradeTransactionState == BondTradeTransactionV2State.PerpetualManualTerminating ||
    args.bondTradeTransaction.bondTradeTransactionState == BondTradeTransactionV2State.PerpetualLiquidatedByClaim
      ? [
          {
            ...initializeActivity,
            status: BondTradeTransactionV2State.PerpetualManualTerminating,
            duration: args.fraktBond.refinanceAuctionStartedAt - args.bondTradeTransaction.soldAt,
            timestamp: args.fraktBond.refinanceAuctionStartedAt || nowInSeconds(),
          },
        ]
      : [];

  const liquidatingAt =
    args.fraktBond.refinanceAuctionStartedAt && args.fraktBond.refinanceAuctionStartedAt + TERMINATION_PERIOD;
  const liquidationActivity: PerpetualLenderActivity[] =
    (args.bondTradeTransaction.bondTradeTransactionState == BondTradeTransactionV2State.PerpetualManualTerminating &&
      args.fraktBond.refinanceAuctionStartedAt &&
      liquidatingAt < nowInSeconds()) ||
    args.bondTradeTransaction.bondTradeTransactionState == BondTradeTransactionV2State.PerpetualLiquidatedByClaim
      ? [
          {
            ...initializeActivity,
            status: BondTradeTransactionV2State.PerpetualLiquidatedByClaim,
            duration: liquidatingAt - args.bondTradeTransaction.soldAt,
            timestamp: liquidatingAt,
          },
        ]
      : [];

  const interestRepaid =
    args.bondTradeTransaction.redeemedAt &&
    calculateCurrentInterestSolPure({
      loanValue: loanValue,
      startTime: args.bondTradeTransaction.soldAt,
      currentTime: args.bondTradeTransaction.redeemedAt,
      rateBasePoints: args.bondTradeTransaction.amountOfBonds,
    });

  const repayActivity: PerpetualLenderActivity[] =
    args.bondTradeTransaction.bondTradeTransactionState == BondTradeTransactionV2State.PerpetualRepaid
      ? [
          {
            ...initializeActivity,
            status: args.bondTradeTransaction.bondTradeTransactionState,
            timestamp: args.bondTradeTransaction.redeemedAt,
            interest: interestRepaid,
            received: loanValue + interestRepaid,
            duration: args.bondTradeTransaction.redeemedAt - args.fraktBond.activatedAt,
          },
        ]
      : [];

  const refinanceActivity: PerpetualLenderActivity[] =
    args.bondTradeTransaction.bondTradeTransactionState == BondTradeTransactionV2State.PerpetualRefinancedActive
      ? [
          {
            ...initializeActivity,
            status: BondTradeTransactionV2State.PerpetualRefinancedActive,
          },
        ]
      : [];

  const refinanceRepaidActivity: PerpetualLenderActivity[] =
    args.bondTradeTransaction.bondTradeTransactionState == BondTradeTransactionV2State.PerpetualRefinanceRepaid
      ? [
          {
            ...initializeActivity,
            status: BondTradeTransactionV2State.PerpetualRefinanceRepaid,
            timestamp: args.bondTradeTransaction.redeemedAt,
            interest: interestRepaid,
            received: loanValue + interestRepaid,
            duration: args.bondTradeTransaction.redeemedAt - args.fraktBond.activatedAt,
          },
        ]
      : [];

  const partialRepayActivity: PerpetualLenderActivity[] =
    args.bondTradeTransaction.bondTradeTransactionState == BondTradeTransactionV2State.PerpetualPartialRepaid
      ? [
          {
            ...initializeActivity,
            status: BondTradeTransactionV2State.PerpetualPartialRepaid,
            timestamp: args.bondTradeTransaction.redeemedAt,
            interest: interestRepaid,
            received: loanValue + interestRepaid,
            duration: args.bondTradeTransaction.redeemedAt - args.fraktBond.activatedAt,
          },
        ]
      : [];
  return [
    ...initializeActivityToAdd,
    ...manualTerminationActivity,
    ...liquidationActivity,
    ...repayActivity,
    ...refinanceActivity,
    ...refinanceRepaidActivity,
    ...partialRepayActivity,
  ];
};

export interface PerpetualBorrowerActivity {
  borrowed: number;
  currentLentAmount: number;
  currentRemainingLentAmount: number;

  interest: number;
  apr: number;
  status: BondTradeTransactionV2State;
  duration: number;
  repaid: number;
  nftMint: string;
  borrower: string;
  timestamp: number;
  publicKey: string;
  bondTradeTransaction: string;
}

export const getPerpetualBorrowerActivity = (args: {
  fraktBond: FraktBond;
  bondTradeTransaction: BondTradeTransactionV2;
}): PerpetualBorrowerActivity[] => {
  const remainingLentAmount = args.bondTradeTransaction.solAmount + args.bondTradeTransaction.feeAmount;
  // const loanValue = args.fraktBond.borrowedAmount;
  const initializeActivity: PerpetualBorrowerActivity = {
    borrowed: args.fraktBond.borrowedAmount,
    currentLentAmount: args.fraktBond.currentPerpetualBorrowed,
    currentRemainingLentAmount: remainingLentAmount,

    interest: 0,
    apr: args.bondTradeTransaction.amountOfBonds,
    status: BondTradeTransactionV2State.PerpetualActive,
    duration: 0,
    repaid: 0,
    borrower: args.fraktBond.fbondIssuer,
    nftMint: args.fraktBond.fbondTokenMint,
    timestamp: args.fraktBond.activatedAt,
    publicKey: args.fraktBond.publicKey,
    bondTradeTransaction: args.bondTradeTransaction.publicKey,
  };

  const initializeActivityToAdd =
    args.bondTradeTransaction.bondTradeTransactionState == BondTradeTransactionV2State.PerpetualActive
      ? [initializeActivity]
      : [];

  // const manualTerminationActivity: PerpetualBorrowerActivity[] =
  //   args.fraktBond.refinanceAuctionStartedAt > 0
  //     ? [
  //         {
  //           ...initializeActivity,
  //           status: BondTradeTransactionV2State.PerpetualManualTerminating,
  //           duration: args.fraktBond.refinanceAuctionStartedAt - args.fraktBond.activatedAt,

  //           timestamp: args.fraktBond.refinanceAuctionStartedAt,
  //         },
  //       ]
  //     : [];

  const manualTerminationActivity: PerpetualBorrowerActivity[] =
    args.fraktBond.refinanceAuctionStartedAt > 0 &&
    (args.bondTradeTransaction.bondTradeTransactionState == BondTradeTransactionV2State.PerpetualManualTerminating ||
      args.bondTradeTransaction.bondTradeTransactionState == BondTradeTransactionV2State.PerpetualLiquidatedByClaim)
      ? [
          {
            ...initializeActivity,
            status: BondTradeTransactionV2State.PerpetualManualTerminating,
            duration: args.fraktBond.refinanceAuctionStartedAt - args.bondTradeTransaction.soldAt,
            timestamp: args.fraktBond.refinanceAuctionStartedAt || nowInSeconds(),
          },
        ]
      : [];

  const liquidatingAt =
    args.fraktBond.refinanceAuctionStartedAt && args.fraktBond.refinanceAuctionStartedAt + TERMINATION_PERIOD;
  const liquidationActivity: PerpetualBorrowerActivity[] =
    args.fraktBond.refinanceAuctionStartedAt &&
    liquidatingAt < nowInSeconds() &&
    args.fraktBond.fraktBondState !== FraktBondState.PerpetualRepaid
      ? [
          {
            ...initializeActivity,
            status: BondTradeTransactionV2State.PerpetualLiquidatedByClaim,
            duration: liquidatingAt - args.fraktBond.activatedAt,
            timestamp: liquidatingAt,
          },
        ]
      : [];

  // const interestRepaid = args.fraktBond.actualReturnedAmount - args.fraktBond.borrowedAmount;
  const currentLoanValue = args.bondTradeTransaction.solAmount + args.bondTradeTransaction.feeAmount;
  const interestRepaid =
    args.bondTradeTransaction.redeemedAt &&
    calculateCurrentInterestSolPure({
      loanValue: currentLoanValue,
      startTime: args.bondTradeTransaction.soldAt,
      currentTime: args.bondTradeTransaction.redeemedAt,
      rateBasePoints: args.bondTradeTransaction.amountOfBonds,
    });
  const repayActivity: PerpetualBorrowerActivity[] =
    args.fraktBond.fraktBondState == FraktBondState.PerpetualRepaid &&
    args.bondTradeTransaction.bondTradeTransactionState == BondTradeTransactionV2State.PerpetualRepaid
      ? [
          {
            ...initializeActivity,
            status: BondTradeTransactionV2State.PerpetualRepaid,
            timestamp: args.fraktBond.repaidOrLiquidatedAt,
            interest: interestRepaid,
            repaid: currentLoanValue + interestRepaid,
            duration: args.fraktBond.repaidOrLiquidatedAt - args.fraktBond.activatedAt,
          },
        ]
      : [];

  const refinanceActivity: PerpetualBorrowerActivity[] =
    args.bondTradeTransaction.bondTradeTransactionState == BondTradeTransactionV2State.PerpetualRefinancedActive
      ? [
          {
            ...initializeActivity,
            status: BondTradeTransactionV2State.PerpetualRefinancedActive,
          },
        ]
      : [];

  const refinanceRepaidActivity: PerpetualBorrowerActivity[] =
    args.bondTradeTransaction.bondTradeTransactionState == BondTradeTransactionV2State.PerpetualRefinanceRepaid
      ? [
          {
            ...initializeActivity,
            status: BondTradeTransactionV2State.PerpetualRefinanceRepaid,
            timestamp: args.fraktBond.repaidOrLiquidatedAt,
            interest: interestRepaid,
            repaid: currentLoanValue + interestRepaid,
            duration: args.fraktBond.repaidOrLiquidatedAt - args.fraktBond.activatedAt,
          },
        ]
      : [];

  // const interestPartialRepaid = args.fraktBond.actualReturnedAmount - args.fraktBond.borrowedAmount;

  const partialRepayActivity: PerpetualBorrowerActivity[] =
    args.bondTradeTransaction.bondTradeTransactionState == BondTradeTransactionV2State.PerpetualPartialRepaid
      ? [
          {
            ...initializeActivity,
            status: BondTradeTransactionV2State.PerpetualPartialRepaid,
            timestamp: args.bondTradeTransaction.redeemedAt,
            interest: interestRepaid,

            repaid: currentLoanValue + interestRepaid,
            duration: args.bondTradeTransaction.redeemedAt - args.fraktBond.activatedAt,
          },
        ]
      : [];
  return [
    ...initializeActivityToAdd,
    ...manualTerminationActivity,
    ...liquidationActivity,
    ...repayActivity,
    ...refinanceRepaidActivity,
    ...refinanceActivity,
    ...partialRepayActivity,
  ];
};

export const getPerpetualOfferSize = (bondOffer: BondOfferV2) => {
  return Math.min(bondOffer.fundsSolOrTokenBalance, bondOffer.currentSpotPrice);
};

export const checkIsHadomarketSponsored = (hadoMarket: string) => {
  return SPONSORED_HADOMARKETS_LIST.find((market) => market == hadoMarket);
};
