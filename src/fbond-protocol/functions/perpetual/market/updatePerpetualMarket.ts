import { web3, BN } from '@project-serum/anchor';

import { returnAnchorProgram } from '../../../helpers';
import { ENCODER, HADOMARKET_REGISTRY_PREFIX, WHITELIST_ENTRY_PREFIX } from '../../../constants';

type UpdatePerpetualMarket = (params: {
  programId: web3.PublicKey;
  connection: web3.Connection;

  accounts: {
    userPubkey: web3.PublicKey;
    fraktMarket: web3.PublicKey;
    whitelistEntry: web3.PublicKey;
    hadoMarket: web3.PublicKey;
  };

  sendTxn: (transaction: web3.Transaction, signers: web3.Signer[]) => Promise<void>;
}) => Promise<{ account: null; instructions: web3.TransactionInstruction[]; signers: web3.Signer[] }>;

export const updatePerpetualMarket: UpdatePerpetualMarket = async ({ programId, connection, accounts, sendTxn }) => {
  const program = returnAnchorProgram(programId, connection);
  const instructions: web3.TransactionInstruction[] = [];
  const [hadoRegistry, registrySeed] = await web3.PublicKey.findProgramAddress(
    [ENCODER.encode(HADOMARKET_REGISTRY_PREFIX), accounts.hadoMarket.toBuffer()],
    program.programId,
  );

  instructions.push(
    await program.methods
      .updatePerpetualMarket()
      .accountsStrict({
        hadoMarket: accounts.hadoMarket,
        user: accounts.userPubkey,

        hadoRegistry: hadoRegistry,
        fraktMarket: accounts.fraktMarket,

        whitelistEntry: accounts.whitelistEntry,
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
