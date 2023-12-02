import { findAssociatedTokenAddress } from '../../../../../common';
import {
  AUTHORIZATION_RULES_PROGRAM,
  BANX_USER_PREFIX,
  EMPTY_PUBKEY,
  ENCODER,
  METADATA_PROGRAM_PUBKEY,
  MUTUAL_BOND_TRADE_TXN_VAULT,
  STAKING_REWARDS_VAULT_PREFIX,
  STAKING_SETTINGS_PREFIX,
} from '../../../../constants';
import {
  findTokenRecordPda,
  getMetaplexEditionPda,
  getMetaplexMetadata,
  returnAnchorProgram,
} from '../../../../helpers';
import { BondTradeTransactionV2State, FraktBondState, RedeemResult } from '../../../../types';
import { BondAndTransactionOptimistic, nowInSeconds } from '../../offer';
import { web3 } from '@project-serum/anchor';
import { ASSOCIATED_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@project-serum/anchor/dist/cjs/utils/token';

type ClaimPerpetualLoan = (params: {
  programId: web3.PublicKey;
  connection: web3.Connection;

  addComputeUnits?: boolean;

  accounts: {
    fbond: web3.PublicKey;
    bondOffer: web3.PublicKey;


    collateralTokenMint: web3.PublicKey;
    collateralOwner: web3.PublicKey;
    bondTradeTransaction: web3.PublicKey;
    banxStake: web3.PublicKey;
    ruleSet?: web3.PublicKey;

    userPubkey: web3.PublicKey;

    subscriptionsAndAdventures: {
      adventure: web3.PublicKey;
      adventureSubscription: web3.PublicKey;
    }[];
  };

  optimistic: BondAndTransactionOptimistic;

  sendTxn: (transaction: web3.Transaction, signers: web3.Signer[]) => Promise<void>;
}) => Promise<{
  account: web3.PublicKey | null;
  instructions: web3.TransactionInstruction[];
  signers: web3.Signer[];
  optimisticResult: BondAndTransactionOptimistic;
}>;

export const claimPerpetualLoan: ClaimPerpetualLoan = async ({
  programId,
  connection,
  accounts,
  addComputeUnits,
  optimistic,
  sendTxn,
}) => {
  const program = returnAnchorProgram(programId, connection);
  const instructions: web3.TransactionInstruction[] = [];

  const [banxUser] = web3.PublicKey.findProgramAddressSync(
    [ENCODER.encode(BANX_USER_PREFIX), accounts.collateralOwner.toBuffer()],
    program.programId,
  );

  const [stakingSettings] = web3.PublicKey.findProgramAddressSync(
    [ENCODER.encode(STAKING_SETTINGS_PREFIX)],
    program.programId,
  );

  const [stakingRewardsVault] = web3.PublicKey.findProgramAddressSync(
    [ENCODER.encode(STAKING_REWARDS_VAULT_PREFIX)],
    program.programId,
  );

  const [mutualBondTradeTxnVault] = web3.PublicKey.findProgramAddressSync(
    [ENCODER.encode(MUTUAL_BOND_TRADE_TXN_VAULT)],
    program.programId,
  );
  const userTokenAccount = await findAssociatedTokenAddress(accounts.userPubkey, accounts.collateralTokenMint);
  const mutualBondTokenAccount = await findAssociatedTokenAddress(
    mutualBondTradeTxnVault,
    accounts.collateralTokenMint,
  );
  const collateralTokenAccount = await findAssociatedTokenAddress(
    accounts.collateralOwner,
    accounts.collateralTokenMint,
  );
  const unsubscribeOrHarvestRemainingAccounts = (
    await Promise.all(
      accounts.subscriptionsAndAdventures.map(async (subscriptionAndAdventure) => {
        return [
          {
            pubkey: subscriptionAndAdventure.adventure,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: subscriptionAndAdventure.adventureSubscription,
            isSigner: false,
            isWritable: true,
          },
        ];
      }),
    )
  ).flat();
  const editionInfo = getMetaplexEditionPda(accounts.collateralTokenMint);
  const nftMetadata = getMetaplexMetadata(accounts.collateralTokenMint);
  const ownerTokenRecord = findTokenRecordPda(accounts.collateralTokenMint, collateralTokenAccount);
  const middleTokenRecord = findTokenRecordPda(accounts.collateralTokenMint, mutualBondTokenAccount);
  const destTokenRecord = findTokenRecordPda(accounts.collateralTokenMint, userTokenAccount);
  const ruleSet = accounts.ruleSet;

  const modifyComputeUnits = web3.ComputeBudgetProgram.setComputeUnitLimit({
    units: Math.round(800000 + Math.ceil(Math.random() * 10000)),
  });
  const requestHeap = web3.ComputeBudgetProgram.requestHeapFrame({ bytes: 1024 * 250 });
  instructions.push(requestHeap);

  if (!!addComputeUnits) instructions.push(modifyComputeUnits);

  instructions.push(
    await program.methods
      .claimPerpetualLoan(null)
      .accountsStrict({
        banxStake: accounts.banxStake,
        banxUser,
        stakingSettings,
        stakingRewardsVault,

        bondTradeTransactionV2: accounts.bondTradeTransaction,
        fbond: accounts.fbond,
        mutualBondTradeTxnVault: mutualBondTradeTxnVault,

        tokenMint: accounts.collateralTokenMint,
        collateralOwner: accounts.collateralOwner,
        collateralTokenAccount: collateralTokenAccount,
        userTokenAccount: userTokenAccount,
        mutualBondTokenAccount: mutualBondTokenAccount,

        user: accounts.userPubkey,
        authRules: ruleSet || EMPTY_PUBKEY,

        systemProgram: web3.SystemProgram.programId,
        rent: web3.SYSVAR_RENT_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_PROGRAM_ID,

        metadataProgram: METADATA_PROGRAM_PUBKEY,
        editionInfo: editionInfo,
        ownerTokenRecord,
        middleTokenRecord,
        destTokenRecord,
        nftMetadata,
        instructions: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
        authorizationRulesProgram: AUTHORIZATION_RULES_PROGRAM,
        uninitializedOldBondOfferV2: accounts.bondOffer,
      })
      .remainingAccounts(unsubscribeOrHarvestRemainingAccounts)
      .instruction(),
  );
  const transaction = new web3.Transaction();
  for (let instruction of instructions) transaction.add(instruction);

  const signers = [];
  await sendTxn(transaction, signers);

  const optimisticResult: BondAndTransactionOptimistic = {
    bondTradeTransaction: {
      ...optimistic.bondTradeTransaction,
      bondTradeTransactionState: BondTradeTransactionV2State.PerpetualLiquidatedByClaim,
      redeemResult: RedeemResult.Nft,
      redeemedAt: nowInSeconds(),
    },
    fraktBond: {
      ...optimistic.fraktBond,
      fraktBondState: FraktBondState.PerpetualLiquidatedByClaim,
      repaidOrLiquidatedAt: nowInSeconds(),
      lastTransactedAt: nowInSeconds(),
    },
  };
  return { account: null, instructions, signers, optimisticResult };
};
