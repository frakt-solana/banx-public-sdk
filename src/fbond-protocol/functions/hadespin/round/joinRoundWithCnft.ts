import { BN, web3 } from '@project-serum/anchor';
import { decode, findTokenRecordPda, getMetaplexEditionPda, getMetaplexMetadata, mapProof, returnAnchorProgram } from '../../../helpers';
import { AUTHORIZATION_RULES_PROGRAM, BUBBLEGUM_PROGRAM_ID, EMPTY_PUBKEY, ENCODER, HADESPIN_ADDITIONAL_PARTICIPANTS_VAULT_PREFIX, HADESPIN_LEADERBOARD_ENTRY_PREFIX, HADESPIN_RAKEBACK_PREFIX, HADESPIN_RAKEBACK_VAULT_PREFIX, METADATA_PROGRAM_PUBKEY, ROUND_PREFIX, ROUND_SETTING_PREFIX, ROUND_TXN_VAULT_PREFIX, SPL_ACCOUNT_COMPRESSION_PROGRAM_ID, SPL_NOOP_PROGRAM_ID, USER_ROUND_PREFIX } from '../../../constants';
import { getAdditionalParticipantsRemainingAccounts, optimisticJoinRound } from './helpers';
import { BondOfferV2, HadespinLeaderboardEntry, HadespinRakeback, Round, RoundSettings, UserRound } from '../../../types';
import { Keypair } from '@solana/web3.js';
import { hadoMarket } from '../..';
import { findAssociatedTokenAddress } from '../../../../common';
import { ASSOCIATED_PROGRAM_ID } from '@project-serum/anchor/dist/cjs/utils/token';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { CnftParams } from '../../bond/creation/createBondAndSellToOffersCnft';

type JoinRoundWithCnft = (params: {
  programId: web3.PublicKey;
  connection: web3.Connection;
  addComputeUnits?: boolean;

  args: {
    solInNftToDeposit: number;
    roundNumber: number;
    cnftParams: CnftParams;
    proof: any;
  };

  accounts: {
    userPubkey: web3.PublicKey;
    bondOfferV2: web3.PublicKey;
    hadoMarket: web3.PublicKey;
    whitelistEntry: web3.PublicKey;
    tree: web3.PublicKey;
    nftMint: web3.PublicKey;
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
    hadespinRakeback: HadespinRakeback,
  };
}>;

export const joinRoundWithCnft: JoinRoundWithCnft = async ({
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

  const roundNumber = new BN(args.roundNumber);

  const [treeAuthority, _bump2] = web3.PublicKey.findProgramAddressSync(
    [accounts.tree.toBuffer()],
    BUBBLEGUM_PROGRAM_ID,
  );

  const [hadespinRakeback, hadespinRakebackBump] = await web3.PublicKey.findProgramAddress(
    [ENCODER.encode(HADESPIN_RAKEBACK_PREFIX), accounts.userPubkey.toBuffer()],
    program.programId,
  );

  const [hadespinAdditionalParticipantsVault, hadespinAdditionalParticipantsVaultBump] = await web3.PublicKey.findProgramAddress(
    [ENCODER.encode(HADESPIN_ADDITIONAL_PARTICIPANTS_VAULT_PREFIX)],
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
      .joinRoundWithCnft(
        roundNumber,
        new BN(userRoundSeed),
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
        nftMint: accounts.nftMint,
        userRound: userRound,
        round: round,
        roundSetting: roundSettings,
        bondOffer: accounts.bondOfferV2,
        hadoMarket: accounts.hadoMarket,
        roundTxnVault: roundTxnVault,
        hadespinLeaderboardEntry,
        rakeback: hadespinRakeback,
        additionalParticipantsVault: hadespinAdditionalParticipantsVault,
      })
      .remainingAccounts(proofPathAsAccounts)
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
    solToDeposit: 0,
    programId: program.programId.toString(),
    solInNftToDeposit: args.solInNftToDeposit,
    nftMint: accounts.nftMint.toBase58(),
    hadespinRakeback: optimistic.hadespinRakeback,
  });

  return {
    instructions,
    signers,
    optimisticResult,
  };
};
