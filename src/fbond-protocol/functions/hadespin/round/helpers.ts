import { Program, web3 } from "@project-serum/anchor";
import { program } from "@project-serum/anchor/dist/cjs/native/system";
import { API_ENDPOINT, BASE_POINTS, EMPTY_PUBKEY, ENCODER, HADESPIN_ADDITIONAL_PARTICIPANTS_LIST, HADESPIN_RAKEBACK_TIMESTAMP, ROUND_PREFIX, TENSOR_API_KEY, USER_ROUND_PREFIX } from "../../../constants";
import { nowInSeconds } from "../../../helpers";
import { HadespinLeaderboardEntry, HadespinRakeback, Round, RoundSettings, RoundState, UserRound } from "../../../types";
import { LAMPORTS_PER_SOL, PublicKey, TransactionInstruction } from "@solana/web3.js";
import { getMockContractUserRound } from "../getters/getMockContractUserRound";

export const optimisticJoinRound = async (args: {
  round: Round;
  roundNumber: number,
  roundSettings: RoundSettings,
  hadespinLeaderboardEntry: HadespinLeaderboardEntry,
  roundPubKey: string,
  userRoundPubKey: string,
  userPubkey: string,
  solToDeposit: number,
  solInNftToDeposit: number,
  nftMint: string;
  programId: string,
  hadespinRakeback: HadespinRakeback,
}) => {
  const totalSolToDeposit = args.solToDeposit + args.solInNftToDeposit;
  const feeAmount = Math.floor(((totalSolToDeposit) * args.roundSettings.feePercent) / BASE_POINTS);
  const solAmount = args.solToDeposit + feeAmount;

  if (args.round.roundState == RoundState.Uninitialized) {
    args.round = await optimisticCreateRound({
      round: args.round,
      roundPubKey: args.roundPubKey.toString(),
    });
    args.round.startedAt = nowInSeconds();
    args.round.roundNumber = args.roundNumber;
    args.round.roundState = RoundState.Open;
    args.round.roundEndsAt = nowInSeconds() + args.roundSettings.roundDuration;
    args.roundSettings.lastRoundEndsAt = args.round.roundEndsAt;
    
    //contract bid
    args.roundSettings.totalParticipants += 1;
    args.round.contractBid = args.roundSettings.contractBid;
    args.round.participants += 1;
    args.round.solAmount = args.roundSettings.contractBid;
    args.roundSettings.totalSolDeposited += args.roundSettings.contractBid;
  }

  const userRound = await optimisticCreateUserRound({
    roundSettings: args.roundSettings,
    solDeposited: totalSolToDeposit,
    round: args.round,
    userPubkey: args.userPubkey,
    userRoundPublicKey: args.userRoundPubKey,
    nftMint: args.nftMint,
  });

  const hadespinLeaderboardEntry: HadespinLeaderboardEntry = await optimisticFillHadespinLeaderboardEntry(
    {
      hadespinLeaderboardEntry: args.hadespinLeaderboardEntry,
      solDeposited: args.solToDeposit,
      solInNftToDeposit: args.solInNftToDeposit,
      feeAmount: feeAmount,
      userPubkey: args.userPubkey,
    },
  );

  const hadespinRakeback: HadespinRakeback = await optimisticHadespinRakeback({
    solDeposited: args.solToDeposit,
    solInNftToDeposit: args.solInNftToDeposit,
    userPubkey: args.userPubkey,
    roundSetting: args.roundSettings,
    hadespinRakeback: args.hadespinRakeback,
  });

  args.round.participants++;
  args.round.solAmount += totalSolToDeposit;
  args.round.solInNftAmount += args.solInNftToDeposit;
  args.round.feeAmount += feeAmount;
  args.round.lastTransactedAt = nowInSeconds();

  args.roundSettings.totalParticipants++;
  args.roundSettings.completedRounds = args.roundNumber;
  args.roundSettings.lastTransactedAt = nowInSeconds();
  args.roundSettings.totalFeeCollected += feeAmount;
  args.roundSettings.totalSolDeposited += totalSolToDeposit;

  const contractUserRound: UserRound = await getMockContractUserRound({
    contractBid: args.roundSettings.contractBid,
    roundPubkey: args.roundPubKey,
    programId: args.programId
  });

  return {
    round: args.round,
    userRound: userRound,
    roundSettings: args.roundSettings,
    hadespinLeaderboardEntry: hadespinLeaderboardEntry,
    hadespinRakeback: hadespinRakeback,
    contractUserRound: contractUserRound,
  }
}

