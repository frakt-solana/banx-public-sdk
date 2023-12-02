import { FraktBondState } from './types';
import { web3 } from '@project-serum/anchor';
import { Layout, LayoutObject, blob, ns64, ns64be, struct, u8, u32 } from '@solana/buffer-layout';
import { bool, publicKey, u64 } from '@solana/buffer-layout-utils';
import * as BufferLayout from 'buffer-layout';

export interface BondingCurveRaw {
  delta: BigInt;
  bondingType: number;
}

export const BondingCurveRawLayout = struct<BondingCurveRaw>([u64('delta'), u8('bondingType')]);

export interface BondOfferValidationRaw {
  loanToValueFilter: BigInt;
  durationFilter: BigInt;
  maxReturnAmountFilter: BigInt;
  bondFeatures: number;
}

export const BondOfferValidationLayout = struct<BondOfferValidationRaw>([
  u64('loanToValueFilter'),
  u64('durationFilter'),
  u64('maxReturnAmountFilter'),
  u32('bondFeatures'),
]);

export interface WhitelistEntryRaw {
  fraktMarket: web3.PublicKey;
  whitelistType: number;
  whitelistedAddress: web3.PublicKey;
}

export const WhitelistEntryLayout = struct<WhitelistEntryRaw>([
  publicKey('fraktMarket'),
  u8('whitelistType'),
  publicKey('whitelistedAddress'),
]);

export interface BondOfferV2Raw {
  hadoMarket: web3.PublicKey;
  pairState: number;
  bondingCurve: LayoutObject;
  baseSpotPrice: BigInt;
  mathCounter: BigInt;
  currentSpotPrice: BigInt;
  concentrationIndex: BigInt;
  bidCap: BigInt;
  bidSettlement: BigInt;
  edgeSettlement: BigInt;
  fundsSolOrTokenBalance: BigInt;
  buyOrdersQuantity: BigInt;
  lastTransactedAt: BigInt;
  assetReceiver: web3.PublicKey;

  validation: LayoutObject;
}

export const BondOfferV2Layout = struct<BondOfferV2Raw>([
  publicKey('hadoMarket'),
  u8('pairState'),
  BondingCurveRawLayout.replicate('bondingCurve'),
  u64('baseSpotPrice'),
  ns64('mathCounter'),
  u64('currentSpotPrice'),
  u64('concentrationIndex'),
  u64('bidCap'),
  ns64('bidSettlement'),
  u64('edgeSettlement'),
  u64('fundsSolOrTokenBalance'),
  u64('buyOrdersQuantity'),
  u64('lastTransactedAt'),
  publicKey('assetReceiver'),
  BondOfferValidationLayout.replicate('validation'),
]);

interface FraktBondRaw {
  fraktBondState: number;
  bondTradeTransactionsCounter: number;
  borrowedAmount: BigInt;
  banxStake: web3.PublicKey;
  fraktMarket: web3.PublicKey;
  amountToReturn: BigInt;
  actualReturnedAmount: BigInt;
  terminatedCounter: number;
  fbondTokenMint: web3.PublicKey;
  fbondTokenSupply: BigInt;
  activatedAt: BigInt;
  liquidatingAt: BigInt;
  fbondIssuer: web3.PublicKey;
  repaidOrLiquidatedAt: BigInt;
  currentPerpetualBorrowed: BigInt;
  lastTransactedAt: BigInt;
  refinanceAuctionStartedAt: BigInt;
}

export const FraktBondLayout = struct<FraktBondRaw>([
  u8('fraktBondState'),
  u8('bondTradeTransactionsCounter'),
  u64('borrowedAmount'),
  publicKey('banxStake'),
  publicKey('fraktMarket'),
  u64('amountToReturn'),
  u64('actualReturnedAmount'),
  u8('terminatedCounter'),
  publicKey('fbondTokenMint'),
  u64('fbondTokenSupply'),
  u64('activatedAt'),
  u64('liquidatingAt'),
  publicKey('fbondIssuer'),
  u64('repaidOrLiquidatedAt'),
  u64('currentPerpetualBorrowed'),
  u64('lastTransactedAt'),
  u64('refinanceAuctionStartedAt'),
]);

interface BondTradeTransactionV2Raw {
  bondTradeTransactionState: number;
  bondOffer: web3.PublicKey;
  user: web3.PublicKey;
  amountOfBonds: BigInt;
  solAmount: BigInt;
  feeAmount: BigInt;
  bondTradeTransactionType: number;
  fbondTokenMint: web3.PublicKey;
  soldAt: BigInt;
  redeemedAt: BigInt;
  redeemResult: number;
  seller: web3.PublicKey;
  isDirectSell: boolean;
}

export const BondTradeTransactionV2Layout = struct<BondTradeTransactionV2Raw>([
  u8('bondTradeTransactionState'),
  publicKey('bondOffer'),
  publicKey('user'),
  u64('amountOfBonds'),
  u64('solAmount'),
  u64('feeAmount'),
  u8('bondTradeTransactionType'),
  publicKey('fbondTokenMint'),
  u64('soldAt'),
  u64('redeemedAt'),
  u8('redeemResult'),
  publicKey('seller'),
  bool('isDirectSell'),
]);

