import { BN, web3 } from '@project-serum/anchor';
import {
  ADVENTURE_PREFIX,
  ADVENTURE_SUBSCRIPTION_PREFIX,
  AUTHORIZATION_RULES_PROGRAM,
  BANX_USER_PREFIX,
  EMPTY_PUBKEY,
  ENCODER,
  METADATA_PROGRAM_PUBKEY,
  STAKING_REWARDS_VAULT_PREFIX,
  STAKING_SETTINGS_PREFIX,
} from '../../../constants';
import { returnAnchorProgram } from '../../../helpers';
import { weeksToAdventureTimestamp } from '../helpers';

type SubAndUnsubOrHarvestWeeks = (params: {
  programId: web3.PublicKey;
  connection: web3.Connection;

  addComputeUnits?: boolean;
  args: {
    weekToSubscribe: number;
  };

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

export const subAndUnsubOrHarvestWeeks: SubAndUnsubOrHarvestWeeks = async ({
  programId,
  connection,
  addComputeUnits,
  accounts,
  args,
  sendTxn,
}) => {
  const program = returnAnchorProgram(programId, connection);
  const instructions: web3.TransactionInstruction[] = [];

  const [adventure] = await web3.PublicKey.findProgramAddress(
    [ENCODER.encode(ADVENTURE_PREFIX), ENCODER.encode(weeksToAdventureTimestamp(args.weekToSubscribe).toString())],
    program.programId,
  );

  const [adventureSubscription] = await web3.PublicKey.findProgramAddress(
    [ENCODER.encode(ADVENTURE_SUBSCRIPTION_PREFIX), adventure.toBuffer(), accounts.banxStake.toBuffer()],
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
    adventure,
    adventureSubscription,
    stakingSettings,
    stakingRewardsVault,
    banxStake: accounts.banxStake,
    user: accounts.userPubkey,
    systemProgram: web3.SystemProgram.programId,
    rent: web3.SYSVAR_RENT_PUBKEY,
  };

  instructions.push(
    await program.methods
      .unsubOrHarvestWeeks(new BN(args.weekToSubscribe))
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
