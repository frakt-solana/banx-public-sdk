import { BN, web3 } from '@project-serum/anchor';
import { boolean } from 'yargs';

export interface FraktBond {
  fraktBondState: FraktBondState;
  bondTradeTransactionsCounter: number;
  borrowedAmount: number;
  banxStake: string;
  fraktMarket: string;
  hadoMarket?: string;

  amountToReturn: number;
  actualReturnedAmount: number;
  terminatedCounter: number;
  fbondTokenMint: string;
  fbondTokenSupply: number;
  activatedAt: number;
  liquidatingAt: number;
  fbondIssuer: string;

  repaidOrLiquidatedAt: number;

  currentPerpetualBorrowed: number;

  lastTransactedAt: number;

  refinanceAuctionStartedAt: number;

  publicKey: string;
}

export interface BondCartOrder {
  orderSize: number; //? lamports
  spotPrice: number; //? lamports
  pairPubkey: string;
  assetReceiver: string;
  durationFilter: number;
  bondFeature: BondFeatures;
}

export interface InstructionsAndSigners {
  instructions: web3.TransactionInstruction[];
  signers?: web3.Signer[];
  lookupTablePublicKeys: {
    tablePubkey: web3.PublicKey;
    addresses: web3.PublicKey[];
  }[];
}

export interface TxnsAndSigners {
  transaction: web3.Transaction;
  signers?: web3.Signer[];
}

export interface SignAndSendAllTransactionsProps {
  transactionsAndSigners: TxnsAndSigners[];
  connection: web3.Connection;
  wallet: any;
  commitment?: web3.Commitment;
  onBeforeApprove?: () => void;
  onAfterSend?: () => void;
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

export enum FraktBondState {
  Initialized = 'initialized',
  Active = 'active',
  Repaid = 'repaid',
  Liquidating = 'liquidating',
  Liquidated = 'liquidated',

  PerpetualActive = 'perpetualActive',
  PerpetualRepaid = 'perpetualRepaid',
  PerpetualLiquidatedByAuction = 'perpetualLiquidatedByAuction',
  PerpetualLiquidatedByClaim = 'perpetualLiquidatedByClaim',
}
export enum BondTradeTransactionV2State {
  NotActive = 'notActive',

  Active = 'active',

  PerpetualActive = 'perpetualActive',
  PerpetualRepaid = 'perpetualRepaid',
  PerpetualLiquidatedByAuction = 'perpetualLiquidatedByAuction',
  PerpetualLiquidatedByClaim = 'perpetualLiquidatedByClaim',
  PerpetualManualTerminating = 'perpetualManualTerminating',

  PerpetualPartialRepaid = 'perpetualPartialRepaid',
  PerpetualRefinanceRepaid = 'perpetualRefinanceRepaid',
  PerpetualRefinancedActive = 'perpetualRefinancedActive',
}

export interface CollateralBox {
  fbond: string;
  collateralBoxType: CollateralBoxType;
  collateralTokenMint: string;
  collateralTokenAccount: string;
  collateralAmount: number;

  publicKey: string;
}

export enum CollateralBoxType {
  Escrow = 'escrow',
  Escrowless = 'escrowless',
}

export interface Validation {
  pair: string;
  user: string;
  loanToValueFilter: number;
  durationFilter: number;
  maxReturnAmountFilter: number;
  bondFeatures: BondFeatures;
}

export enum BondFeatures {
  None = 'none',
  Autocompound = 'autocompound',
  ReceiveNftOnLiquidation = 'receiveNftOnLiquidation',
  AutoreceiveSol = 'autoreceiveSol',
  AutoCompoundAndReceiveNft = 'autoCompoundAndReceiveNft',
  AutoReceiveAndReceiveNft = 'autoReceiveAndReceiveNft',
}

export interface HadoMarketRegistry {
  hadoMarket: string;
  fraktMarket: string;
}

export enum BondingCurveType {
  Linear = 'linear',
  Exponential = 'exponential',
}

export enum PairType {
  TokenForNFT = 'tokenForNft',
  NftForToken = 'nftForToken',
  LiquidityProvision = 'liquidityProvision',
}

export enum NftValidationWhitelistType {
  Creator = 'creator',
  Nft = 'nft',
  MerkleTree = 'merkleTree',
  CollectionId = 'collectionId',
}

export enum OrderType {
  Buy = 'buy',
  Sell = 'sell',
}

export interface HadoMarket {
  marketAuthority: string;
  marketState: MarketState;
  marketTrustType: MarketTrustType;
  pairValidationType: PairValidationType;
  fraktMarket: string;
  minBidCap: number;
  minMarketFee: number;
  whitelistType: NftValidationWhitelistType;
  whitelistedAddress: string;
  publicKey: string;
}

export enum MarketState {
  Initializing = 'initializing',
  Available = 'available',

