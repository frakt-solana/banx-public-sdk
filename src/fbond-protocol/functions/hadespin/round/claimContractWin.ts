import { BN, web3 } from '@project-serum/anchor';
import { findTokenRecordPda, getMetaplexEditionPda, getMetaplexMetadata, returnAnchorProgram } from '../../../helpers';
import { AUTHORIZATION_RULES_PROGRAM, EMPTY_PUBKEY, ENCODER, HADESPIN_JACKPOT_VAULT_PREFIX, HADESPIN_LEADERBOARD_ENTRY_PREFIX, METADATA_PROGRAM_PUBKEY, ROUND_PREFIX, ROUND_SETTING_PREFIX, ROUND_TXN_VAULT_PREFIX, USER_ROUND_PREFIX } from '../../../constants';
import { optimisticClaimWinnerNft, optimisticDrawUserTicket, optimisticJoinRound } from './helpers';
import { BondOfferV2, HadespinLeaderboardEntry, Round, RoundSettings, UserRound } from '../../../types';
import { Keypair } from '@solana/web3.js';
import { hadoMarket } from '../..';
import { findAssociatedTokenAddress } from '../../../../common';
import { ASSOCIATED_PROGRAM_ID } from '@project-serum/anchor/dist/cjs/utils/token';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { nowInSeconds } from '../../perpetual';

type ClaimContractWin = (params: {
  programId: web3.PublicKey;
  connection: web3.Connection;
  addComputeUnits?: boolean;

  accounts: {
    user: web3.PublicKey;
    round: web3.PublicKey;
  };

  sendTxn: (transaction: web3.Transaction, signers: web3.Signer[]) => Promise<void>;
}) => Promise<{
  instructions: web3.TransactionInstruction[];
  signers: web3.Signer[];
}>;

export const claimContractWin: ClaimContractWin = async ({
  programId,
  connection,
  addComputeUnits,
  accounts,
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

  instructions.push(
    await program.methods
      .claimContractWin()
      .accountsStrict({
        user: accounts.user,
        systemProgram: web3.SystemProgram.programId,
        rent: web3.SYSVAR_RENT_PUBKEY,
        round: accounts.round,
        roundTxnVault: roundTxnVault
      })
      .instruction(),
  );

  const transaction = new web3.Transaction();
  for (let instruction of instructions) transaction.add(instruction);
  const signers = [];
  await sendTxn(transaction, signers);

  return {
    instructions,
    signers,
  };
};
