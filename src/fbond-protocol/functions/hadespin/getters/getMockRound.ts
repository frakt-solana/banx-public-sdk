import BN from "bn.js";
import { Round, RoundState } from "../../../types";

export const getMockRound = async ( 

  ) => {
    const round: Round = {
      lastTransactedAt: 0,
      participants: 0,
      publicKey: "",
      roundState: RoundState.Uninitialized,
      solAmount: 0,
      feeAmount: 0,
      roundEndsAt: 0,
      startedAt: 0,
      roundNumber: 0,
      roundValue: "0",
      winner: '',
      solInNftAmount: 0,
      contractBid: 0,
      placeholderOne: 0,
      placeholderTwo: 0,
      placeholderThree: 0
    };
    
      return round;
}