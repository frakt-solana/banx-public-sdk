import { BN, web3 } from '@project-serum/anchor';
import { returnAnchorProgram } from '../../../helpers';
import { ENCODER, HADESPIN_LEADERBOARD_ENTRY_PREFIX, ROUND_PREFIX, ROUND_SETTING_PREFIX, ROUND_TXN_VAULT_PREFIX, USER_ROUND_PREFIX } from '../../../constants';
import { optimisticDrawUserTicket, optimisticJoinRound } from './helpers';
import { HadespinLeaderboardEntry, Round, RoundSettings, UserRound } from '../../../types';
import { PublicKey } from '@solana/web3.js';

type DrawUserTicket = (params: {
  programId: web3.PublicKey;
  connection: web3.Connection;
  addComputeUnits?: boolean;

  accounts: {
    userPubkey: web3.PublicKey;
    roundPubkey: PublicKey;
    userRoundPubkey: PublicKey;
  };
  optimistic: {
    roundSettings: RoundSettings;
    round: Round;
    userRound: UserRound;
    hadespinLeaderboardEntry: HadespinLeaderboardEntry;
  };

  sendTxn: (transaction: web3.Transaction, signers: web3.Signer[]) => Promise<void>;
}) => Promise<{
  instructions: web3.TransactionInstruction[];
  signers: web3.Signer[];
  optimisticResult: {
    round: Round
    roundSettings: RoundSettings,
    userRound: UserRound,
    hadespinLeaderboardEntry: HadespinLeaderboardEntry;
  };
}>;

export const drawUserTicket: DrawUserTicket = async ({
  programId,
  connection,
  addComputeUnits,
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

  const accountsIntoInstruction = {
    systemProgram: web3.SystemProgram.programId,
    rent: web3.SYSVAR_RENT_PUBKEY,
    user: accounts.userPubkey,
    round: accounts.roundPubkey,
    userRound: accounts.userRoundPubkey,
    hadespinLeaderboardEntry,
    roundSetting: roundSettings,
    roundTxnVault: roundTxnVault,
  };

  instructions.push(
    await program.methods
      .drawUserTicket()
      .accountsStrict(accountsIntoInstruction)
      .remainingAccounts([])
      .instruction(),
  );

  const transaction = new web3.Transaction();
  for (let instruction of instructions) transaction.add(instruction);

  const signers = [];
  await sendTxn(transaction, signers);

  const optimisticResult = await optimisticDrawUserTicket({
    round: { ...optimistic.round },
    roundSettings: { ...optimistic.roundSettings },
    userRound: { ...optimistic.userRound },
    hadespinLeaderboardEntry: { ...optimistic.hadespinLeaderboardEntry },
  });

  return {
    instructions,
    signers,
    optimisticResult,
  };
};
