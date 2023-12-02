import { web3 } from '@project-serum/anchor';

export const BOND_PROOGRAM_AUTHORITY_PREFIX = 'bond_program_authority';
export const RETURN_FUNDS_OWNER_PREFIX = 'return_funds_owner';
export const COLLATERAL_BOX_PREFIX = 'collateral_box';
export const ADAPTER_PREFIX = 'adapter';
export const HADOMARKET_REGISTRY_PREFIX = 'hadomarketregistry';
export const VALIDATION_PREFIX = 'validation';
export const WHITELIST_ENTRY_PREFIX = 'whitelist_entry';
export const AUTOCOMPOUND_DEPOSIT_PREFIX = 'autocompound_deposit';
export const BANX_USER_PREFIX = 'banx_user';
export const ADVENTURE_PREFIX = 'adventure';
export const ADVENTURE_SUBSCRIPTION_PREFIX = 'adventure_subscription';
export const STAKING_SETTINGS_PREFIX = 'staking_settings';
export const BANX_POINTS_MAP_PREFIX = 'banx_points_map';
export const STAKING_REWARDS_VAULT_PREFIX = 'staking_rewards_vault';

export const METADATA_PROGRAM_PUBKEY = new web3.PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
export const AUTHORIZATION_RULES_PROGRAM = new web3.PublicKey('auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboVmgg');
export const BUBBLEGUM_PROGRAM_ID = new web3.PublicKey('BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY');
export const SPL_ACCOUNT_COMPRESSION_PROGRAM_ID = new web3.PublicKey('cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK');
export const SPL_NOOP_PROGRAM_ID = new web3.PublicKey('noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV');

export const METADATA_PREFIX = 'metadata';

export const EDITION_PREFIX = 'edition';

export const FEE_PREFIX = 'fee_vault';

export const TOKEN_RECORD = 'token_record';

export const SOL_FUNDS_PREFIX = 'sol_funds_vault';
export const BOND_OFFER_PREFIX = 'bond_offer_prefix';
export const BOND_TRADE_TRANSACTOIN_PREFIX = 'bond_trade_transaction_prefix';

export const MUTUAL_BOND_TRADE_TXN_VAULT = 'mutual_bond_trade_txn_vault';
export const PERPETUAL_SPONSOR_VAULT = 'perpetual_sponsor_vault';

export const NFTS_OWNER_PREFIX = 'nfts_owner';

export const LIQUIDITY_PROVISION_ORDER_PREFIX = 'liquidity_provision_order';
export const NFT_PAIR_BOX_PREFIX = 'nft_pair_box';
export const FRAKT_BOND_PREFIX = 'frakt_bond';
export const BOND_OFFER_VAULT_PREFIX = 'bond_offer_vault';

export const EMPTY_PUBKEY = new web3.PublicKey('11111111111111111111111111111111');

export const ENCODER = new TextEncoder();

export const BASE_POINTS = 10000;
export const TXNS_IN_ONE_SIGN_FOR_LEDGER = 5;

export const BOND_DECIMAL_DELTA = 1e4;
export const PRECISION_CORRECTION_LAMPORTS = 10000; //? 200%
export const BONDS_PROGRAM_PUBKEY = '4tdmkuY6EStxbS6Y8s5ueznL3VPMSugrvQuDeAHGZhSt';
export const BONDS_ADMIN_PUBKEY = '9J4yDqU6wBkdhP5bmJhukhsEzBkaAXiBmii52kTdxpQq';
export const PUBKEY_PLACEHOLDER = '11111111111111111111111111111111';
export const MAX_ACCOUNTS_IN_FAST_TRACK = 35;
export const LOOKUP_TABLE = '8Hd6eCqRPfguSkRQn1qhNeKUXCLPkhAJimFkLiWERTEm';

export const ADVENTURE_START = 1687770000;
export const ADVENTURE_DURATION = 604800; // 1 week
export const ADVENTURE_EXTENTION = 86400; // 1 day

