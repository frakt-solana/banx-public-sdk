import { LOOKUP_TABLE } from '../constants';
import { web3 } from '@project-serum/anchor';
import { chunk } from 'lodash';

const STANDART_LOOKUP_TABLE = new web3.PublicKey(LOOKUP_TABLE);

export interface EnhancedInstructionsAndSigners {
  instructions: web3.TransactionInstruction[];
  signers?: web3.Signer[];
}

type SignAndSendEnhancedTxns = (props: {
  fastTrackInstructionsAndSigners: EnhancedInstructionsAndSigners[];

  connection: web3.Connection;
  wallet: any;

  split?: number;

  skipPreflight?: boolean;
  commitment?: web3.Commitment;
  onBeforeApprove?: () => void;
  onAfterSend?: () => void;
  onSuccess?: () => void;
  onError?: (error: any) => void;
}) => Promise<boolean>;

//? Sequence means that transactions will be signed at once, but will be sent in a sequence by chunks.
//? F.e. txnsAndSigners: [[x, x, x], [y, y, y], [z, z, z]]. Sign all txns at once. But first send [x, x, x], wait for confirmation, send [y, y, y] wait for confirmation, send [z, z, z]
//? It needs when transactions from next chunk are related to transactions from previos chunk
export const signAndSendEnhancedTxns: SignAndSendEnhancedTxns = async ({
  fastTrackInstructionsAndSigners,
  connection,
  wallet,

  split,

  skipPreflight,

  commitment = 'confirmed',
  onBeforeApprove,
  onAfterSend,
  onSuccess,
  onError,
}) => {
  try {
    if (split) {
      const txnsInChunk = split;

      for (const txnsAndSigners of chunk(fastTrackInstructionsAndSigners, txnsInChunk)) {
        await signAndSendEnhancedTxns({
          fastTrackInstructionsAndSigners: [...txnsAndSigners],

          connection,
          wallet,
          commitment,
          onAfterSend,
          onSuccess,
          onError,
        });
      }

      return true;
    }

    const { blockhash: blockhashFirst } = await connection.getLatestBlockhash();
    const fastTrackV0Transactions = await Promise.all(
      fastTrackInstructionsAndSigners.map(async (ixAndSigner) => {
        console.log('STANDART_LOOKUP_TABLE: ', STANDART_LOOKUP_TABLE.toBase58());
        const lookupTable = (await connection.getAddressLookupTable(STANDART_LOOKUP_TABLE))
          .value as web3.AddressLookupTableAccount;

        const transactionsMessageV0 = new web3.VersionedTransaction(
          new web3.TransactionMessage({
            payerKey: wallet.publicKey,
            recentBlockhash: blockhashFirst,
            instructions: ixAndSigner.instructions,
          }).compileToV0Message([lookupTable]),
        );

        transactionsMessageV0.sign([...(ixAndSigner.signers || [])]);

        return transactionsMessageV0;
      }),
    );

    onBeforeApprove?.();

    const transactionsFlatArrLookupTables = [...fastTrackV0Transactions];

    const signedTransactionsLookupTables = await wallet.signAllTransactions([...transactionsFlatArrLookupTables]);

    // const txnsAndSignersWithV0Txns = [
    //   ...txnsAndSigners,
    //   // v0MainAndCloseTableTxns,
    // ];

    const txnsAndSignersWithFastTrack = [fastTrackV0Transactions];
    let currentTxIndexLookupTable = 0;
    for (let i = 0; i < txnsAndSignersWithFastTrack.length; i++) {
      for (let r = 0; r < txnsAndSignersWithFastTrack[i].length; r++) {
        if (txnsAndSignersWithFastTrack[i].length === 0) continue;

        console.log('currentTxIndexLookupTable: ', currentTxIndexLookupTable);
        const txn = signedTransactionsLookupTables[currentTxIndexLookupTable];
        // lastSlot = await connection.getSlot();
        const tx = await connection.sendRawTransaction(txn.serialize(), {
          skipPreflight: !!skipPreflight,
          preflightCommitment: 'processed',
        });
        currentTxIndexLookupTable += 1;
        // console.log("MinContextSlot: ", txn.minNonceContextSlot)
      }
    }

    onAfterSend?.();

    onSuccess?.();

    return true;
  } catch (error) {
    onError?.(error);
    return false;
  }
};