export const optimisticCreateRound = async (args: {
  round: Round,
  roundPubKey: string,
}) => {

  return {
    ...args.round,
    roundState: RoundState.Initialized,
    publicKey: args.roundPubKey,
  };
}

export const optimisticCreateUserRound = async (args: {
  roundSettings: RoundSettings,
  solDeposited: number,
  round: Round,
  userPubkey: string,
  userRoundPublicKey: string,
  nftMint: string,
}) => {
  const userRound: UserRound = {
    depositedAt: nowInSeconds(),
    lastTransactedAt: nowInSeconds(),
    round: args.round.publicKey,
    startSolPosition: args.round.solAmount,
    solDeposited: args.solDeposited,
    user: args.userPubkey,
    publicKey: args.userRoundPublicKey,
    nftMint: args.nftMint,
    jackpotSolAmount: 0,
    jackpotClaimedAt: 0,
    jackpotClaimed: false,
    placeholderOne: 0,
    placeholderTwo: 0,
    placeholderThree: false,
    placeholderFour: false,
    placeholderFive: false
  };

  return userRound;
}

export const optimisticFillHadespinLeaderboardEntry = async (args: {
  hadespinLeaderboardEntry: HadespinLeaderboardEntry,
  solDeposited: number,
  solInNftToDeposit: number,
  feeAmount: number,
  userPubkey: string,
}) => {
  const newHadespinLeaderboardEntry: HadespinLeaderboardEntry = {
    ...args.hadespinLeaderboardEntry,
    lastTransactedAt: nowInSeconds(),
    totalNftDeposited: args.solInNftToDeposit == 0
      ? args.hadespinLeaderboardEntry.totalNftDeposited : args.hadespinLeaderboardEntry.totalNftDeposited + 1,
    user: args.userPubkey,
    totalSolInNftDeposited: args.hadespinLeaderboardEntry.totalNftDeposited + args.solInNftToDeposit,
    totalFeePayed: args.hadespinLeaderboardEntry.totalSolDeposited + args.feeAmount,
    totalSolDeposited: args.hadespinLeaderboardEntry.totalSolDeposited + args.solDeposited,
  };

  return newHadespinLeaderboardEntry;
}

export const optimisticHadespinRakeback = async (args: {
  solDeposited: number,
  solInNftToDeposit: number,
  userPubkey: string,
  roundSetting: RoundSettings,
  hadespinRakeback: HadespinRakeback,
}) => {

  const hadesToClaimAmount = Math.floor((args.solDeposited + args.solInNftToDeposit) * args.roundSetting.rakebackHadesForSol / LAMPORTS_PER_SOL);

  const newHadespinRakeback: HadespinRakeback = {
    ...args.hadespinRakeback,
    lastTransactedAt: nowInSeconds(),
    claimTimestamp: args.hadespinRakeback.claimTimestamp != 0 ? args.hadespinRakeback.claimTimestamp : nowInSeconds() + HADESPIN_RAKEBACK_TIMESTAMP,
    claimed: false,
    user: args.userPubkey,
    hadesToClaimAmount: args.hadespinRakeback.hadesToClaimAmount + hadesToClaimAmount,
  };

  return newHadespinRakeback;
}

export const optimisticDrawUserTicket = async (args: {
  round: Round;
  roundSettings: RoundSettings;
  userRound: UserRound;
  hadespinLeaderboardEntry: HadespinLeaderboardEntry;
}) => {
  args.roundSettings.lastTransactedAt = nowInSeconds();
  args.round.winner = args.userRound.user;
  args.round.roundState = RoundState.Drawn;
  args.round.lastTransactedAt = nowInSeconds();
  args.userRound.lastTransactedAt = nowInSeconds();
  args.hadespinLeaderboardEntry.lastTransactedAt = nowInSeconds();
  args.hadespinLeaderboardEntry.totalSolWon += args.round.solAmount;

  return {
    round: args.round,
    roundSettings: args.roundSettings,
    userRound: args.userRound,
    hadespinLeaderboardEntry: args.hadespinLeaderboardEntry,
  }
}