  InitializingPerpetual = 'initializingPerpetual',
  AvailablePerpetual = 'availablePerpetual',
  PrivateAvailablePerpetual = 'privateAvailablePerpetual',
}

export enum MarketTrustType {
  Unverified = 'unverified',
  Verified = 'verified',
}

export enum PairValidationType {
  ClassicValidation = 'classicValidation',
  CustomValidation = 'customValidation',
}

export enum PairTokenType {
  NativeSol = 'nativeSol',
  Spl = 'spl',
}

export enum WhitelistType {
  Nft = 'nft',
  Creator = 'creator',
}

export interface BondOfferV2 {
  hadoMarket: string;
  pairState: PairState;
  bondingCurve: BondingCurve;
  baseSpotPrice: number;
  mathCounter: number;
  currentSpotPrice: number;
  concentrationIndex: number;
  bidCap: number;
  bidSettlement: number;
  edgeSettlement: number;
  fundsSolOrTokenBalance: number;
  buyOrdersQuantity: number;
  lastTransactedAt: number;
  assetReceiver: string;
  validation: {
    loanToValueFilter: number;
    durationFilter: number;
    maxReturnAmountFilter: number;
    bondFeatures: BondFeatures;
  };
  publicKey: string;
}

export interface BondTradeTransactionV2 {
  bondTradeTransactionState: BondTradeTransactionV2State;
  bondOffer: string;
  user: string;
  amountOfBonds: number;
  solAmount: number;
  feeAmount: number;
  bondTradeTransactionType: BondTradeTransactionV2Type;
  fbondTokenMint: string;
  soldAt: number;
  redeemedAt: number;
  redeemResult: RedeemResult;
  seller: string;
  isDirectSell: boolean;
  publicKey: string;
}

export enum RedeemResult {
  None = 'none',
  AutoReceiveSol = 'autoReceiveSol',
  Autocompound = 'autocompound',
  Nft = 'nft',
  ExitSol = 'exitSol',
}

export interface NftSwapPair {
  hadoMarket: string;
  pairType: PairType;
  pairState: PairState;
  pairAuthorityType: PairAuthorityType;
  pairAuthorityAdapterProgram: string;
  lpTokensMint: string;
  lpTokensInCirculation: number;
  bondingCurve: BondingCurve;
  baseSpotPrice: number;
  fee: number;
  mathCounter: number;
  currentSpotPrice: number;
  bidCap: number;
  bidSettlement: number;
  edgeSettlement: number;
  feeTokenAccount: string;
  feeVaultSeed: number;
  solOrTokenFeeAmount: number;
  fundsTokenAccount: string;
  fundsSolVaultSeed: number;
  fundsSolOrTokenBalance: number;
  initialFundsSolOrTokenBalance: number;
  buyOrdersQuantity: number;
  nftsSeed: number;
  sellOrdersCount: number;
  lastTransactedAt: number;
  concentrationIndex: number;

