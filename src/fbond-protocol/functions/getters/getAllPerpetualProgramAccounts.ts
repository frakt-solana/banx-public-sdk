import { TERMINATION_PERIOD } from '../../constants';
import { anchorRawBNsAndPubkeysToNumsAndStrings } from '../../helpers';
import { returnAnchorProgram } from '../../helpers';
import { Bonds } from '../../idl/bonds';
import {
  BondOfferV2,
  BondTradeTransactionV2,
  BondTradeTransactionV2State,
  CollateralBox,
  FraktBond,
  HadoMarket,
  HadoMarketRegistry,
} from '../../types';
import { nowInSeconds } from '../perpetual';
import { BN, Program, web3 } from '@project-serum/anchor';
import { bs58 } from '@project-serum/anchor/dist/cjs/utils/bytes';

export const getAllPerpetualProgramAccounts = async (
  programId: web3.PublicKey,
  connection: web3.Connection,
): Promise<{
  bondTradeTransactionsV2: BondTradeTransactionV2[];
  bondOffersV2: BondOfferV2[];
  fraktBonds: FraktBond[];
  hadoMarketRegistry: HadoMarketRegistry[];
  hadoMarkets: HadoMarket[];
}> => {
  const program = await returnAnchorProgram(programId, connection);

  const fraktBondsOffset = 8;

  const fraktBondsRaw = await getFilteredAccounts(program, 'fraktBond', fraktBondsOffset, [5, 6, 7, 8]);

  const fraktBonds = fraktBondsRaw.map((fraktBondRaw) => anchorRawBNsAndPubkeysToNumsAndStrings(fraktBondRaw));

  const hadoMarketRegistry = (await program.account.hadoMarketRegistry.all()).map((raw) =>
    anchorRawBNsAndPubkeysToNumsAndStrings(raw),
  );

  const hadoMarketOffset = 32 + 8;

  const hadoMarketsRaw = await getFilteredAccounts(program, 'hadoMarket', hadoMarketOffset, [3, 4]);

  const hadoMarkets = hadoMarketsRaw.map((hadoMarketRaw) => anchorRawBNsAndPubkeysToNumsAndStrings(hadoMarketRaw));

  const bondOfferOffset = 32 + 8;

  const bondOffersRaw = await getFilteredAccounts(program, 'bondOfferV2', bondOfferOffset, [5, 6, 7, 8, 9]);
  const bondOffersV2 = bondOffersRaw.map((acc) => anchorRawBNsAndPubkeysToNumsAndStrings(acc));

  const bondTradeTxnOffset = 8;

  const bondTradeTxnRaw = await getFilteredAccounts(
    program,
    'bondTradeTransactionV2',
    bondTradeTxnOffset,
    [2, 3, 4, 5, 6, 7, 8, 9],
  );

  const bondTradeTransactionsV2: BondTradeTransactionV2[] = bondTradeTxnRaw.map((acc) =>
    anchorRawBNsAndPubkeysToNumsAndStrings(acc),
  ) as any;

  return {
    bondTradeTransactionsV2,
    bondOffersV2,
    fraktBonds,
    hadoMarketRegistry,
    hadoMarkets,
  };
};

export const getFilteredAccounts = async <T>(
  program: Program<Bonds>,
  accountName: string,
  offset: number,
  indexes: number[],
): Promise<T[]> => {
  return (
    await Promise.all(
      indexes.map((i) =>
        program.account[accountName].all([
          {
            memcmp: {
              offset: offset, // number of bytes
              bytes: bs58.encode(Buffer.from([i])), //PerpetualActive
            },
          },
        ]),
      ),
    )
  ).flat() as any;
};

export const getFilteredAccountsByNumber = async <T>(
  program: Program<Bonds>,
  accountName: string,
  offset: number,
  indexes: number[],
): Promise<T[]> => {
  return (
    await Promise.all(
      indexes.map((i) =>
        program.account[accountName].all([
          {
            memcmp: {
              offset: offset, // number of bytes
              bytes: bs58.encode(new BN(i).toBuffer()), //PerpetualActive
            },
          },
        ]),
      ),
    )
  ).flat() as any;
};

export const getLastTransactedAtFromPerpetualBondTradeTransaction = (bond_trade_txn: BondTradeTransactionV2) => {
  if (bond_trade_txn.bondTradeTransactionState === BondTradeTransactionV2State.PerpetualActive)
    return bond_trade_txn.soldAt;
  if (
    bond_trade_txn.bondTradeTransactionState === BondTradeTransactionV2State.PerpetualManualTerminating ||
    nowInSeconds() < bond_trade_txn.redeemedAt + TERMINATION_PERIOD
  )
    return bond_trade_txn.redeemedAt;
  else return bond_trade_txn.redeemedAt + TERMINATION_PERIOD;
};
