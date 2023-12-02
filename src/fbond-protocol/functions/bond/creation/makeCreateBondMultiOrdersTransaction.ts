import {
  BONDS_ADMIN_PUBKEY,
  BONDS_PROGRAM_PUBKEY,
  PRECISION_CORRECTION_LAMPORTS,
  PUBKEY_PLACEHOLDER,
} from '../../../constants';
import { BondCartOrder, InstructionsAndSigners } from '../../../types';
import { createBondAndSellToOffers } from './createBondAndSellToOffers';
import { sellStakedBanxToOffers } from './sellStakedBanxToOffers';
import { web3 } from '@project-serum/anchor';
import { chunk, uniqBy } from 'lodash';
import { groupBy } from 'lodash';

export const sendTxnPlaceHolder = async (): Promise<void> => await Promise.resolve();

type MergeBondOrderParamsByPair = (props: { bondOrderParams: BondCartOrder[] }) => BondCartOrder[];

export const mergeBondOrderParamsByPair: MergeBondOrderParamsByPair = ({ bondOrderParams }) => {
  const groupedPairOrderParams = Object.values(groupBy(bondOrderParams, (orderParam) => orderParam.pairPubkey));

  const mergedPairsOrderParams = groupedPairOrderParams.map((orderParams: any) =>
    orderParams.reduce((acc, orderParam) => ({
      ...acc,
      orderSize: acc.orderSize + orderParam.orderSize,
      spotPrice:
        (acc.orderSize * acc.spotPrice + orderParam.orderSize * orderParam.spotPrice) /
        (acc.orderSize + orderParam.orderSize),
    })),
  );

  return mergedPairsOrderParams;
};

type MakeCreateBondMultiOrdersTransaction = (params: {
  marketPubkey: string;
  fraktMarketPubkey: string;
  oracleFloorPubkey: string;
  whitelistEntryPubkey: string;
  // bondOrder: BondOrder;
  bondOrderParams: BondCartOrder[];
  nftMint: string;
  banxStake?: string;

  connection: web3.Connection;
  wallet: any;
  isTest?: boolean;
}) => Promise<{
  createLookupTableTxn: web3.Transaction;
  extendLookupTableTxns: web3.Transaction[];
  createAndSellBondsIxsAndSigners: InstructionsAndSigners;
}>;

