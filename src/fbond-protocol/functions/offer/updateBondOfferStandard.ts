import { BN, web3 } from '@project-serum/anchor';
import { returnAnchorProgram } from '../../helpers';

type UpdateBondOfferStandard = (params: {
  programId: web3.PublicKey;
  connection: web3.Connection;

  args: {
    delta: number;
    spotPrice: number;
    bidCap: number;
    loanToValueFilter: number;
    maxDurationFilter: number;
    maxReturnAmountFilter: number;
  };

  accounts: {
    bondOfferV2: web3.PublicKey;
    userPubkey: web3.PublicKey;
  };

  sendTxn: (transaction: web3.Transaction, signers: web3.Signer[]) => Promise<void>;
}) => Promise<{
  instructions: web3.TransactionInstruction[];
  signers: web3.Signer[];
}>;

export const updateBondOfferStandard: UpdateBondOfferStandard = async ({
  programId,
  connection,
  args,
  accounts,
  sendTxn,
}) => {
  const program = returnAnchorProgram(programId, connection);
  const instructions: web3.TransactionInstruction[] = [];
  // const bondOfferV2 = web3.Keypair.generate();

  instructions.push(
    await program.methods
      .updateBondOfferStandard(new BN(args.loanToValueFilter), new BN(args.maxReturnAmountFilter))
      .accountsStrict({
        bondOfferV2: accounts.bondOfferV2,

        user: accounts.userPubkey,

        systemProgram: web3.SystemProgram.programId,
        rent: web3.SYSVAR_RENT_PUBKEY,
      })
      .instruction(),
  );

  const transaction = new web3.Transaction();
  for (let instruction of instructions) transaction.add(instruction);

  const signers = [];
  await sendTxn(transaction, signers);
  return { instructions, signers };
};
