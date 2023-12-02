import { BN, web3 } from '@project-serum/anchor';
import { ASSOCIATED_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@project-serum/anchor/dist/cjs/utils/token';
import { findAssociatedTokenAddress } from '../../../../common';
import { BANX_POINTS_MAP_PREFIX, ENCODER, STAKING_SETTINGS_PREFIX } from '../../../constants';
import { returnAnchorProgram } from '../../../helpers';

type PatchBrokenUserStakes = (params: {
  programId: web3.PublicKey;
  connection: web3.Connection;

  addComputeUnits?: boolean;

  args: {
    playerPoints: number;
    partnerPoints: number;
  };
  accounts: {
    userPubkey: web3.PublicKey;
    banxUser: web3.PublicKey;
  };

  sendTxn: (transaction: web3.Transaction, signers: web3.Signer[]) => Promise<void>;
}) => Promise<{
  instructions: web3.TransactionInstruction[];
  signers: web3.Signer[];
  addressesForLookupTable: web3.PublicKey[];
}>;

export const patchBrokenUserStakes: PatchBrokenUserStakes = async ({
  programId,
  connection,
  addComputeUnits,
  accounts,
  args,
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

  const accountsIntoInstruction = {
    banxUser: accounts.banxUser,
    user: accounts.userPubkey,
    systemProgram: web3.SystemProgram.programId,
    rent: web3.SYSVAR_RENT_PUBKEY,
  };

  instructions.push(
    await program.methods
      .patchBrokenUserStakes(new BN(args.playerPoints), new BN(args.partnerPoints))
      .accountsStrict(accountsIntoInstruction)
      .instruction(),
  );
  const addressesForLookupTable = [...Object.values(accountsIntoInstruction)];

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
