import { web3 } from '@project-serum/anchor';
import { anchorRawBNsAndPubkeysToNumsAndStrings } from '../../helpers';
import { returnAnchorProgram } from '../../helpers';
import {
  CollateralBox,
  FraktBond,
  HadoMarketRegistry,
  HadoMarket,
  BondTradeTransactionV2,
  BondOfferV2,
  BanxStake,
  BanxUser,
  Adventure,
  AdventureSubscription,
  StakingSettings,
} from '../../types';
import { getFilteredAccounts } from './getAllPerpetualProgramAccounts';

export const getAllFraktAccounts = async (
  programId: web3.PublicKey,
  connection: web3.Connection,
): Promise<{
  bondTradeTransactionsV2: BondTradeTransactionV2[];
  bondOffersV2: BondOfferV2[];
  fraktBonds: FraktBond[];
  collateralBoxes: CollateralBox[];
  hadoMarketRegistry: HadoMarketRegistry[];
  hadoMarkets: HadoMarket[];
}> => {
  const program = await returnAnchorProgram(programId, connection);

  const fraktBondsOffset = 8;
  const fraktBondsRaw = await getFilteredAccounts(program, 'fraktBond', fraktBondsOffset, [0, 1, 2, 3, 4]);
  const fraktBonds = fraktBondsRaw.map((fraktBondRaw) => anchorRawBNsAndPubkeysToNumsAndStrings(fraktBondRaw));

  const collateralBoxOffset = 32 + 1 + 32 + 32 + 8;
  const collateralBoxesRaw = await getFilteredAccounts(program, 'collateralBox', collateralBoxOffset, [1]);

  const collateralBoxes = collateralBoxesRaw.map((collateralBoxRaw) =>
    anchorRawBNsAndPubkeysToNumsAndStrings(collateralBoxRaw),
  );

  const hadoMarketRegistry = (await program.account.hadoMarketRegistry.all()).map((raw) =>
    anchorRawBNsAndPubkeysToNumsAndStrings(raw),
  );

  const hadoMarketOffset = 32 + 8;

  const hadoMarketsRaw = await getFilteredAccounts(program, 'hadoMarket', hadoMarketOffset, [0, 1]);
  const hadoMarkets = hadoMarketsRaw.map((hadoMarketRaw) => anchorRawBNsAndPubkeysToNumsAndStrings(hadoMarketRaw));

  const bondOfferOffset = 32 + 8;

  const bondOffersV2Raw = await getFilteredAccounts(program, 'bondOfferV2', bondOfferOffset, [1]);
  const bondOffersV2 = bondOffersV2Raw.map((acc) => anchorRawBNsAndPubkeysToNumsAndStrings(acc));

  const bondTradeTxnOffset = 8;

  const bondTradeTxnRaw = await getFilteredAccounts(program, 'bondTradeTransactionV2', bondTradeTxnOffset, [0, 1]);
  const bondTradeTransactionsV2: BondTradeTransactionV2[] = (
    bondTradeTxnRaw.map((acc) => anchorRawBNsAndPubkeysToNumsAndStrings(acc)) as any
  ).filter((tradetxn) => tradetxn.publicKey !== 'CmFdBaFUGPvsV8Cs5AGRVwLFav3c2ptzEeXvhwP9UD9m');


  return {
    bondTradeTransactionsV2,
    bondOffersV2,
    fraktBonds,
    collateralBoxes,
    hadoMarketRegistry,
    hadoMarkets
  };
};
