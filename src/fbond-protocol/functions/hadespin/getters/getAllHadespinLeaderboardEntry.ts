import { web3 } from '@project-serum/anchor';
import { anchorRawBNsAndPubkeysToNumsAndStrings } from '../../../helpers';
import { returnAnchorProgram } from '../../../helpers';
import { HadespinLeaderboardEntry, Round, RoundSettings, UserRound } from '../../../types';

export const getAllHadespinLeaderboardEntry = async (
  programId: web3.PublicKey,
  connection: web3.Connection,
): Promise<{
  hadespinLeaderboardEntrys: HadespinLeaderboardEntry[];
}> => {
  const program = await returnAnchorProgram(programId, connection);

  const hadespinLeaderboardEntrys = (await program.account.hadespinLeaderboardEntry.all()).map((raw) =>
  anchorRawBNsAndPubkeysToNumsAndStrings(raw),
);

  return {
    hadespinLeaderboardEntrys,
  };
};
