import { BN, web3 } from '@project-serum/anchor';
import { findTokenRecordPda, getMetaplexEditionPda, getMetaplexMetadata, returnAnchorProgram } from '../../../helpers';
import { AUTHORIZATION_RULES_PROGRAM, EMPTY_PUBKEY, ENCODER, HADESPIN_ADDITIONAL_PARTICIPANTS_VAULT_PREFIX, HADESPIN_LEADERBOARD_ENTRY_PREFIX, HADESPIN_RAKEBACK_PREFIX, METADATA_PROGRAM_PUBKEY, ROUND_PREFIX, ROUND_SETTING_PREFIX, ROUND_TXN_VAULT_PREFIX, USER_ROUND_PREFIX } from '../../../constants';
import { getAdditionalParticipantsRemainingAccounts, optimisticJoinRound } from './helpers';
import { BondOfferV2, HadespinLeaderboardEntry, HadespinRakeback, Round, RoundSettings, UserRound } from '../../../types';
import { Keypair } from '@solana/web3.js';
import { hadoMarket } from '../..';
import { findAssociatedTokenAddress } from '../../../../common';
import { ASSOCIATED_PROGRAM_ID } from '@project-serum/anchor/dist/cjs/utils/token';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

type JoinRoundWithNft = (params: {
  programId: web3.PublicKey;
  connection: web3.Connection;
  addComputeUnits?: boolean;

  args: {
    solInNftToDeposit: number;
    roundNumber: number;
  };
    accounts: {
    userPubkey: web3.PublicKey;
    bondOfferV2: web3.PublicKey;
    hadoMarket: web3.PublicKey;
    collateralTokenMint: web3.PublicKey;
    collateralOwner: web3.PublicKey;
    ruleSet?: web3.PublicKey;
  };
  optimistic: {
    roundSettings: RoundSettings;
    round: Round;
    hadespinLeaderboardEntry: HadespinLeaderboardEntry;
    hadespinRakeback: HadespinRakeback;
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

export const joinRoundWithNft: JoinRoundWithNft = async ({
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

  const roundNumber = new BN(args.roundNumber);
  const userTokenAccount = await findAssociatedTokenAddress(accounts.userPubkey, accounts.collateralTokenMint);
  const roundTxnTokenAccount = await findAssociatedTokenAddress(
    roundTxnVault,
    accounts.collateralTokenMint,
  );

  const editionInfo = getMetaplexEditionPda(accounts.collateralTokenMint);
  const nftMetadata = getMetaplexMetadata(accounts.collateralTokenMint);
  const ownerTokenRecord = findTokenRecordPda(accounts.collateralTokenMint, userTokenAccount);
  const destTokenRecord = findTokenRecordPda(accounts.collateralTokenMint, roundTxnTokenAccount);
  const ruleSet = accounts.ruleSet;

  instructions.push(
    await program.methods
      .joinRoundWithNft(roundNumber, new BN(userRoundSeed), null)
      .accountsStrict({
        round: round,
        instructions: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
        userRound: userRound,
        user: accounts.userPubkey,
        roundSetting: roundSettings,
        bondOffer: accounts.bondOfferV2,
        hadoMarket: accounts.hadoMarket,
        roundTxnVault: roundTxnVault,
        tokenMint: accounts.collateralTokenMint,
        userTokenAccount: userTokenAccount,
        roundTokenAccount: roundTxnTokenAccount,
        systemProgram: web3.SystemProgram.programId,
        rent: web3.SYSVAR_RENT_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
        metadataProgram: METADATA_PROGRAM_PUBKEY,
        authorizationRulesProgram: AUTHORIZATION_RULES_PROGRAM,
        editionInfo: editionInfo,
        nftMetadata,
        ownerTokenRecord,
        destTokenRecord,
        authRules: ruleSet || EMPTY_PUBKEY,
        hadespinLeaderboardEntry,
        rakeback: hadespinRakeback,
        additionalParticipantsVault: hadespinAdditionalParticipantsVault,
      })
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
    nftMint: accounts.collateralTokenMint.toBase58(),
    hadespinRakeback: optimistic.hadespinRakeback,
  });

  return {
    instructions,
    signers,
    optimisticResult,
  };
};
