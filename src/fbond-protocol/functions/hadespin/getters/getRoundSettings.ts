import { web3 } from '@project-serum/anchor';
import { anchorRawBNsAndPubkeysToNumsAndStrings } from '../../../helpers';
import { returnAnchorProgram } from '../../../helpers';
import {Round, RoundSettings, UserRound} from '../../../types';

export const getRoundSettings = async (
  programId: web3.PublicKey,
  connection: web3.Connection,
): Promise<{
  roundSettings: RoundSettings[];
}> => {
  const program = await returnAnchorProgram(programId, connection);

  const roundSettings = (await program.account.roundSetting.all()).map((raw) =>
    anchorRawBNsAndPubkeysToNumsAndStrings(raw),
  );

  return {
    roundSettings,
  };
};