export const makeCreateBondMultiOrdersTransaction: MakeCreateBondMultiOrdersTransaction = async ({
  marketPubkey,
  fraktMarketPubkey,
  oracleFloorPubkey,
  whitelistEntryPubkey,
  bondOrderParams,
  nftMint,
  banxStake,
  connection,

  wallet,

  isTest,
}) => {
  // const {
  //   fbond: bondPubkey,
  //   collateralBox: collateralBoxPubkey,
  //   fbondTokenMint: bondTokenMint,
  //   instructions: createBondIxns,
  //   signers: createBondSigners,
  //   addressesForLookupTable,
  // } = await fbondFactory.createBondWithSingleCollateralPnft({
  //   accounts: {
  //     tokenMint: new PublicKey(nftMint),
  //     userPubkey: wallet.publicKey,
  //   },
  //   args: {
  //     amountToDeposit: 1,
  //     amountToReturn: amountToReturn,
  //     bondDuration: durationFilter,
  //   },
  //   connection,
  //   programId: BONDS_PROGRAM_PUBKEY,
  //   sendTxn: sendTxnPlaceHolder,
  // });

  const mergedPairsOrderParams = mergeBondOrderParamsByPair({
    bondOrderParams,
  });

  const sellBondParamsAndAccounts = mergedPairsOrderParams
    .filter((orderParam) => orderParam.orderSize > 0)
    .map((orderParam) => ({
      minAmountToGet: Math.max(
        Math.floor(
          orderParam.orderSize * orderParam.spotPrice -
            PRECISION_CORRECTION_LAMPORTS -
            Math.floor(Math.random() * 10000),
        ),
        0,
      ),
      amountToSell: Math.floor(orderParam.orderSize),
      bondOfferV2: new web3.PublicKey(orderParam.pairPubkey),
      assetReceiver: new web3.PublicKey(orderParam.assetReceiver),
    }))
    .filter((sellBondParam) => sellBondParam.amountToSell > 0);
  console.log('sellBondParamsAndAccounts: ', sellBondParamsAndAccounts);

  const sellingBondsIxsAndSignersWithLookupAccounts = !banxStake
    ? await createBondAndSellToOffers({
        accounts: {
          tokenMint: new web3.PublicKey(nftMint),
          fraktMarket: new web3.PublicKey(fraktMarketPubkey),
          oracleFloor: new web3.PublicKey(oracleFloorPubkey || PUBKEY_PLACEHOLDER),
          whitelistEntry: new web3.PublicKey(whitelistEntryPubkey || PUBKEY_PLACEHOLDER),
          hadoMarket: new web3.PublicKey(marketPubkey),
          userPubkey: wallet.publicKey,
          protocolFeeReceiver: new web3.PublicKey(BONDS_ADMIN_PUBKEY || PUBKEY_PLACEHOLDER),
        },
        addComputeUnits: true,
        args: {
          sellBondParamsAndAccounts,
        },
        connection,
        programId: new web3.PublicKey(BONDS_PROGRAM_PUBKEY),
        sendTxn: sendTxnPlaceHolder,
      })
    : await sellStakedBanxToOffers({
        accounts: {
          banxStake: new web3.PublicKey(banxStake),
          tokenMint: new web3.PublicKey(nftMint),
          fraktMarket: new web3.PublicKey(fraktMarketPubkey),
          oracleFloor: new web3.PublicKey(oracleFloorPubkey || PUBKEY_PLACEHOLDER),
          whitelistEntry: new web3.PublicKey(whitelistEntryPubkey || PUBKEY_PLACEHOLDER),
          hadoMarket: new web3.PublicKey(marketPubkey),
          userPubkey: wallet.publicKey,
          protocolFeeReceiver: new web3.PublicKey(BONDS_ADMIN_PUBKEY || PUBKEY_PLACEHOLDER),
        },
        addComputeUnits: true,
        args: {
          sellBondParamsAndAccounts,
        },
        connection,
        programId: new web3.PublicKey(BONDS_PROGRAM_PUBKEY),
        sendTxn: sendTxnPlaceHolder,
      });
  const slot = await connection.getSlot();

  console.log('INITIAL PASSED SLOT: ', slot);
  const combinedAddressesForLookupTable = uniqBy(
    [
      // ...addressesForLookupTable,
      ...sellingBondsIxsAndSignersWithLookupAccounts.addressesForLookupTable,
    ],
    (publicKey) => publicKey.toBase58(),
  );
  console.log('combinedAddressesForLookupTable: ', combinedAddressesForLookupTable.length);
  const [lookupTableInst, lookupTableAddress] = web3.AddressLookupTableProgram.createLookupTable({
    authority: wallet.publicKey,
    payer: wallet.publicKey,
    recentSlot: slot - 2,
  });
  const extendInstructions = chunk(combinedAddressesForLookupTable, 20).map((chunkOfAddressesForLookupTable) =>
    web3.AddressLookupTableProgram.extendLookupTable({
      payer: wallet.publicKey,
      authority: wallet.publicKey,
      lookupTable: lookupTableAddress,
      addresses: chunkOfAddressesForLookupTable,
    }),
  );
  const createLookupTableTxn = new web3.Transaction().add(lookupTableInst, extendInstructions[0]);
  const restExtendInstructions = extendInstructions.slice(1, extendInstructions.length);

  const restExtendTransactions = restExtendInstructions.map((extendIx) => new web3.Transaction().add(extendIx));

  return {
    createLookupTableTxn: createLookupTableTxn,
    extendLookupTableTxns: restExtendTransactions,
    createAndSellBondsIxsAndSigners: {
      instructions: [
        // ...createBondIxns,
        ...sellingBondsIxsAndSignersWithLookupAccounts.instructions,
      ],
      signers: [
        // ...createBondSigners,
        ...sellingBondsIxsAndSignersWithLookupAccounts.signers,
      ],
      lookupTablePublicKeys: [
        {
          tablePubkey: lookupTableAddress,
          addresses: combinedAddressesForLookupTable,
        },
      ],
    },
  };
};
