import BN from "bn.js";
import { HadespinLeaderboardEntry, Round, RoundState } from "../../../types";
import { EMPTY_PUBKEY } from "../../../constants";

export const getMockHadespinLeaderboardEntry = async ( 

  ) => {
    const hadespinLeaderboardEntry: HadespinLeaderboardEntry = {
        user: EMPTY_PUBKEY.toBase58(),
        totalSolDeposited: 0,
        totalSolInNftDeposited: 0,
        totalNftDeposited: 0,
        totalFeePayed: 0,
        totalSolWon: 0,
        lastTransactedAt: 0,
        placeholderOne: EMPTY_PUBKEY.toBase58(),
        placeholderTwo: EMPTY_PUBKEY.toBase58(),
        publicKey: ""
    };
    
      return hadespinLeaderboardEntry;
}