  assetReceiver: string;
  publicKey: string;
}

export enum PairState {
  Initializing = 'initializing',
  OnMarketVirtual = 'onMarketVirtual',
  OnMarketTokenized = 'onMarketTokenized',
  Frozen = 'frozen',
  Closed = 'closed',
  PerpetualMigrated = 'PerpetualMigrated',
  PerpetualOnMarket = 'perpetualOnMarket',
  PerpetualClosed = 'perpetualClosed',
  PerpetualBondingCurveOnMarket = "perpetualBondingCurveOnMarket",
  PerpetualBondingCurveClosed = "perpetualBondingCurveClosed",
}

export enum PairAuthorityType {
  ClassicAuthority = 'classicAuthority',
  CustomAuthority = 'customAuthority',
}

export interface BondingCurve {
  delta: number;
  bondingType: BondingCurveType;
}

// #[repr(C)]
// #[derive(Clone, Copy, AnchorDeserialize, AnchorSerialize)]
// pub struct BondingCurve {
//     pub delta: u64,
//     pub bonding_type: BondingCurveType,
// }

export interface AuthorityAdapter {
  pair: string;
  authorityAdapterProgram: string;
  authorityOwner: string;
  authorityType: AuthorityType;
  expiringAt: number;
  authorityState: AuthorityState;

  publicKey: string;
}

export enum AuthorityType {
  Persistent = 'persistent',
  OneTime = 'oneTime',
}

export enum AuthorityState {
  Active = 'active',
  Used = 'used',
  Expired = 'expired',
  Revoked = 'revoked',
}

export enum ScopeType {
  Market = 'market',
  Pair = 'pair',
}

export interface NftValidationAdapter {
  hadoMarket: string;
  scopeType: ScopeType;
  pair: string;
  nftValidationProgram: string;
  nftValidationWhitelistType: WhitelistType;
  whitelistedAddress: string;
  nftValidationDurationType: NftValidationDurationType;
  validUntil: number;
  root: Buffer;
  publicKey: string;
}

export enum NftValidationDurationType {
  Finite = 'finite',
  Infinite = 'infinite',
}

export interface NftPairBox {
  pair: string;
  nftMint: string;
  nftMetadata: string;
  nftBoxType: NftBoxType;
  vault_token_account: string;
  active_tokens_amount: number;
  status: NftBoxState;
}

export enum NftBoxType {
  Escrow = 'escrow',
  Escrowless = 'escrowless',
}

export enum NftBoxState {
  NotActive = 'notActive',
  Active = 'active',
}

export interface AutocompoundDeposit {
  fraktBondState: AutocompoundDepositState;
  pair: string;
  user: string;
  amountOfBonds: number;
  depositedAt: number;
  autocompoundType: AutocompoundType;
  fbondTokenMint: string;
  collateralTokenMint: string;
  solAmount: number;
  redeemedAt: number;
  publicKey: string;
}

export enum AutocompoundDepositState {
  NotActive = 'notActive',
  Active = 'active',
  Removed = 'removed',
}

export enum BondTradeTransactionV2Type {
  None = 'none',
  Autocompound = 'autocompound',
  ReceiveNftOnLiquidation = 'receiveNftOnLiquidation',
  AutoreceiveSol = 'autoreceiveSol',
  AutoCompoundAndReceiveNft = 'autoCompoundAndReceiveNft',
  AutoReceiveAndReceiveNft = 'autoReceiveAndReceiveNft',
}

export enum AutocompoundType {
  Autocompound = 'autocompound',
  AutoreceiveSol = 'autoreceiveSol',
  AutocompoundAndReceiveNft = 'autocompoundAndReceiveNft',
}

export enum BondEventType {
  Creation = 'creation',
  Repay = 'repay',
  Liquidating = 'liquidating',
  Liquidated = 'liquidated',
  Redeem = 'redeem',
  Refinance = 'refinance',
}

export interface BanxStake {
  banxStakeState: BanxStakeState;
  adventureSubscriptionsQuantity: number;

  nftMint: string;

  collateralTokenAccount: string;

  user: string;

  stakedAt: number;

  unstakedOrLiquidatedAt: number;

  isLoaned: boolean;
  bond: string;

  playerPoints: number;

