import { BN, web3 } from '@project-serum/anchor';
import { findTokenRecordPda, getMetaplexEditionPda, getMetaplexMetadata, returnAnchorProgram } from '../../../helpers';
import { AUTHORIZATION_RULES_PROGRAM, EMPTY_PUBKEY, ENCODER, HADESPIN_JACKPOT_VAULT_PREFIX, HADESPIN_LEADERBOARD_ENTRY_PREFIX, HADESPIN_RAKEBACK_PREFIX, HADESPIN_RAKEBACK_VAULT_PREFIX, METADATA_PROGRAM_PUBKEY, ROUND_PREFIX, ROUND_SETTING_PREFIX, ROUND_TXN_VAULT_PREFIX, USER_ROUND_PREFIX } from '../../../constants';
import { optimisticClaimWinnerNft, optimisticDrawUserTicket, optimisticJoinRound } from './helpers';
import { BondOfferV2, HadespinLeaderboardEntry, HadespinRakeback, Round, RoundSettings, UserRound } from '../../../types';
import { Keypair } from '@solana/web3.js';
import { hadoMarket } from '../..';
import { findAssociatedTokenAddress } from '../../../../common';
import { ASSOCIATED_PROGRAM_ID } from '@project-serum/anchor/dist/cjs/utils/token';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { nowInSeconds } from '../../perpetual';

type ClaimUserRakeback = (params: {
  programId: web3.PublicKey;
  connection: web3.Connection;
  addComputeUnits?: boolean;

  accounts: {
    user: web3.PublicKey;
    userRound: web3.PublicKey;
    collateralTokenMint: web3.PublicKey;
  };

  optimistic: {
    hadespinRakeback: HadespinRakeback;
  };

  sendTxn: (transaction: web3.Transaction, signers: web3.Signer[]) => Promise<void>;
}) => Promise<{
  instructions: web3.TransactionInstruction[];
  signers: web3.Signer[];
  optimisticResult: {
    hadespinRakeback: HadespinRakeback;
  };
}>;

export const claimUserRakeback: ClaimUserRakeback = async ({
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

  const [hadespinRakeback, hadespinRakebackBump] = await web3.PublicKey.findProgramAddress(
    [ENCODER.encode(HADESPIN_RAKEBACK_PREFIX), accounts.user.toBuffer()],
    program.programId,
  );

  const [hadespinRakebackVault, hadespinRakebackVaultBump] = await web3.PublicKey.findProgramAddress(
    [ENCODER.encode(HADESPIN_RAKEBACK_VAULT_PREFIX), accounts.user.toBuffer()],
    program.programId,
  );

  const hadespinRakebackVaultTokenAccount = await findAssociatedTokenAddress(
    hadespinRakebackVault,
    accounts.collateralTokenMint,
  );
  
  const userTokenAccount = await findAssociatedTokenAddress(accounts.user, accounts.collateralTokenMint);

  instructions.push(
    await program.methods
      .claimUserRakeback()
      .accountsStrict({
        user: accounts.user,
        systemProgram: web3.SystemProgram.programId,
        rent: web3.SYSVAR_RENT_PUBKEY,
        rakeback: hadespinRakeback,
        rakebackVault: hadespinRakebackVault,
        tokenMint: accounts.collateralTokenMint,
        associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
        userTokenAccount: userTokenAccount,
        rakebackVaultTokenAccount: hadespinRakebackVaultTokenAccount ,
        tokenProgram: TOKEN_PROGRAM_ID
      })
      .instruction(),
  );

  const transaction = new web3.Transaction();
  for (let instruction of instructions) transaction.add(instruction);
  const signers = [];
  await sendTxn(transaction, signers);

  const optimisticResult: {
    hadespinRakeback: HadespinRakeback;
  } = {
    hadespinRakeback: {
      ...optimistic.hadespinRakeback,
      claimed: true,
      claimedAt: nowInSeconds(),
      lastTransactedAt: nowInSeconds(),
    }
  }

  return {
    instructions,
    signers,
    optimisticResult,
  };
};
