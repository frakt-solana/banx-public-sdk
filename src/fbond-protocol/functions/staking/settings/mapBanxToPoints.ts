import { BN, web3 } from '@project-serum/anchor';
import { ASSOCIATED_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@project-serum/anchor/dist/cjs/utils/token';
import { findAssociatedTokenAddress } from '../../../../common';
import { BANX_POINTS_MAP_PREFIX, ENCODER, STAKING_SETTINGS_PREFIX } from '../../../constants';
import { returnAnchorProgram } from '../../../helpers';

type MapBanxToPoints = (params: {
  programId: web3.PublicKey;
  connection: web3.Connection;

  addComputeUnits?: boolean;

  args: {
    playerPoints: number;
    partnerPoints: number;
  };
  accounts: {
    userPubkey: web3.PublicKey;
    nftMint: web3.PublicKey;
  };

  sendTxn: (transaction: web3.Transaction, signers: web3.Signer[]) => Promise<void>;
}) => Promise<{
  instructions: web3.TransactionInstruction[];
  signers: web3.Signer[];
  addressesForLookupTable: web3.PublicKey[];
}>;

export const mapBanxToPoints: MapBanxToPoints = async ({
  programId,
  connection,
  addComputeUnits,
  accounts,
  args,
  sendTxn,
}) => {
  const program = returnAnchorProgram(programId, connection);
  const instructions: web3.TransactionInstruction[] = [];

  const [banxPointsMap] = await web3.PublicKey.findProgramAddress(
    [ENCODER.encode(BANX_POINTS_MAP_PREFIX), accounts.nftMint.toBuffer()],
    program.programId,
  );

  const modifyComputeUnits = web3.ComputeBudgetProgram.setComputeUnitLimit({
    units: Math.round(800000 + Math.ceil(Math.random() * 10000)),
  });
  const requestHeap = web3.ComputeBudgetProgram.requestHeapFrame({ bytes: 1024 * 250 });
  instructions.push(requestHeap);

  if (!!addComputeUnits) instructions.push(modifyComputeUnits);

  const accountsIntoInstruction = {
    banxPointsMap,
    user: accounts.userPubkey,
    tokenMint: accounts.nftMint,
    systemProgram: web3.SystemProgram.programId,
    rent: web3.SYSVAR_RENT_PUBKEY,
  };

  instructions.push(
    await program.methods
      .mapBanxToPoints(new BN(args.playerPoints), new BN(args.partnerPoints))
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
