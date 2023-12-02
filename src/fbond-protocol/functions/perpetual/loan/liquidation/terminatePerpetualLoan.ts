import { BN, web3 } from '@project-serum/anchor';

import { returnAnchorProgram } from '../../../../helpers';
import { BondTradeTransactionV2State } from '../../../../types';
import { BondAndTransactionOptimistic, nowInSeconds } from '../../offer';

type TerminatePerpetualLoan = (params: {
  programId: web3.PublicKey;
  connection: web3.Connection;

  accounts: {
    bondTradeTransactionV2: web3.PublicKey;

    fbond: web3.PublicKey;

    userPubkey: web3.PublicKey;
  };
  optimistic: BondAndTransactionOptimistic;

  sendTxn: (transaction: web3.Transaction, signers: web3.Signer[]) => Promise<void>;
}) => Promise<{
  account: null;
  instructions: web3.TransactionInstruction[];
  signers: web3.Signer[];
  optimisticResult: BondAndTransactionOptimistic;
}>;

export const terminatePerpetualLoan: TerminatePerpetualLoan = async ({
  programId,
  connection,
  accounts,
  optimistic,
  sendTxn,
}) => {
  const program = returnAnchorProgram(programId, connection);
  const instructions: web3.TransactionInstruction[] = [];

  instructions.push(
    await program.methods
      .terminatePerpetualLoan()
      .accountsStrict({
        fbond: accounts.fbond,
        bondTradeTransactionV2: accounts.bondTradeTransactionV2,

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

  const optimisticResult: BondAndTransactionOptimistic = {
    bondTradeTransaction: {
      ...optimistic.bondTradeTransaction,
      bondTradeTransactionState: BondTradeTransactionV2State.PerpetualManualTerminating,
      redeemedAt: nowInSeconds(),
    },
    fraktBond: {
      ...optimistic.fraktBond,
      refinanceAuctionStartedAt: nowInSeconds(),
      lastTransactedAt: nowInSeconds(),
    },
  };
  return { account: null, instructions, signers, optimisticResult };
};
