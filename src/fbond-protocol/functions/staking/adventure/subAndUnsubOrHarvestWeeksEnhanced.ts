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

export interface SubAndUnsubParams {
  subscriptionWeeks: number;

  adventureUnsub?: web3.PublicKey;
  adventureSubscriptionUnsub?: web3.PublicKey;

  banxStakeSub: web3.PublicKey;
}

// #[derive(AnchorSerialize, AnchorDeserialize, Default, Copy, Clone)]
// pub struct UnsubOrHarvestParams {
//     pub subscription_weeks: u64,
//     pub unsub_accounts: u8,
//     pub adventure_bump: u8,
//     pub subscription_bump: u8,
// }

type SubAndUnsubOrHarvestWeeksEnhanced = (params: {
  programId: web3.PublicKey;
  connection: web3.Connection;

  addComputeUnits?: boolean;
  args: {
    subAndUnsubParams: SubAndUnsubParams[];
  };

  accounts: {
    // banxStake: web3.PublicKey;

    userPubkey: web3.PublicKey;
    // tokenMint: web3.PublicKey;

    // subscriptionsAndAdventures: {
    //   adventure: web3.PublicKey;
    //   adventureSubscription: web3.PublicKey;
    // }[];
  };

  sendTxn: (transaction: web3.Transaction, signers: web3.Signer[]) => Promise<void>;
}) => Promise<{
  instructions: web3.TransactionInstruction[];
  signers: web3.Signer[];
  addressesForLookupTable: web3.PublicKey[];
}>;

export const subAndUnsubOrHarvestWeeksEnhanced: SubAndUnsubOrHarvestWeeksEnhanced = async ({
  programId,
  connection,
  addComputeUnits,
  accounts,
  args,
  sendTxn,
}) => {
  const program = returnAnchorProgram(programId, connection);
  const instructions: web3.TransactionInstruction[] = [];

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
      args.subAndUnsubParams.map(async (subAndUnsubParam) => {
        const [adventureSub] = await web3.PublicKey.findProgramAddress(
          [
            ENCODER.encode(ADVENTURE_PREFIX),
            ENCODER.encode(weeksToAdventureTimestamp(subAndUnsubParam.subscriptionWeeks).toString()),
          ],
          program.programId,
        );

        const [adventureSubscriptionSub] = await web3.PublicKey.findProgramAddress(
          [
            ENCODER.encode(ADVENTURE_SUBSCRIPTION_PREFIX),
            adventureSub.toBuffer(),
            subAndUnsubParam.banxStakeSub.toBuffer(),
          ],
          program.programId,
        );
        return [
          {
            pubkey: subAndUnsubParam.banxStakeSub,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: adventureSub,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: adventureSubscriptionSub,
            isSigner: false,
            isWritable: true,
          },
          ...(subAndUnsubParam.adventureUnsub
            ? [
                {
                  pubkey: subAndUnsubParam.adventureUnsub as web3.PublicKey,
                  isSigner: false,
                  isWritable: true,
                },
                {
                  pubkey: subAndUnsubParam.adventureSubscriptionUnsub as web3.PublicKey,
                  isSigner: false,
                  isWritable: true,
                },
              ]
            : []),
        ];
      }),
    )
  ).flat();

  const subAndUnsubArgs = await Promise.all(
    args.subAndUnsubParams.map(async (subAndUnsubParam) => {
      // pub struct UnsubOrHarvestParams {
      //   pub subscription_weeks: u64,
      //   pub unsub_accounts: u8,
      //   pub adventure_bump: u8,
      //   pub subscription_bump: u8,
      // }
      const [adventureSub, adventureBump] = await web3.PublicKey.findProgramAddress(
        [
          ENCODER.encode(ADVENTURE_PREFIX),
          ENCODER.encode(weeksToAdventureTimestamp(subAndUnsubParam.subscriptionWeeks).toString()),
        ],
        program.programId,
      );

      const [_, subscriptionBump] = await web3.PublicKey.findProgramAddress(
        [
          ENCODER.encode(ADVENTURE_SUBSCRIPTION_PREFIX),
          adventureSub.toBuffer(),
          subAndUnsubParam.banxStakeSub.toBuffer(),
        ],
        program.programId,
      );
      return {
        subscriptionWeeks: new BN(subAndUnsubParam.subscriptionWeeks),
        unsubAccounts: subAndUnsubParam.adventureUnsub ? 2 : 0,
        adventureBump,
        subscriptionBump,
      };
    }),
  );

  const accountsIntoInstruction = {
    stakingSettings,
    stakingRewardsVault,
    user: accounts.userPubkey,
    systemProgram: web3.SystemProgram.programId,
    rent: web3.SYSVAR_RENT_PUBKEY,
  };

  instructions.push(
    await program.methods
      .unsubOrHarvestWeeksEnhanced(subAndUnsubArgs)
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
