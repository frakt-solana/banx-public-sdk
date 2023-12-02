import { BN, web3 } from '@project-serum/anchor';
import { returnAnchorProgram } from '../../../helpers';
import { EMPTY_PUBKEY, ENCODER, HADESPIN_ADDITIONAL_PARTICIPANTS_VAULT_PREFIX, HADESPIN_JACKPOT_VAULT_PREFIX, HADESPIN_LEADERBOARD_ENTRY_PREFIX, HADESPIN_RAKEBACK_PREFIX, HADESPIN_RAKEBACK_VAULT_PREFIX, ROUND_PREFIX, ROUND_SETTING_PREFIX, ROUND_TXN_VAULT_PREFIX, USER_ROUND_PREFIX } from '../../../constants';
import { getAdditionalParticipantsRemainingAccounts, optimisticJoinRound } from './helpers';
import { HadespinLeaderboardEntry, HadespinRakeback, Round, RoundSettings, UserRound } from '../../../types';
import { Keypair } from '@solana/web3.js';

type JoinRound = (params: {
  programId: web3.PublicKey;
  connection: web3.Connection;
  addComputeUnits?: boolean;

  args: {
    solToDeposit: number;
    roundNumber: number;
  };
  accounts: {
    userPubkey: web3.PublicKey;
  };
  optimistic: {
    roundSettings: RoundSettings;
    round: Round;
    hadespinLeaderboardEntry: HadespinLeaderboardEntry;
    hadespinRakeback: HadespinRakeback,
  };

  sendTxn: (transaction: web3.Transaction, signers: web3.Signer[]) => Promise<void>;
}) => Promise<{
  instructions: web3.TransactionInstruction[];
  signers: web3.Signer[];
  optimisticResult: {
    round: Round;
    userRound: UserRound;
    roundSettings: RoundSettings;
    hadespinLeaderboardEntry: HadespinLeaderboardEntry;
    hadespinRakeback: HadespinRakeback;
  };
}>;

export const joinRound: JoinRound = async ({
  programId,
  connection,
  addComputeUnits,
  args,
  accounts,
  optimistic,
  sendTxn,
}) => {
  const program = returnAnchorProgram(programId, connection);
  const instructions: web3.TransactionInstruction[] = [];
  const modifyComputeUnits = web3.ComputeBudgetProgram.setComputeUnitLimit({
    units: Math.round(800000 + Math.ceil(Math.random() * 10000)),
  });
  const requestHeap = web3.ComputeBudgetProgram.requestHeapFrame({ bytes: 1024 * 250 });
  instructions.push(requestHeap);

  if (!!addComputeUnits) instructions.push(modifyComputeUnits);
  const [round] = await web3.PublicKey.findProgramAddress(
    [
      ENCODER.encode(ROUND_PREFIX),
      ENCODER.encode(args.roundNumber.toString()),
    ],
    program.programId,
  );

  const userRoundSeed = Math.ceil(Math.random() * 1000000);

  const [userRound, userRoundBump] = await web3.PublicKey.findProgramAddress(
    [ENCODER.encode(USER_ROUND_PREFIX), accounts.userPubkey.toBuffer(), ENCODER.encode(userRoundSeed.toString())],
    program.programId,
  );

  const [roundTxnVault] = await web3.PublicKey.findProgramAddress(
    [ENCODER.encode(ROUND_TXN_VAULT_PREFIX)],
    program.programId,
  );

  const [roundSettings] = await web3.PublicKey.findProgramAddress(
    [ENCODER.encode(ROUND_SETTING_PREFIX)],
    program.programId,
  );

  const [hadespinLeaderboardEntry, hadespinLeaderboardEntryBump] = await web3.PublicKey.findProgramAddress(
    [ENCODER.encode(HADESPIN_LEADERBOARD_ENTRY_PREFIX), accounts.userPubkey.toBuffer()],
    program.programId,
  );

  const [hadespinRakeback, hadespinRakebackBump] = await web3.PublicKey.findProgramAddress(
    [ENCODER.encode(HADESPIN_RAKEBACK_PREFIX), accounts.userPubkey.toBuffer()],
    program.programId,
  );

  const [hadespinAdditionalParticipantsVault, hadespinAdditionalParticipantsVaultBump] = await web3.PublicKey.findProgramAddress(
    [ENCODER.encode(HADESPIN_ADDITIONAL_PARTICIPANTS_VAULT_PREFIX)],
    program.programId,
  );

  const accountsIntoInstruction = {
    systemProgram: web3.SystemProgram.programId,
    rent: web3.SYSVAR_RENT_PUBKEY,
    round: round,
    userRound: userRound,
    user: accounts.userPubkey,
    roundSetting: roundSettings,
    roundTxnVault: roundTxnVault,
    hadespinLeaderboardEntry: hadespinLeaderboardEntry,
    rakeback: hadespinRakeback,
    additionalParticipantsVault: hadespinAdditionalParticipantsVault
  };

  instructions.push(
    await program.methods
      .joinRound(new BN(args.solToDeposit), new BN(args.roundNumber), new BN(userRoundSeed))
      .accountsStrict(accountsIntoInstruction)
      .instruction(),
  );

  const transaction = new web3.Transaction();
  for (let instruction of instructions) transaction.add(instruction);
  const signers = [];
  await sendTxn(transaction, signers);

  const optimisticResult = await optimisticJoinRound({
    round: { ...optimistic.round },
    roundNumber: args.roundNumber,
    roundSettings: { ...optimistic.roundSettings },
    hadespinLeaderboardEntry: { ...optimistic.hadespinLeaderboardEntry, publicKey: hadespinLeaderboardEntry.toBase58() },
    roundPubKey: round.toString(),
    userRoundPubKey: userRound.toString(),
    userPubkey: accounts.userPubkey.toString(),
    solToDeposit: args.solToDeposit,
    programId: program.programId.toString(),
    solInNftToDeposit: 0,
    nftMint: '',
    hadespinRakeback: {
      ...optimistic.hadespinRakeback,
      publicKey: hadespinRakeback.toBase58(),
    },
  });

  return {
    instructions,
    signers,
    optimisticResult,
  };
};
