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
import { bs58 } from '@project-serum/anchor/dist/cjs/utils/bytes';
import { nowInSeconds } from '../perpetual';
import { TERMINATION_PERIOD } from '../../constants';
import { getFilteredAccounts } from './getAllPerpetualProgramAccounts';

export const getPerpetualActiveAccounts = async (
  programId: web3.PublicKey,
  connection: web3.Connection,
): Promise<{
  bondTradeTransactionsV2: BondTradeTransactionV2[];
  bondOffersV2: BondOfferV2[];
  fraktBonds: FraktBond[];
}> => {
  const program = await returnAnchorProgram(programId, connection);

  const fraktBondsOffset = 8;
  const bondOfferOffset = 32 + 8;
  const bondTradeTxnOffset = 8;

  const [
    fraktBondsRaw,
    bondOffersRaw,
    bondTradeTxnRaw
  ] = await Promise.all([
    getFilteredAccounts(program, 'fraktBond', fraktBondsOffset, [5, ]),
    getFilteredAccounts(program, 'bondOfferV2', bondOfferOffset, [5, 7,]),
    getFilteredAccounts(
      program,
      'bondTradeTransactionV2',
      bondTradeTxnOffset,
      [2, 6, 7, 9],
    )

  ])

  // const fraktBondsRaw = await getFilteredAccounts(program, 'fraktBond', fraktBondsOffset, [5, 6, ]);

  const fraktBonds = fraktBondsRaw.map((fraktBondRaw) => anchorRawBNsAndPubkeysToNumsAndStrings(fraktBondRaw));



  // const bondOffersRaw = await getFilteredAccounts(program, 'bondOfferV2', bondOfferOffset, [5, 7,]);
  const bondOffersV2 = bondOffersRaw.map((acc) => anchorRawBNsAndPubkeysToNumsAndStrings(acc));

  

  // const bondTradeTxnRaw = await getFilteredAccounts(
  //   program,
  //   'bondTradeTransactionV2',
  //   bondTradeTxnOffset,
  //   [2, 6, 9],
  // );

  const bondTradeTransactionsV2: BondTradeTransactionV2[] = bondTradeTxnRaw.map((acc) =>
    anchorRawBNsAndPubkeysToNumsAndStrings(acc),
  ) as any;

  return {
    bondTradeTransactionsV2,
    bondOffersV2,
    fraktBonds,
  };
};

