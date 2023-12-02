import { MAX_ACCOUNTS_IN_FAST_TRACK } from '../../../constants';
import { getAssetProof } from '../../../helpers';
import { InstructionsAndSigners } from '../../../types';
import { TxnsAndSigners } from '../../../utils/signAndSendAllTransactionsInSequence';
import { signAndSendV0TransactionWithLookupTablesSeparateSignatures } from '../../../utils/signAndSendV0TransactionWithLookupTablesSeparateSignatures';
import { makeCreateBondMultiOrdersTransaction } from './makeCreateBondMultiOrdersTransaction';
import { makeCreateBondMultiOrdersTransactionCnft } from './makeCreateBondMultiOrdersTransactionCnft';

export const borrowCnft = async ({
  notBondTxns,
  orders: bondOrders,
  connection,
  wallet,
  onAfterSend,
  onError,
  onSuccess,
  isLedger,
  skipPreflight,
  isTest,
  maxAccountsInCnft,
}): Promise<boolean> => {
  const bondTransactionsAndSignersChunks = await Promise.all(
    bondOrders.map((order) => {
      if (order.cnftParams) {
        return makeCreateBondMultiOrdersTransactionCnft({
          marketPubkey: order.borrowNft.bondParams.marketPubkey,
          fraktMarketPubkey: order.borrowNft.bondParams.whitelistEntry.fraktMarket,
          oracleFloorPubkey: order.borrowNft.bondParams.oracleFloor,
          whitelistEntryPubkey: order.borrowNft.bondParams.whitelistEntry?.publicKey,
          nftMint: order.borrowNft.mint,
          bondOrderParams: order.bondOrderParams,
          banxStake: order.borrowNft.banxStake,
          connection,
          wallet,
          isTest,
          treePubkey: order.borrowNft.bondParams.whitelistEntry.whitelistedAddress,
          cnftParams: order.cnftParams,
        });
      } else
        return makeCreateBondMultiOrdersTransaction({
          marketPubkey: order.borrowNft.bondParams.marketPubkey,
          fraktMarketPubkey: order.borrowNft.bondParams.whitelistEntry.fraktMarket,
          oracleFloorPubkey: order.borrowNft.bondParams.oracleFloor,
          whitelistEntryPubkey: order.borrowNft.bondParams.whitelistEntry?.publicKey,
          nftMint: order.borrowNft.mint,
          bondOrderParams: order.bondOrderParams,
          banxStake: order.borrowNft.banxStake,
          connection,
          wallet,
          isTest,
        });
    }),
  );

  const fastTrackBorrows: InstructionsAndSigners[] = bondTransactionsAndSignersChunks
    .filter(
      (txnAndSigners) =>
        txnAndSigners.createAndSellBondsIxsAndSigners.lookupTablePublicKeys.map((lookup) => lookup.addresses).flat()
          .length <= maxAccountsInCnft,
    )
    .map((txnAndSigners) => txnAndSigners.createAndSellBondsIxsAndSigners);
  const lookupTableBorrows = bondTransactionsAndSignersChunks.filter(
    (txnAndSigners) =>
      txnAndSigners.createAndSellBondsIxsAndSigners.lookupTablePublicKeys.map((lookup) => lookup.addresses).flat()
        .length > maxAccountsInCnft,
  );

  const firstChunk: TxnsAndSigners[] = [
    ...lookupTableBorrows
      .map((chunk) => ({
        transaction: chunk.createLookupTableTxn,
        signers: [],
      }))
      .flat(),
  ];

  const secondChunk: TxnsAndSigners[] = [
    ...lookupTableBorrows
      .map((chunk) =>
        chunk.extendLookupTableTxns.map((transaction) => ({
          transaction,
          signers: [],
        })),
      )
      .flat(),
  ];

  const createAndSellBondsIxsAndSignersChunk: InstructionsAndSigners[] = [
    ...lookupTableBorrows.map((chunk) => chunk.createAndSellBondsIxsAndSigners).flat(),
  ];

  return await signAndSendV0TransactionWithLookupTablesSeparateSignatures({
    notBondTxns,
    createLookupTableTxns: firstChunk.map((txn) => txn.transaction),
    extendLookupTableTxns: secondChunk.map((txn) => txn.transaction),
    v0InstructionsAndSigners: createAndSellBondsIxsAndSignersChunk,
    fastTrackInstructionsAndSigners: fastTrackBorrows,
    // lookupTablePublicKey: bondTransactionsAndSignersChunks,
    isLedger,
    skipPreflight,
    skipTimeout: fastTrackBorrows.length > 0 && firstChunk.length === 0,

    connection,
    wallet,
    commitment: 'confirmed',
    onAfterSend,
    onSuccess,
    onError,
  });
};
