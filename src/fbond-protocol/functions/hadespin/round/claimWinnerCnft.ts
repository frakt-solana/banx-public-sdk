import { BN, web3 } from '@project-serum/anchor';
import { decode, findTokenRecordPda, getMetaplexEditionPda, getMetaplexMetadata, mapProof, returnAnchorProgram } from '../../../helpers';
import { AUTHORIZATION_RULES_PROGRAM, BUBBLEGUM_PROGRAM_ID, EMPTY_PUBKEY, ENCODER, HADESPIN_LEADERBOARD_ENTRY_PREFIX, METADATA_PROGRAM_PUBKEY, ROUND_PREFIX, ROUND_SETTING_PREFIX, ROUND_TXN_VAULT_PREFIX, SPL_ACCOUNT_COMPRESSION_PROGRAM_ID, SPL_NOOP_PROGRAM_ID, USER_ROUND_PREFIX } from '../../../constants';
import { optimisticClaimWinnerNft, optimisticDrawUserTicket, optimisticJoinRound } from './helpers';
import { BondOfferV2, HadespinLeaderboardEntry, Round, RoundSettings, UserRound } from '../../../types';
import { Keypair } from '@solana/web3.js';
import { hadoMarket } from '../..';
import { findAssociatedTokenAddress } from '../../../../common';
import { ASSOCIATED_PROGRAM_ID } from '@project-serum/anchor/dist/cjs/utils/token';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { nowInSeconds } from '../../perpetual';
import { CnftParams } from '../../bond/creation/createBondAndSellToOffersCnft';
import { round } from 'lodash';

type ClaimWinnerCnft = (params: {
  programId: web3.PublicKey;
  connection: web3.Connection;
  addComputeUnits?: boolean;

  accounts: {
    userPubkey: web3.PublicKey;
    userRoundWinner: web3.PublicKey;
    userRoundWithNft: web3.PublicKey;
    round: web3.PublicKey;
    whitelistEntry: web3.PublicKey;
    tree: web3.PublicKey;
    nftMint: web3.PublicKey;
  };

  args: {
    roundNumber: number;
    cnftParams: CnftParams;
    proof: any;
  };

  optimistic: {
    roundSettings: RoundSettings;
    round: Round;
    userRoundWinner: UserRound;
    userRoundWithNft: UserRound;
    hadespinLeaderboardEntry: HadespinLeaderboardEntry;
  };

  sendTxn: (transaction: web3.Transaction, signers: web3.Signer[]) => Promise<void>;
}) => Promise<{
  instructions: web3.TransactionInstruction[];
  signers: web3.Signer[];
  optimisticResult: {
    round: Round;
    userRoundWinner: UserRound;
    userRoundWithNft: UserRound;
    roundSettings: RoundSettings;
    hadespinLeaderboardEntry: HadespinLeaderboardEntry;
  };
}>;

export const claimWinnerCnft: ClaimWinnerCnft = async ({
  programId,
  connection,
  addComputeUnits,
  accounts,
  args,
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

  const [treeAuthority, _bump2] = web3.PublicKey.findProgramAddressSync(
    [accounts.tree.toBuffer()],
    BUBBLEGUM_PROGRAM_ID,
  );

  const [hadespinLeaderboardEntry, hadespinLeaderboardEntryBump] = await web3.PublicKey.findProgramAddress(
    [ENCODER.encode(HADESPIN_LEADERBOARD_ENTRY_PREFIX), accounts.userPubkey.toBuffer()],
    program.programId,
  );

  const proofPathAsAccounts = mapProof(args.proof);

  const root = decode(args.proof.root);
  const dataHash = decode(args.cnftParams.dataHash);
  const creatorHash = decode(args.cnftParams.creatorHash);
  const nonce = new BN(args.cnftParams.leafId);
  const index = args.cnftParams.leafId;

  instructions.push(
    await program.methods
      .claimWinnerCnft(
        root,
        dataHash,
        creatorHash,
        nonce,
        index,
        proofPathAsAccounts.length,
      )
      .accountsStrict({
        user: accounts.userPubkey,
        systemProgram: web3.SystemProgram.programId,
        rent: web3.SYSVAR_RENT_PUBKEY,
        merkleTree: accounts.tree,
        treeAuthority: treeAuthority,
        bubblegumProgram: BUBBLEGUM_PROGRAM_ID,
        compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
        logWrapper: SPL_NOOP_PROGRAM_ID,
        userRoundWinner: accounts.userRoundWinner,
        roundSetting: roundSettings,
        roundTxnVault: roundTxnVault,
        round: accounts.round,
        userRoundWithNft: accounts.userRoundWithNft,
        hadespinLeaderboardEntry,
      })
      .instruction(),
  );

  const transaction = new web3.Transaction();
  for (let instruction of instructions) transaction.add(instruction);
  const signers = [];
  await sendTxn(transaction, signers);

  const optimisticResult = await optimisticClaimWinnerNft({
    round: { ...optimistic.round },
    roundSettings: { ...optimistic.roundSettings },
    userRoundWinner: { ...optimistic.userRoundWinner },
    userRoundWithNft: { ...optimistic.userRoundWithNft },
    hadespinLeaderboardEntry: { ...optimistic.hadespinLeaderboardEntry },
  });

  return {
    instructions,
    signers,
    optimisticResult,
  };
};
