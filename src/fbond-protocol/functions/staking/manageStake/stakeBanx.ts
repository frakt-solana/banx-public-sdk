import { BN, web3 } from '@project-serum/anchor';
import { ASSOCIATED_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@project-serum/anchor/dist/cjs/utils/token';
import { findAssociatedTokenAddress } from '../../../../common';
import {
  ADVENTURE_PREFIX,
  ADVENTURE_SUBSCRIPTION_PREFIX,
  AUTHORIZATION_RULES_PROGRAM,
  BANX_POINTS_MAP_PREFIX,
  BANX_USER_PREFIX,
  EMPTY_PUBKEY,
  ENCODER,
  METADATA_PROGRAM_PUBKEY,
} from '../../../constants';
import { MUTUAL_BOND_TRADE_TXN_VAULT, HADOMARKET_REGISTRY_PREFIX } from '../../../constants';
import { Metadata, TokenRecord, TokenStandard } from '@metaplex-foundation/mpl-token-metadata';

import {
  anchorRawBNsAndPubkeysToNumsAndStrings,
  findTokenRecordPda,
  getMetaplexEditionPda,
  getMetaplexMetadata,
  returnAnchorProgram,
} from './../../../helpers';
import { adventureTimestampToWeeks, weeksToAdventureTimestamp } from '../helpers';

type StakeBanx = (params: {
  programId: web3.PublicKey;
  connection: web3.Connection;

  addComputeUnits?: boolean;

  args: {
    weeksOfSubscriptions: number[];
  };
  accounts: {
    whitelistEntry: web3.PublicKey;
    hadoRegistry: web3.PublicKey;

    userPubkey: web3.PublicKey;
    tokenMint: web3.PublicKey;
  };

  sendTxn: (transaction: web3.Transaction, signers: web3.Signer[]) => Promise<void>;
}) => Promise<{
  banxStake: web3.PublicKey;

  instructions: web3.TransactionInstruction[];
  signers: web3.Signer[];
  addressesForLookupTable: web3.PublicKey[];
}>;

export const stakeBanx: StakeBanx = async ({ programId, connection, addComputeUnits, accounts, args, sendTxn }) => {
  const currentTimestamp = Math.floor(new Date().getTime() / 1000);

  const weeks = adventureTimestampToWeeks(currentTimestamp);
  const weekStart = weeksToAdventureTimestamp(weeks);
  const diffCurrentWeek = currentTimestamp - weekStart;
  if (diffCurrentWeek <= 86400) {
    args.weeksOfSubscriptions = args.weeksOfSubscriptions.find((week) => week === weeks)
      ? args.weeksOfSubscriptions
      : [weeks, ...args.weeksOfSubscriptions];
  }
  const program = returnAnchorProgram(programId, connection);
  const instructions: web3.TransactionInstruction[] = [];
  const banxStake = web3.Keypair.generate();

  const userTokenAccount = await findAssociatedTokenAddress(accounts.userPubkey, accounts.tokenMint);
  const editionInfo = getMetaplexEditionPda(accounts.tokenMint);
  const nftMetadata = getMetaplexMetadata(accounts.tokenMint);
  const ownerTokenRecord = findTokenRecordPda(accounts.tokenMint, userTokenAccount);
  const meta = await Metadata.fromAccountAddress(connection, nftMetadata);
  const ruleSet = meta.programmableConfig?.ruleSet;
  const tokenRecordData =
    meta.tokenStandard === TokenStandard.ProgrammableNonFungible
      ? await TokenRecord.fromAccountAddress(connection, ownerTokenRecord)
      : { delegate: null };
  const delegatePubkey = tokenRecordData.delegate;

  const [mutualBondTradeTxnVault] = await web3.PublicKey.findProgramAddress(
    [ENCODER.encode(MUTUAL_BOND_TRADE_TXN_VAULT)],
    program.programId,
  );

  const [banxUser] = await web3.PublicKey.findProgramAddress(
    [ENCODER.encode(BANX_USER_PREFIX), accounts.userPubkey.toBuffer()],
    program.programId,
  );

  const [banxPointsMap] = await web3.PublicKey.findProgramAddress(
    [ENCODER.encode(BANX_POINTS_MAP_PREFIX), accounts.tokenMint.toBuffer()],
    program.programId,
  );

  const modifyComputeUnits = web3.ComputeBudgetProgram.setComputeUnitLimit({
    units: Math.round(800000 + Math.ceil(Math.random() * 10000)),
  });
  const requestHeap = web3.ComputeBudgetProgram.requestHeapFrame({ bytes: 1024 * 250 });
  instructions.push(requestHeap);

  if (!!addComputeUnits) instructions.push(modifyComputeUnits);

  const subscriptionParams = await Promise.all(
    args.weeksOfSubscriptions.map(async (weeks) => {
      const [adventure, adventureBump] = await web3.PublicKey.findProgramAddress(
        [ENCODER.encode(ADVENTURE_PREFIX), ENCODER.encode(weeksToAdventureTimestamp(weeks).toString())],
        program.programId,
      );
      const [adventureSubscription, subscriptionBump] = await web3.PublicKey.findProgramAddress(
        [ENCODER.encode(ADVENTURE_SUBSCRIPTION_PREFIX), adventure.toBuffer(), banxStake.publicKey.toBuffer()],
        program.programId,
      );
      return {
        weeks: new BN(weeks),
        subscriptionBump: subscriptionBump,
        adventureBump: adventureBump,
      };
    }),
  );

  const subscribeRemainingAccounts = (
    await Promise.all(
      args.weeksOfSubscriptions.map(async (weeks) => {
        const [adventure] = await web3.PublicKey.findProgramAddress(
          [ENCODER.encode(ADVENTURE_PREFIX), ENCODER.encode(weeksToAdventureTimestamp(weeks).toString())],
          program.programId,
        );
        const [adventureSubscription] = await web3.PublicKey.findProgramAddress(
          [ENCODER.encode(ADVENTURE_SUBSCRIPTION_PREFIX), adventure.toBuffer(), banxStake.publicKey.toBuffer()],
          program.programId,
        );
        return [
          {
            pubkey: adventure,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: adventureSubscription,
            isSigner: false,
            isWritable: true,
          },
        ];
      }),
    )
  ).flat();

  const accountsIntoInstruction = {
    banxStake: banxStake.publicKey,
    banxUser: banxUser,
    banxPointsMap: banxPointsMap,
    user: accounts.userPubkey,

    hadoRegistry: accounts.hadoRegistry,

    whitelistEntry: accounts.whitelistEntry,
    mutualBondTradeTxnVault: mutualBondTradeTxnVault,

    tokenMint: accounts.tokenMint,
    userTokenAccount: userTokenAccount,
    ownerTokenRecord,
    nftMetadata,
    instructions: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
    authorizationRulesProgram: AUTHORIZATION_RULES_PROGRAM,

    tokenProgram: TOKEN_PROGRAM_ID,
    associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
    systemProgram: web3.SystemProgram.programId,
    rent: web3.SYSVAR_RENT_PUBKEY,
    metadataProgram: METADATA_PROGRAM_PUBKEY,
    editionInfo: editionInfo,
  };

  const remainingAccountsPnft = [
    {
      pubkey: ruleSet || METADATA_PROGRAM_PUBKEY,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: delegatePubkey || METADATA_PROGRAM_PUBKEY,
      isSigner: false,
      isWritable: false,
    },
  ];

  const createAndSellBondRemainingAccounts = [...subscribeRemainingAccounts, ...remainingAccountsPnft];

  instructions.push(
    await program.methods
      .stakeBanx(subscriptionParams)
      .accountsStrict(accountsIntoInstruction)
      .remainingAccounts(createAndSellBondRemainingAccounts)
      .instruction(),
  );
  const addressesForLookupTable = [
    ...Object.values(accountsIntoInstruction),
    ...Array.from(createAndSellBondRemainingAccounts, (x) => x.pubkey),
  ];

  console.log(
    'accounts of stakeBanx: ',
    anchorRawBNsAndPubkeysToNumsAndStrings({ account: accountsIntoInstruction, publicKey: banxStake.publicKey }),
  );

  console.log(
    'remaining accounts of stakeBanx: ',
    createAndSellBondRemainingAccounts.map((remainingAccount) => remainingAccount.pubkey.toBase58()),
  );
  const transaction = new web3.Transaction();
  for (let instruction of instructions) transaction.add(instruction);

  const signers = [banxStake];
  await sendTxn(transaction, signers);
  return {
    banxStake: banxStake.publicKey,

    instructions,
    signers,
    addressesForLookupTable,
  };
};
