import { BN, web3 } from '@project-serum/anchor';
import { ASSOCIATED_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@project-serum/anchor/dist/cjs/utils/token';
import { findAssociatedTokenAddress } from '../../../../common';
import {
  AUTHORIZATION_RULES_PROGRAM,
  BANX_USER_PREFIX,
  EMPTY_PUBKEY,
  ENCODER,
  METADATA_PROGRAM_PUBKEY,
  STAKING_REWARDS_VAULT_PREFIX,
  STAKING_SETTINGS_PREFIX,
} from '../../../constants';
import { MUTUAL_BOND_TRADE_TXN_VAULT, HADOMARKET_REGISTRY_PREFIX } from '../../../constants';
import { Metadata, TokenRecord, TokenStandard } from '@metaplex-foundation/mpl-token-metadata';

import { findTokenRecordPda, getMetaplexEditionPda, getMetaplexMetadata, returnAnchorProgram } from '../../../helpers';

type UnstakeBanx = (params: {
  programId: web3.PublicKey;
  connection: web3.Connection;

  addComputeUnits?: boolean;

  accounts: {
    banxStake: web3.PublicKey;

    userPubkey: web3.PublicKey;
    tokenMint: web3.PublicKey;

    subscriptionsAndAdventures: {
      adventure: web3.PublicKey;
      adventureSubscription: web3.PublicKey;
    }[];
  };

  sendTxn: (transaction: web3.Transaction, signers: web3.Signer[]) => Promise<void>;
}) => Promise<{
  instructions: web3.TransactionInstruction[];
  signers: web3.Signer[];
  addressesForLookupTable: web3.PublicKey[];
}>;

export const unstakeBanx: UnstakeBanx = async ({ programId, connection, addComputeUnits, accounts, sendTxn }) => {
  const program = returnAnchorProgram(programId, connection);
  const instructions: web3.TransactionInstruction[] = [];

  const userTokenAccount = await findAssociatedTokenAddress(accounts.userPubkey, accounts.tokenMint);
  const editionInfo = getMetaplexEditionPda(accounts.tokenMint);
  const nftMetadata = getMetaplexMetadata(accounts.tokenMint);
  const ownerTokenRecord = findTokenRecordPda(accounts.tokenMint, userTokenAccount);
  const destTokenRecord = findTokenRecordPda(accounts.tokenMint, userTokenAccount);

  const meta = await Metadata.fromAccountAddress(connection, nftMetadata);
  const ruleSet = meta.programmableConfig?.ruleSet;

  const [mutualBondTradeTxnVault] = await web3.PublicKey.findProgramAddress(
    [ENCODER.encode(MUTUAL_BOND_TRADE_TXN_VAULT)],
    program.programId,
  );

  const [banxUser] = await web3.PublicKey.findProgramAddress(
    [ENCODER.encode(BANX_USER_PREFIX), accounts.userPubkey.toBuffer()],
    program.programId,
  );

  const [stakingSettings] = await web3.PublicKey.findProgramAddress(
    [ENCODER.encode(STAKING_SETTINGS_PREFIX)],
    program.programId,
  );

  const [stakingRewardsVault] = await web3.PublicKey.findProgramAddress(
    [ENCODER.encode(STAKING_REWARDS_VAULT_PREFIX)],
    program.programId,
  );

  const modifyComputeUnits = web3.ComputeBudgetProgram.setComputeUnitLimit({
    units: Math.round(800000 + Math.ceil(Math.random() * 10000)),
  });
  const requestHeap = web3.ComputeBudgetProgram.requestHeapFrame({ bytes: 1024 * 250 });
  instructions.push(requestHeap);

  if (!!addComputeUnits) instructions.push(modifyComputeUnits);

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

  const accountsIntoInstruction = {
    stakingSettings,
    stakingRewardsVault,
    banxStake: accounts.banxStake,
    banxUser: banxUser,
    user: accounts.userPubkey,
    mutualBondTradeTxnVault: mutualBondTradeTxnVault,

    tokenMint: accounts.tokenMint,
    userTokenAccount: userTokenAccount,
    ownerTokenRecord,
    destTokenRecord: destTokenRecord,
    nftMetadata,
    instructions: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
    authorizationRulesProgram: AUTHORIZATION_RULES_PROGRAM,
    authRules: ruleSet || EMPTY_PUBKEY,

    tokenProgram: TOKEN_PROGRAM_ID,
    associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
    systemProgram: web3.SystemProgram.programId,
    rent: web3.SYSVAR_RENT_PUBKEY,
    metadataProgram: METADATA_PROGRAM_PUBKEY,
    editionInfo: editionInfo,
  };

  instructions.push(
    await program.methods
      .unstakeBanx()
      .accountsStrict(accountsIntoInstruction)
      .remainingAccounts(unsubscribeOrHarvestRemainingAccounts)
      .instruction(),
  );
  const addressesForLookupTable = [
    ...Object.values(accountsIntoInstruction),
    ...Array.from(unsubscribeOrHarvestRemainingAccounts, (x) => x.pubkey),
  ];

  const transaction = new web3.Transaction();
  for (let instruction of instructions) transaction.add(instruction);

  const signers = [];
  await sendTxn(transaction, signers);
  return {
    instructions,
    signers,
    addressesForLookupTable,
  };
};
