import { BN, web3 } from '@project-serum/anchor';
import { ASSOCIATED_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@project-serum/anchor/dist/cjs/utils/token';
import { findAssociatedTokenAddress } from '../../../../common';
import {
  AUTHORIZATION_RULES_PROGRAM,
  BANX_USER_PREFIX,
  EMPTY_PUBKEY,
  ENCODER,
  METADATA_PROGRAM_PUBKEY,
  MUTUAL_BOND_TRADE_TXN_VAULT,
  STAKING_REWARDS_VAULT_PREFIX,
  STAKING_SETTINGS_PREFIX,
} from '../../../constants';
import { BOND_PROOGRAM_AUTHORITY_PREFIX, RETURN_FUNDS_OWNER_PREFIX, COLLATERAL_BOX_PREFIX } from '../../../constants';
import { Metadata } from '@metaplex-foundation/mpl-token-metadata';

import {
  findTokenRecordPda,
  getMetaplexEditionPda,
  getMetaplexMetadata,
  returnAnchorProgram,
  getMetaplexMetadataPda,
} from './../../../helpers';
import { RepayAccounts } from '../repayment';

type LiquidateBondOnAuctionPnft = (params: {
  programId: web3.PublicKey;
  connection: web3.Connection;

  addComputeUnits?: boolean;

  accounts: {
    userPubkey: web3.PublicKey;
    fbond: web3.PublicKey;
    collateralBox: web3.PublicKey;
    collateralTokenMint: web3.PublicKey;
    collateralTokenAccount: web3.PublicKey;
    collateralOwner: web3.PublicKey;
    fraktMarket: web3.PublicKey;
    oracleFloor: web3.PublicKey;
    whitelistEntry: web3.PublicKey;
    admin: web3.PublicKey;

    banxStake: web3.PublicKey;

    repayAccounts: RepayAccounts[];
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

export const liquidateBondOnAuctionPnft: LiquidateBondOnAuctionPnft = async ({
  programId,
  connection,
  accounts,
  addComputeUnits,
  sendTxn,
}) => {
  const program = returnAnchorProgram(programId, connection);
  const instructions: web3.TransactionInstruction[] = [];

  const [mutualBondTradeTxnVault] = await web3.PublicKey.findProgramAddress(
    [ENCODER.encode(MUTUAL_BOND_TRADE_TXN_VAULT)],
    program.programId,
  );
  const [banxUser] = await web3.PublicKey.findProgramAddress(
    [ENCODER.encode(BANX_USER_PREFIX), accounts.collateralOwner.toBuffer()],
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

  const userTokenAccount = await findAssociatedTokenAddress(accounts.userPubkey, accounts.collateralTokenMint);

  const mutualBondTokenAccount = await findAssociatedTokenAddress(
    mutualBondTradeTxnVault,
    accounts.collateralTokenMint,
  );

  const editionInfo = getMetaplexEditionPda(accounts.collateralTokenMint);
  const nftMetadata = getMetaplexMetadata(accounts.collateralTokenMint);
  // const nftMetadata = getMetaplexMetadataPda(accounts.collateralTokenMint);
  const ownerTokenRecord = findTokenRecordPda(accounts.collateralTokenMint, accounts.collateralTokenAccount);

  const middleTokenRecord = findTokenRecordPda(accounts.collateralTokenMint, mutualBondTokenAccount);
  const destTokenRecord = findTokenRecordPda(accounts.collateralTokenMint, userTokenAccount);
  const meta = await Metadata.fromAccountAddress(connection, nftMetadata);
  const ruleSet = meta.programmableConfig?.ruleSet;
  const modifyComputeUnits = web3.ComputeBudgetProgram.setComputeUnitLimit({
    units: Math.round(800000 + Math.ceil(Math.random() * 10000)),
  });
  if (!!addComputeUnits) instructions.push(modifyComputeUnits);

  const repayRemainingAccounts = accounts.repayAccounts
    .map((repayAccount) => {
      return [
        {
          pubkey: repayAccount.bondTradeTransaction,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: repayAccount.user,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: repayAccount.bondOffer,
          isSigner: false,
          isWritable: true,
        },
      ];
    })
    .flat();

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

  const liquidateRemainingAccounts = [...repayRemainingAccounts, ...unsubscribeOrHarvestRemainingAccounts];

  const accountsIntoInstruction = {
    fbond: accounts.fbond,
    mutualBondTradeTxnVault: mutualBondTradeTxnVault,
    mutualBondTokenAccount: mutualBondTokenAccount,
    middleTokenRecord: middleTokenRecord,

    user: accounts.userPubkey,
    userTokenAccount: userTokenAccount,
    collateralBox: accounts.collateralBox,
    tokenMint: accounts.collateralTokenMint,

    collateralTokenAccount: accounts.collateralTokenAccount,
    collateralOwner: accounts.collateralOwner,

    fraktMarket: accounts.fraktMarket,
    oracleFloor: accounts.oracleFloor,
    whitelistEntry: accounts.whitelistEntry,

    ownerTokenRecord: ownerTokenRecord,
    destTokenRecord: destTokenRecord,
    nftMetadata,
    instructions: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
    authorizationRulesProgram: AUTHORIZATION_RULES_PROGRAM,

    tokenProgram: TOKEN_PROGRAM_ID,
    associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
    systemProgram: web3.SystemProgram.programId,
    rent: web3.SYSVAR_RENT_PUBKEY,
    metadataProgram: METADATA_PROGRAM_PUBKEY,
    editionInfo: editionInfo,
    admin: accounts.admin,
    authRules: ruleSet || METADATA_PROGRAM_PUBKEY,

    banxStake: accounts.banxStake.toBase58() !== EMPTY_PUBKEY.toBase58() ? accounts.banxStake : stakingSettings,
    banxUser: banxUser,

    stakingSettings: stakingSettings,
    stakingRewardsVault: stakingRewardsVault,
  };
  instructions.push(
    await program.methods
      .liquidateBondOnAuctionPnft(null, new BN(repayRemainingAccounts.length))
      .accountsStrict(accountsIntoInstruction)
      .remainingAccounts(liquidateRemainingAccounts)
      .instruction(),
  );

  const transaction = new web3.Transaction();
  for (let instruction of instructions) transaction.add(instruction);

  const signers = [];
  await sendTxn(transaction, signers);
  const addressesForLookupTable = [
    ...Object.values(accountsIntoInstruction),
    ...liquidateRemainingAccounts.map((remAccount) => remAccount.pubkey),
  ];
  return { instructions, signers, addressesForLookupTable };
};