export const optimisticClaimWinnerNft = async (args: {
  round: Round;
  roundSettings: RoundSettings;
  userRoundWinner: UserRound;
  userRoundWithNft: UserRound;
  hadespinLeaderboardEntry: HadespinLeaderboardEntry;
}) => {
  args.roundSettings.lastTransactedAt = nowInSeconds();

  args.round.lastTransactedAt = nowInSeconds();
  args.userRoundWinner.lastTransactedAt = nowInSeconds();
  args.userRoundWithNft.lastTransactedAt = nowInSeconds();
  args.userRoundWithNft.nftMint = EMPTY_PUBKEY.toBase58();

  if (args.round.solAmount == args.round.solInNftAmount && args.round.roundState == RoundState.Open) {
    args.round.winner = args.userRoundWinner.user;
    args.hadespinLeaderboardEntry.totalSolWon += args.round.solAmount;
    args.hadespinLeaderboardEntry.lastTransactedAt = nowInSeconds();
    args.round.roundState = RoundState.Drawn;
  }

  return {
    round: args.round,
    roundSettings: args.roundSettings,
    userRoundWinner: args.userRoundWinner,
    userRoundWithNft: args.userRoundWithNft,
    hadespinLeaderboardEntry: args.hadespinLeaderboardEntry,
  }
}

export const getSwapIx = async (user: PublicKey, quote: any) => {
  const data = {
    quoteResponse: quote,
    userPublicKey: user.toBase58(),
  };

  return fetch(`${API_ENDPOINT}/swap-instructions`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  }).then((response) => response.json());
};

export const getNftSellIx = async (user: PublicKey, minPriceLamports: bigint, mint: PublicKey, pool: PublicKey) => {
  const data = {
    query: `query TswapSellNftTx(
      $minPriceLamports: Decimal!
      $mint: String!
      $pool: String!
      $seller: String!
      $sellerTokenAccount: String
    ) {
      tswapSellNftTx(
        minPriceLamports: $minPriceLamports
        mint: $mint
        pool: $pool
        seller: $seller
        sellerTokenAccount: $sellerTokenAccount
      ) {
        txs {
          lastValidBlockHeight
          tx
          txV0 # If this is present, use this!
        }
      }
    }`,
    variables: {
      "seller": user.toBase58(),
      "minPriceLamports": minPriceLamports.toString(),
      "mint": mint.toBase58(),
      "pool": pool.toBase58(),
      "sellerTokenAccount": null
    },
  };

  return fetch(`https://api.tensor.so/graphql`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-TENSOR-API-KEY": TENSOR_API_KEY,
    },
    body: JSON.stringify(data),
  }).then((response) => response.json());
};

export const getQuote = async (
  fromMint: PublicKey,
  toMint: PublicKey,
  amount: number
) => {
  return fetch(
    `${API_ENDPOINT}/quote?outputMint=${toMint.toBase58()}&inputMint=${fromMint.toBase58()}&amount=${amount}&swapMode=ExactOut&slippage=0.5`
  ).then((response) => response.json());
};

export const instructionDataToTransactionInstruction = (
  instructionPayload: any
) => {
  if (instructionPayload === null) {
    return null;
  }

  return new TransactionInstruction({
    programId: new PublicKey(instructionPayload.programId),
    keys: instructionPayload.accounts.map((key) => ({
      pubkey: new PublicKey(key.pubkey),
      isSigner: key.isSigner,
      isWritable: key.isWritable,
    })),
    data: Buffer.from(instructionPayload.data, "base64"),
  });
};

export const getAdditionalParticipantsRemainingAccounts = ( args: {
  roundNumber: number,
  programId: web3.PublicKey,
}) => {
  const additionalParticipantsRemainingAccounts =
    HADESPIN_ADDITIONAL_PARTICIPANTS_LIST.map((participant) => {
      const [userRound, userRoundBump] = web3.PublicKey.findProgramAddressSync(
        [ENCODER.encode(USER_ROUND_PREFIX), participant.toBuffer(), ENCODER.encode(args.roundNumber.toString())],
        args.programId,
      );

      return [
        {
          pubkey: userRound,
          isSigner: false,
          isWritable: true,
        },
      ]
    }).flat();

  return additionalParticipantsRemainingAccounts;
};