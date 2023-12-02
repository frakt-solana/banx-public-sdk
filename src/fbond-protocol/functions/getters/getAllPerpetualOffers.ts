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
import { Bonds } from '../../idl/bonds';
import { nowInSeconds } from '../perpetual';
import { TERMINATION_PERIOD } from '../../constants';
import { getFilteredAccounts } from './getAllPerpetualProgramAccounts';

export const getAllPerpetualOffers = async (
  programId: web3.PublicKey,
  connection: web3.Connection,
): Promise<{
  bondOffersV2: BondOfferV2[];
}> => {
  const program = await returnAnchorProgram(programId, connection);

  const bondOfferOffset = 32 + 8;

  const bondOffersRaw = await getFilteredAccounts(program, 'bondOfferV2', bondOfferOffset, [5, 6,7,8,9]);
  const bondOffersV2 = bondOffersRaw.map((acc) => anchorRawBNsAndPubkeysToNumsAndStrings(acc));



  return {
    bondOffersV2,
  };
};