export interface RoundRaw {
  roundState: number;
  roundValue: BigInt;
  startedAt: BigInt;
  solAmount: BigInt;
  feeAmount: BigInt;
  participants: BigInt;
  roundEndsAt: BigInt;
  lastTransactedAt: BigInt;
  winner: web3.PublicKey;
  roundNumber: BigInt;
  contractBid: BigInt,
  placeholdeOne: BigInt,
  placeholdeTwo: BigInt,
  placeholdeThree: BigInt,
  publicKey: web3.PublicKey;
}

export const RoundRawLayout = struct<RoundRaw>([
  u8("roundState"),
  u64("roundValue"),
  u64("startedAt"),
  u64("solAmount"),
  u64("feeAmount"),
  u64("participants"),
  u64("roundEndsAt"),
  u64("lastTransactedAt"),
  publicKey("winner"),
  u64("roundNumber"),
  u64("solInNftAmount"),
  u64("contractBid"),
  u64("placeholdeOne"),
  u64("placeholdeTwo"),
  u64("placeholdeThree"),
]);

export interface UserRoundRaw {
  round: web3.PublicKey;
  startSolPosition: BigInt;
  solDeposited: BigInt;
  user: web3.PublicKey;
  lastTransactedAt: BigInt;
  depositedAt: BigInt;
  nftMint: web3.PublicKey;
  jackpotSolAmount:  BigInt,
  jackpotClaimedAt: BigInt,
  jackpotClaimed: boolean,
  placeholderOne: BigInt,
  placeholderTwo: number,
  placeholderThree: boolean,
  placeholderFour: boolean,
  placeholderFive: boolean,
}

export const UserRoundRawLayout = struct<UserRoundRaw>([
  publicKey("round"),
  u64("solDeposited"),
  u64("startSolPosition"),
  publicKey("user"),
  u64("lastTransactedAt"),
  u64("depositedAt"),
  publicKey("nftMint"),
  u64("jackpotSolAmount"),
  u64("jackpotClaimedAt"),
  bool("jackpotClaimed"),
  u64("placeholdeOne"),
  u32("placeholdeTwo"),
  bool("placeholdeThree"),
  bool("placeholdeFour"),
  bool("placeholdeFive"),
]);

export interface RoundSettingsRaw {
  completedRounds: BigInt;
  totalSolDeposited: BigInt;
  totalFeeCollected: BigInt;
  totalParticipants: BigInt;
  roundDuration: BigInt;
  minSolToDeposit: BigInt;
  feePercent: BigInt;
  canInitializeNextRound: boolean;
  lastRoundEndsAt: BigInt;
  lastTransactedAt: BigInt;
  rakebackHadesForSol: BigInt,
  contractBid: BigInt,
  placeholdeOne: BigInt,
  placeholdeTwo: BigInt,
}

export const RoundSettingsRawLayout = struct<RoundSettingsRaw>([
  u64("completedRounds"),
  u64("totalSolDeposited"),
  u64("totalFeeCollected"),
  u64("totalParticipants"),
  u64("roundDuration"),
  u64("minSolToDeposit"),
  u64("feePercent"),
  bool("canInitializeNextRound"),
  u64("lastRoundEndsAt"),
  u64("lastTransactedAt"),
  u64("rakebackHadesForSol"),
  u64("contractBid"),
  u64("placeholdeOne"),
  u64("placeholdeTwo"),
]);

export interface HadespinLeaderboardEntryRaw {
  user: web3.PublicKey;
  totalSolDeposited: BigInt;
  totalSolInNftDeposited: BigInt;
  totalNftDeposited: BigInt;
  totalFeePayed: BigInt;
  totalSolWon: BigInt;
  lastTransactedAt: BigInt;
  placeholderOne: web3.PublicKey;
  placeholderTwo: web3.PublicKey;
}

export const HadespinLeaderboardEntryLayout = struct<HadespinLeaderboardEntryRaw>([
  publicKey("user"),
  u64("totalSolDeposited"),
  u64("totalSolInNftDeposited"),
  u64("totalNftDeposited"),
  u64("totalFeePayed"),
  u64("totalSolWon"),
  u64("lastTransactedAt"),
  publicKey("placeholderOne"),
  publicKey("placeholderTwo"),
]);

export interface HadespinRakebackRaw {
  user: web3.PublicKey;
  hadesToClaimAmount: BigInt;
  claimTimestamp: BigInt;
  claimedAt: BigInt;
  claimed: boolean;
  lastTransactedAt: BigInt;
  placeholderOne: web3.PublicKey;
}

export const HadespinRakebackLayout = struct<HadespinRakebackRaw>([
  publicKey("user"),
  u64("hadesToClaimAmount"),
  u64("claimTimestamp"),
  u64("claimedAt"),
  bool("claimed"),
  u64("lastTransactedAt"),
  publicKey("placeholderOne"),
]);
