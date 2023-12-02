import { web3, BN } from '@project-serum/anchor';

import { returnAnchorProgram } from '../../../helpers';
import {
  ENCODER,
  PERPETUAL_SPONSOR_VAULT,
} from '../../../constants';

type TransferToSponsorVault = (params: {
  programId: web3.PublicKey;
  connection: web3.Connection;

  args: {
    solToTransfer: number
  };
  accounts: {
    userPubkey: web3.PublicKey;
  };

  sendTxn: (transaction: web3.Transaction, signers: web3.Signer[]) => Promise<void>;
}) => Promise<{ account: web3.PublicKey; instructions: web3.TransactionInstruction[]; signers: web3.Signer[] }>;

export const transferToSponsorVault: TransferToSponsorVault = async ({ programId, connection, accounts, args, sendTxn }) => {
  const program = returnAnchorProgram(programId, connection);
  const instructions: web3.TransactionInstruction[] = [];
  const [sponsorVault, sponsorVaultBump] = await web3.PublicKey.findProgramAddress(
    [ENCODER.encode(PERPETUAL_SPONSOR_VAULT),],
    program.programId,
  );

  instructions.push(
    await program.methods
      .transferToSponsorVault(
        new BN(args.solToTransfer),
      )
      .accountsStrict({
        user: accounts.userPubkey,
        systemProgram: web3.SystemProgram.programId,
        rent: web3.SYSVAR_RENT_PUBKEY,
        sponsorVault: sponsorVault,
      })
      .instruction(),
  );

  const transaction = new web3.Transaction();
  for (let instruction of instructions) transaction.add(instruction);

  const signers = [];
  await sendTxn(transaction, signers);
  return { account: sponsorVault, instructions, signers };
};
