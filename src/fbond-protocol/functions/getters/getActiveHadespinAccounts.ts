import { anchorRawBNsAndPubkeysToNumsAndStrings } from '../../helpers';
import { returnAnchorProgram } from '../../helpers';
import {
  Adventure,
  AdventureSubscription,
  BanxStake,
  BanxUser,
  BondOfferV2,
  BondTradeTransactionV2,
  CollateralBox,
  FraktBond,
  HadespinLeaderboardEntry,
  HadespinRakeback,
  HadoMarket,
  HadoMarketRegistry,
  Round,
  RoundSettings,
  StakingSettings,
  UserRound,
} from '../../types';
import { getFilteredAccounts, getFilteredAccountsByNumber } from './getAllPerpetualProgramAccounts';
import { web3 } from '@project-serum/anchor';

export const getActiveHadespinAccounts = async (
  programId: web3.PublicKey,
  connection: web3.Connection,
): Promise<{
  rounds: Round[],
  userRounds: UserRound[],
  roundSettings: RoundSettings[];
  hadespinLeaderboardEntrys: HadespinLeaderboardEntry[];
  hadespinRakebacks: HadespinRakeback[];
}> => {
  const program = await returnAnchorProgram(programId, connection);

  // const rounds: Round[] = (await program.account.round.all()).map((raw) =>
  //   anchorRawBNsAndPubkeysToNumsAndStrings(raw),
  // );

  const userRounds: UserRound[] = (await program.account.userRound.all()).map((raw) =>
    anchorRawBNsAndPubkeysToNumsAndStrings(raw),
  );


  const roundSettings = (await program.account.roundSetting.all()).map((raw) =>
    anchorRawBNsAndPubkeysToNumsAndStrings(raw),
  );

  const hadespinLeaderboardEntrys = (await program.account.hadespinLeaderboardEntry.all()).map((raw) =>
    anchorRawBNsAndPubkeysToNumsAndStrings(raw),
  );

  const hadespinRakebacks = (await program.account.hadespinRakeback.all()).map((raw) =>
    anchorRawBNsAndPubkeysToNumsAndStrings(raw),
  );

  const roundOffset = 8;
  const adventureOffset = 8;
  const adventureSubscriptionsOffset = 104 + 8;

  const rounds = (await getFilteredAccounts(program, 'round', roundOffset, [0, 1, 2]))
    .map((acc) => anchorRawBNsAndPubkeysToNumsAndStrings(acc));

  return {
    rounds,
    userRounds,
    roundSettings,
    hadespinLeaderboardEntrys,
    hadespinRakebacks,
  };
};
