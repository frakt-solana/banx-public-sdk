import { web3, BN } from '@project-serum/anchor';

import { returnAnchorProgram } from '../../../helpers';
import { ENCODER, HADOMARKET_REGISTRY_PREFIX, WHITELIST_ENTRY_PREFIX } from '../../../constants';

type UpdateInterestPerpetualMarket = (params: {
  programId: web3.PublicKey;
  connection: web3.Connection;

  args: {
    minMarketFee: number;
  };
  accounts: {
    userPubkey: web3.PublicKey;
    hadoMarket: web3.PublicKey;
  };

  sendTxn: (transaction: web3.Transaction, signers: web3.Signer[]) => Promise<void>;
}) => Promise<{ account: null; instructions: web3.TransactionInstruction[]; signers: web3.Signer[] }>;

export const updateInterestPerpetualMarket: UpdateInterestPerpetualMarket = async ({
  programId,
  connection,
  args,
  accounts,
  sendTxn,
}) => {
  const program = returnAnchorProgram(programId, connection);
  const instructions: web3.TransactionInstruction[] = [];

  instructions.push(
    await program.methods
      .updateInterestPerpetualMarket(new BN(args.minMarketFee))
      .accountsStrict({
        hadoMarket: accounts.hadoMarket,
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
  return { account: null, instructions, signers };
};
