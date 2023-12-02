import BN from "bn.js";
import { HadespinRakeback, Round, RoundState } from "../../../types";

export const getMockHadespinRakeback = async ( 

  ) => {
    const rakeback: HadespinRakeback = {
      user: "",
      hadesToClaimAmount: 0,
      claimTimestamp: 0,
      claimedAt: 0,
      claimed: false,
      lastTransactedAt: 0,
      placeholderOne: "",
      publicKey: ""
    };
    
    return rakeback;
}