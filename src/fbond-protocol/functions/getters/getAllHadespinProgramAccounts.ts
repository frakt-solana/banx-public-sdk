import { web3 } from '@project-serum/anchor';
import { anchorRawBNsAndPubkeysToNumsAndStrings } from '../../helpers';
import { returnAnchorProgram } from '../../helpers';
import { HadespinLeaderboardEntry, HadespinRakeback, Round, RoundSettings, UserRound } from '../../types';
import { getAllUserRounds } from '../hadespin';

export const getAllHadespinProgramAccounts = async (
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

    const rounds: Round[] = (await program.account.round.all()).map((raw) =>
        anchorRawBNsAndPubkeysToNumsAndStrings(raw),
    );

    const userRounds: UserRound[] =  (await program.account.userRound.all()).map((raw) =>
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

    return {
        rounds,
        userRounds,
        roundSettings,
        hadespinLeaderboardEntrys,
        hadespinRakebacks,
    };
};