  partnerPoints: number;

  farmedAmount: number;

  placeholderOne: string;
  publicKey: string;
}

export enum BanxStakeState {
  Staked = 'staked',
  Unstaked = 'unstaked',
  Liquidated = 'liquidated',
}

export interface BanxUser {
  user: string;
  stakedPlayerPoints: number;
  stakedPartnerPoints: number;

  stakedBanx: number;

  totalHarvestedRewards: number;

  freeLiquidityCurrent: number;

  placeholderOne: string;

  publicKey: string;
}

export interface Adventure {
  adventureState: AdventureState;
  periodStartedAt: number;

  periodEndingAt: number;

  rewardsUpperLimit: number;

  rewardsLowerLimit: number;

  totalPeriodRevenue: number;

  rewardsToBeDistributed: number;

  totalBanxSubscribed: number;

  totalPartnerPoints: number;

  totalPlayerPoints: number;

  banxSubscribedLeft: number;

  partnerPointsLeft: number;

  playerPointsLeft: number;

  rewardsLeft: number;

  publicKey: string;
}

export enum AdventureState {
  Uninitialized = 'uninitialized',
  Initialized = 'initialized',
  DistributingInitialized = 'distributingInitialized',
}

export interface AdventureSubscription {
  user: string;

  stake: string;

  adventure: string;

  subscribedAt: number;

  unsubscribedAt: number;

  harvestedAt: number;

  amountOfSolHarvested: number;

  placeholderOne: string;

  publicKey: string;
}

export interface StakingSettings {
  mainVaultBalance: number;
  reserveVaultBalance: number;

  upperRewardsLimit: number;

  lowerRewardsLimit: number;

  placeholderOne: string;

  publicKey: string;
}

export interface BanxPointsMap {
  banxMint: string;
  playerPoints: number;
  partnerPoints: number;

  publicKey: string;
}

export enum RoundState {
  Uninitialized = "uninitialized",
  Initialized = "initialized",
  Open = "open",
  Drawn = "drawn",
}

export interface Round {
  roundState: RoundState;
  roundValue: string;
  startedAt: number;
  solAmount: number;
  feeAmount: number;
  participants: number;
  roundEndsAt: number;
  lastTransactedAt: number;
  winner: string;
  roundNumber: number;
  solInNftAmount: number;
  contractBid: number;

  placeholderOne: number;
  placeholderTwo: number;
  placeholderThree: number;
  publicKey: string;
}

export interface RoundSettings {
  completedRounds: number;
  totalSolDeposited: number;
  totalFeeCollected: number;
  totalParticipants: number;
  roundDuration: number;
  minSolToDeposit: number;
  feePercent: number;
  canInitializeNextRound: boolean;
  lastRoundEndsAt: number;
  lastTransactedAt: number;
  rakebackHadesForSol: number,
  contractBid: number,
  placeholdeOne: number,
  placeholdeTwo: number,
  publicKey: string;
}

export interface UserRound {
  round: string;
  solDeposited: number;
  startSolPosition: number;
  user: string;
  lastTransactedAt: number;
  depositedAt: number;
  nftMint: string;
  jackpotSolAmount:  number,
  jackpotClaimedAt: number,
  jackpotClaimed: boolean,
  placeholderOne: number,
  placeholderTwo: number,
  placeholderThree: boolean,
  placeholderFour: boolean,
  placeholderFive: boolean,
  publicKey: string;
}

export interface HadespinLeaderboardEntry {
  user: string;
  totalSolDeposited: number;
  totalSolInNftDeposited: number;
  totalNftDeposited: number;
  totalFeePayed: number;
  totalSolWon: number;
  lastTransactedAt: number;
  placeholderOne: string;
  placeholderTwo: string;
  publicKey: string;
}

export interface HadespinRakeback {
  user: string;
  hadesToClaimAmount: number;
  claimTimestamp: number;
  claimedAt: number;
  claimed: boolean;
  lastTransactedAt: number;
  placeholderOne: string;
  publicKey: string;
}