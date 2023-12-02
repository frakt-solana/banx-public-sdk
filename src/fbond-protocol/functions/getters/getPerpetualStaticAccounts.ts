import { Program, web3 } from '@project-serum/anchor';
import { anchorRawBNsAndPubkeysToNumsAndStrings } from '../../helpers';
import { returnAnchorProgram } from '../../helpers';
import {
  CollateralBox,
  FraktBond,
  HadoMarketRegistry,
  HadoMarket,
  BondTradeTransactionV2,
  BondOfferV2,
  BondTradeTransactionV2State,
} from '../../types';
import { getFilteredAccounts } from './getAllPerpetualProgramAccounts';

export const getPerpetualStaticAccounts = async (
  programId: web3.PublicKey,
  connection: web3.Connection,
): Promise<{

  hadoMarketRegistry: HadoMarketRegistry[];
  hadoMarkets: HadoMarket[];
}> => {
  const program = await returnAnchorProgram(programId, connection);


  const hadoMarketRegistry = (await program.account.hadoMarketRegistry.all()).map((raw) =>
    anchorRawBNsAndPubkeysToNumsAndStrings(raw),
  );

  const hadoMarketOffset = 32 + 8;

  const hadoMarketsRaw = await getFilteredAccounts(program, 'hadoMarket', hadoMarketOffset, [3, 4]);

  const hadoMarkets = hadoMarketsRaw.map((hadoMarketRaw) => anchorRawBNsAndPubkeysToNumsAndStrings(hadoMarketRaw));


  return {

    hadoMarketRegistry,
    hadoMarkets,
  };
};
