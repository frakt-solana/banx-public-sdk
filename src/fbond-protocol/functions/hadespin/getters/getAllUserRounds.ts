import { web3 } from '@project-serum/anchor';
import { anchorRawBNsAndPubkeysToNumsAndStrings } from '../../../helpers';
import { returnAnchorProgram } from '../../../helpers';
import { Round, RoundSettings, UserRound } from '../../../types';
import bs58 from 'bs58';
import { sha256 } from "js-sha256";
import { UserRoundRawLayout } from '../../../bufferLayouts';

export const getAllUserRounds = async (
  programId: web3.PublicKey,
  connection: web3.Connection,
): Promise<
  any
> => {
  const program = await returnAnchorProgram(programId, connection);
  const discriminator = Buffer.from(
    sha256.digest("account:UserRound")
  ).subarray(0, 8);

  const userRounds = await Promise.all((await connection.getProgramAccounts(programId, {
    filters: [
      { memcmp: { offset: 0, bytes: bs58.encode(discriminator) } },
    ],
  }))
    .map(async (userRound) => {
      let encodeUserRoundData = userRound.account.data.slice(8);
      const decoded = UserRoundRawLayout.decode(encodeUserRoundData, 0);
      return {
        round: decoded.round.toBase58(),
        solDeposited: Number(decoded.solDeposited),
        startSolPosition: Number(decoded.startSolPosition),
        user: decoded.user.toBase58(),
        lastTransactedAt: Number(decoded.lastTransactedAt),
        depositedAt: Number(decoded.depositedAt),
        nftMint: decoded.nftMint.toString(),
        jackpotSolAmount: Number(decoded.jackpotSolAmount),
        jackpotClaimedAt: Number(decoded.jackpotClaimedAt),
        jackpotClaimed: decoded.jackpotClaimed,
        placeholderOne: 0,
        placeholderTwo: 0,
        placeholderThree: false,
        placeholderFour: false,
        placeholderFive: false,
        publicKey: userRound.pubkey.toBase58()
      };
    }));

  return userRounds;
};
