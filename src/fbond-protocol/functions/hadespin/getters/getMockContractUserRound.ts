import BN from "bn.js";
import { Round, RoundSettings, RoundState, UserRound } from "../../../types";
import { EMPTY_PUBKEY, ENCODER } from "../../../constants";
import { nowInSeconds } from "../../perpetual";
import { Keypair } from "@solana/web3.js";
import { web3 } from "@project-serum/anchor";

export const getMockContractUserRound = async (args: {
  contractBid: number,
  roundPubkey: string,
  programId: string
}) => {
  const programPubkey = new web3.PublicKey(args.programId)
  const roundPubkey = new web3.PublicKey(args.roundPubkey)
  const [userContractBid] = await web3.PublicKey.findProgramAddress(
    [ENCODER.encode("user_contract_bid"), roundPubkey.toBuffer()],
    programPubkey,
  );
  const [userRoundContractBid] = await web3.PublicKey.findProgramAddress(
    [ENCODER.encode("user_round_contract_bid"), roundPubkey.toBuffer()],
    programPubkey,
  );
  // const randomKeypairUser = new Keypair();

  const userRound: UserRound = {
    round: args.roundPubkey,
    solDeposited: args.contractBid,
    startSolPosition: 0,
    user: userContractBid.toBase58(),
    lastTransactedAt: nowInSeconds(),
    depositedAt: nowInSeconds(),
    nftMint: "",
    jackpotSolAmount: 0,
    jackpotClaimedAt: 0,
    jackpotClaimed: false,
    publicKey: userRoundContractBid.toBase58(),
    placeholderOne: 0,
    placeholderTwo: 0,
    placeholderThree: false,
    placeholderFour: false,
    placeholderFive: false
  };

  return userRound;
}