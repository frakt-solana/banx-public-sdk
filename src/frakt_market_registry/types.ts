export enum NftValidationWhitelistType {
  Creator = 'creator',
  Nft = 'nft',
  MerkleTree = 'merkleTree',
  CollectionId = 'collectionId',
}

export interface FraktMarket {
  authority: string;
  whitelistQuantity: number;
  state: FraktMarketState;
  publicKey: string;
}

export enum FraktMarketState {
  Initialized = 'initialized',
  Active = 'active',
}

export interface WhitelistEntry {
  fraktMarket: string;
  whitelistType: NftValidationWhitelistType;
  whitelistedAddress: string;
  publicKey: string;
}

export interface OracleFloor {
  fraktMarket: string;
  oracleAuthority: string;
  oracleInfo: string;
  floor: number;
  lastUpdatedAt: number;
  publicKey: string;
}
