import { web3 } from '@project-serum/anchor';

export interface IxnsData {
  instructions: web3.TransactionInstruction[];
  signers: web3.Signer[];
}

interface TxnData {
  transaction: web3.Transaction;
  signers: web3.Signer[];
}

export const mergeIxsIntoTxn = (ixs: IxnsData[]): TxnData => {
  const transaction = new web3.Transaction();

  transaction.add(...ixs.map(({ instructions }) => instructions).flat());

  const signers = ixs.map(({ signers }) => signers).flat();

  return {
    transaction,
    signers,
  };
};