export const TERMINATION_PERIOD = 86400 * 3;
export const CONSTANT_BID_CAP = 100000000000000;
export const PROTOCOL_FEE = 100;
export const REPAY_FEE_APR = 620;

export const SOL_WAD = 1e9;
export const SECONDS_IN_YEAR = 31536000;

export const PERPETUAL_REFINANCE_INTEREST_REFRESH_RATE: number = 4320; // 20 times in 24 hours
export const PERPETUAL_REFINANCE_INTEREST_TIC: number = 500; // 5 % apr
export const MAX_PERPETUAL_APR: number = 25300; // 253 % apr

export const STAKED_BANX_HADOMARKET = '21UkgAGZ4WiQcG4GVAu83oUadFeAQSaffveVA8PYMqnC';
export const DRIP_THE_FACELESS_HADOMARKET_PUBLIC = 'BzxKw3JLmPt7aagkHnRQEMQ4Le1rZdwEib5Viuig42hu';
export const DRIP_THE_FACELESS_HADOMARKET_PRIVATE = 'EGy2MXEN3NyH48azCbWQ9xTMN65cv4VJ2DKB3EZkUGU';
export const SPONSORED_HADOMARKETS_LIST: string[] = [DRIP_THE_FACELESS_HADOMARKET_PRIVATE];
export const BANX_63_POINTS_HADOMARKET_PUBLIC = 'BsAaSBUc7xY42R65XB6P9Qg4WYAvekNYb5AWxsm43cnu';
export const BANX_63_POINTS_HADOMARKET_PRIVATE = 'LxJoKjNVUsV4vbk5wi61KYHEzVQkGNzPWKWWRFDP5CF';

export const ROUND_PREFIX = 'round';
export const USER_ROUND_PREFIX = 'user_round';
export const ROUND_TXN_VAULT_PREFIX = 'round_txn_vault';
export const ROUND_SETTING_PREFIX = 'round_setting';
export const HADESPIN_JACKPOT_VAULT_PREFIX = 'hadespin_jackpot_vault';
export const HADESPIN_RAKEBACK_PREFIX = 'hadespin_rakeback';
export const HADESPIN_RAKEBACK_VAULT_PREFIX = 'hadespin_rakeback_vault';
export const HADESPIN_LEADERBOARD_ENTRY_PREFIX = 'hadespin_leaderboard_entry';
export const API_ENDPOINT = 'https://quote-api.jup.ag/v6';
export const TENSOR_API_KEY = 'a7df5707-93a6-4f75-bc12-d0ab69aab9ea';
export const HADESPIN_RAKEBACK_TIMESTAMP = 86400 * 30 * 6;
export const HADESPIN_ADDITIONAL_PARTICIPANTS_VAULT_PREFIX = 'hadespin_additional_vault';

export const HADESPIN_ADDITIONAL_PARTICIPANT_FIRST = new web3.PublicKey('9J4yDqU6wBkdhP5bmJhukhsEzBkaAXiBmii52kTdxpQq');
export const HADESPIN_ADDITIONAL_PARTICIPANT_SECOND = new web3.PublicKey(
  'Fx5mso6fV3GH1irHHncdbw6ndJqiZcrWsyrR2ZCNpkck',
);
export const HADESPIN_ADDITIONAL_PARTICIPANT_THIRD = new web3.PublicKey('FTEnjqsWCCFHVLyt2Tq2cPRjxHXRjbUQoLnkKBuymNBm');

export const HADESPIN_ADDITIONAL_PARTICIPANTS_LIST: web3.PublicKey[] = [
  HADESPIN_ADDITIONAL_PARTICIPANT_FIRST,
  HADESPIN_ADDITIONAL_PARTICIPANT_SECOND,
  HADESPIN_ADDITIONAL_PARTICIPANT_THIRD,
];
