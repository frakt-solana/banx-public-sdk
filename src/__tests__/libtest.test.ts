import { findAssociatedTokenAddress } from '../common';
import {
  ADVENTURE_PREFIX,
  BOND_OFFER_VAULT_PREFIX,
  EMPTY_PUBKEY,
  ENCODER,
  MUTUAL_BOND_TRADE_TXN_VAULT,
  SPL_NOOP_PROGRAM_ID,
} from '../fbond-protocol/constants';
import {
  getAllHadespinProgramAccounts,
  getPerpetualActiveAccounts,
  getSpecificAccounts,
  getSpecificAccountsByKeys,
} from '../fbond-protocol/functions/getters';
import {
  deleteUserRound,
  getAllRounds,
  getAllUserRounds,
  getMockRound,
  getRoundSettings,
  initializeRoundSettings,
  joinRound,
} from '../fbond-protocol/functions/hadespin';
import {
  boundHadoMarketToFraktMarket,
  finishHadoMarket,
  initializeHadoMarket,
  updateHadoMarketFee,
} from '../fbond-protocol/functions/hadoMarket';
import {
  borrowPerpetual,
  calculateCurrentInterestSolPure,
  calculateNextSpotPrice,
  claimPerpetualLoanTest,
  createPerpetualBondOffer,
  makePerpetualMarket,
  nowInSeconds,
  optimisticUpdateBondOfferBonding,
  removePerpetualOffer,
  repayPerpetualLoan,
  updateInterestPerpetualMarket,
  updatePerpetualMarket,
  updatePerpetualOffer,
} from '../fbond-protocol/functions/perpetual';
import { weeksToAdventureTimestamp } from '../fbond-protocol/functions/staking/helpers';
import {
  mapBanxToPoints,
  patchBrokenUserStakes,
  topSubscription,
  updateStakingSettings,
} from '../fbond-protocol/functions/staking/settings';
import { findTokenRecordPda, getSumOfOrdersSeries } from '../fbond-protocol/helpers';
import {
  BanxPointsMap,
  BanxStakeState,
  BondFeatures,
  BondTradeTransactionV2State,
  BondingCurveType,
  FraktBondState,
  MarketState,
  OrderType,
  PairState,
} from '../fbond-protocol/types';
import { getBondEventsBySignatures, getTradeActivities } from '../fbond-protocol/utils';
import { getTopOrderSize } from '../fbond-protocol/utils/cartManagerV2';
import { getTransferAmountFromInnerInstructions } from '../fbond-protocol/utils/getTradeActivities';
import { BN, anchor, fbonds, frakt_market_registry, web3 } from './../index';
import { Metaplex, keypairIdentity } from '@metaplex-foundation/js';
import { Metadata, TokenRecord, TokenStandard } from '@metaplex-foundation/mpl-token-metadata';
import { TOKEN_PROGRAM_ID } from '@project-serum/anchor/dist/cjs/utils/token';
import { AccountLayout } from '@solana/spl-token';
import { PublicKey, Transaction } from '@solana/web3.js';
import { readFileSync, writeFileSync } from 'fs';
import keccak256 from 'keccak256';
import { chunk, groupBy, uniqBy } from 'lodash';
import { MerkleTree } from 'merkletreejs';

// @ts-ignore
jest.setTimeout(1000000000);

const mainnetConnection = new anchor.web3.Connection(
  'https://mainnet.helius-rpc.com/?api-key=0dd0537a-65dd-4d40-a7d5-97804e3caa7e',
  'confirmed',
);

// import fetch from 'node-fetch';
const fetch = require('node-fetch');
// import { Bonds, IDL } from '/../idl/bonds';

const devnetConnection =
  // mainnetConnection;
  new anchor.web3.Connection('https://api.devnet.solana.com', 'confirmed');

const CROSS_TOKEN_AMM_DEVNET = new anchor.web3.PublicKey('AFnufgr188AiEMFji3D5GkB8vNyZybxC8PfcuD1wrfwA');

const FBONDS_DEVNET = new anchor.web3.PublicKey('4tdmkuY6EStxbS6Y8s5ueznL3VPMSugrvQuDeAHGZhSt');
const BONDS_VALIDATION_ADAPTER_DEVNET = new anchor.web3.PublicKey('41eQiufrrjD5WXR7A39qsmQACYgHpNEdAUsaCmuhT439');
const FRAKT_MARKET_REGISTRY_DEVNET = new anchor.web3.PublicKey('regNrR9XpXkg6VCZXEyTwCGVETwKpZMtQxYx3zResJh');

const FRAKT_MARKET_REGISTRY_MAINNET = new anchor.web3.PublicKey('regNrR9XpXkg6VCZXEyTwCGVETwKpZMtQxYx3zResJh');
const CROSS_TOKEN_AMM_MAINNET = new anchor.web3.PublicKey('AFnufgr188AiEMFji3D5GkB8vNyZybxC8PfcuD1wrfwA');
const FBONDS_MAINNET = new anchor.web3.PublicKey('4tdmkuY6EStxbS6Y8s5ueznL3VPMSugrvQuDeAHGZhSt');
const BONDS_VALIDATION_ADAPTER_MAINNET = new anchor.web3.PublicKey('41eQiufrrjD5WXR7A39qsmQACYgHpNEdAUsaCmuhT439');
// 6wPYbuGRXZjVw2tCeTxwRiQU7AzFDTeFEKuUFpJZpcix
// @ts-ignore
test('Examples', async () => {
  // void await getStakedStats()
  // void (await initializeHadoMarketScript());
  // void (await getAllProgramAccountsScript());

  // void (await calculateLeaderboardPoints());

  // void await closeAdventuresScript()
  // void (await deleteUserRoundScript());
  // void (await fixBrokenBanxStakeScript());
  // void (await makeHadespinRoundSettings());
  // void (await joinHadespinRoundScript());
  // void (await getAllHadespinProgramAccountsScript());

  // void (await fixClaimbyAdminScript());

  // void (await migrateOldToBondingOffer());
  // void (await whitelistDiff());
  // const encoded = await program.account.bondOfferV2.coder.types.encode(program.account.bondOfferV2, bondOffer);
  // console.log('encoded: ', encoded);
  // testPerpetualInterest();
  // console.log("check interest: ")
  // const [mutualBondTradeTxnVault] = await web3.PublicKey.findProgramAddress(
  //   [ENCODER.encode(MUTUAL_BOND_TRADE_TXN_VAULT)],
  //   FBONDS_MAINNET,
  // );
  // console.log('mutualBondTradeTxnVault: ', mutualBondTradeTxnVault);
  // await getHeliusNftsTest();

  // const stats = JSON.parse(
  //   await lazyFs().readFile(__dirname + '/frakt_nfts.json', { encoding: 'utf8' }),
  // );
  // void (await changePerpetualMarketScript());
  // void (await changePerpetualMarketInterestScript());
  // void (await makePerpetualMarketScript());
  // void (await makePerpetualOfferScript());
  // void (await updatePerpetualOfferScript());
  // void (await getFilteredTransactions());
  // void (await migrateAllHadoMarketScript());
  // const offers = [
  //   {
  //     hadoMarket: '9mCw8UDAV1w3UcrASDisGF4y3QZxAQXMRtYCJVQNiTsn',
  //     pairState: PairState.PerpetualOnMarket,
  //     bondingCurve: { delta: 0, bondingType: BondingCurveType.Linear },
  //     baseSpotPrice: 1000000000,
  //     mathCounter: 0,
  //     currentSpotPrice: 500000000,
  //     concentrationIndex: 0,
  //     bidCap: 100000000000000,
  //     bidSettlement: -99999000000000,
  //     edgeSettlement: 1000000000,
  //     fundsSolOrTokenBalance: 3000000000,
  //     buyOrdersQuantity: 1,
  //     lastTransactedAt: 1692149055,
  //     assetReceiver: '6CnQUFVk2d8TRvQa2Lr7KDvx9zK12Q4jkA7mmDtzj71e',
  //     validation: {
  //       loanToValueFilter: 0,
  //       durationFilter: 604800,
  //       maxReturnAmountFilter: 0,
  //       bondFeatures: BondFeatures.AutoReceiveAndReceiveNft,
  //     },
  //     publicKey: '5mxSZxG9JSwWG9bf3rVG2jC4GyDqemdF9gKQM4AKSpGw',
  //   },
  //   {
  //     hadoMarket: '9mCw8UDAV1w3UcrASDisGF4y3QZxAQXMRtYCJVQNiTsn',
  //     pairState: PairState.PerpetualOnMarket,
  //     bondingCurve: { delta: 0, bondingType: BondingCurveType.Linear },
  //     baseSpotPrice: 1000000000,
  //     mathCounter: 0,
  //     currentSpotPrice: 1000000000,
  //     concentrationIndex: 0,
  //     bidCap: 100000000000000,
  //     bidSettlement: -99999000000000,
  //     edgeSettlement: 1000000000,
  //     fundsSolOrTokenBalance: 3000000000,
  //     buyOrdersQuantity: 1,
  //     lastTransactedAt: 1692149055,
  //     assetReceiver: '6CnQUFVk2d8TRvQa2Lr7KDvx9zK12Q4jkA7mmDtzj71e',
  //     validation: {
  //       loanToValueFilter: 0,
  //       durationFilter: 604800,
  //       maxReturnAmountFilter: 0,
  //       bondFeatures: BondFeatures.AutoReceiveAndReceiveNft,
  //     },
  //     publicKey: '5mxSZxG9JSwWG9bf3rVG2jC4GyDqemdF9gKQM4AKSpGw',
  //   },
  // ];
  // const topOffer =
  //   maxBy(
  //     offers.map((offer) => getPerpetualOfferSize(offer)),
  //     (size) => size,
  //   ) || 0;
  // const topOffer2 = offers
  //   .map((offer) => getPerpetualOfferSize(offer))
  //   .reduce((acc, offerAmount) => Math.max(acc, offerAmount), 0);
  // // maxBy(
  // //   offers.map((offer) => getPerpetualOfferSize(offer)),
  // //   (size) => size,
  // // ) || 0;
  // // max(offers.map((offer) => getPerpetualOfferSize(offer)), ) || 0;
  // console.log({ topOffer2 });
  // void (await removePerpetualOfferScript());
  // void (await borrowPerpetialScript());
  // void (await repayPerpetualScript());
  // void (await repayPerpetualScript());
  // void (await takeStakingSnapshot());
  // void (await extendLookupTableScript());
  // void (await individualFillBanxPoints());
  // void (await fixUserStakesScript());
  // void (await extendLookupTableScript());
  // await updateHadomarketFeeScript();
  // void (await patchBrokenEscrowBoxes());
  // void await getFraktGnomiesStats()
  // let cycle = 0;
  // while (true) {
  //   console.log('cycle: ', cycle++, 'updating onchain banx every 15 minutes...');
  //   try {
  // await fillBanxPoints();
  //   } catch (error) {
  //     console.log(error);
  //   }
  //   console.log('cycle: ', cycle, ' after 15 minutes... ');
  //   await delay(1000 * 60 * 30);
  // }
  // await AddBanxToFIll();
  // await setStakingSettings();
  // void (await fixAllClaims());
  // await patchBondOfferBidCaps();
  // void (await migratePairsToBondOffersScript());
  // void (await addFraktMarketToBonds());
  // await addCollectionIdToFraktsAndGnomies();
  // console.log('key: ');
  // void (await addNewCreatorToDesolates());
  // void (await createLookupTableScript());
  // await getMintsWithPagination();
  // await findLost2Banx();
  await getMintsByAssetsGroup();
  // await getAssetHelius();
  // void (await exampleFetchLookupTables());
  // void (await removeWhitelistFromMarketScript());
  // void (await exampleDepositReturnedSolToLiquidatingBond());
  // void (await exampleUpdateActualReturnAmount());
  // getMaxBorrowValueTest();
  // await exampleRedeemCollateral();
  // void (await boundFraktMarketToHadoMarketScript());
  // void (await addMerkleTreeWhitelistEntryToFraktMarketScript());
  // void (await addToWhitelistEntryToFraktMarketScript());
  // void (await exampleCreateBondValidation());
  // void (await activateFraktMarketScript());
  // void (await initializeOracleFloor());
  // void (await updateOracleFloorScript());
  // void (await exampleFinalizePair());
  // void (await exampleAddCollateralFbond());
  // void (await exampleInitializeFbond());
  // void (await addToWhitelistToMarketScript());
  // void (await finalizeHadoMarketScript());
  // void (await exampleActivateFbond());
  // void (await exampleInitializeBuyPair());
  // void (await exampleDepositSolToPair());
  // await initializeFraktMarketScript();
  // await exampleGetTradeActivities();
  // cartTest();
  // getBondLoansCombinationsTest();
  // getTopOrderSizeTest();
  // await CreateFullFraktMarketScript();
  // rolloutOrdersTest();
  // await updateFraktMetadata();
  // await updateGnomiesMetadata();
  // await fixGnomiesMetadata();
  // await getUsersTokenBalancesNew();
  // await getAllUserTokensModified();
  // await exampleGetBondActivities();
  // getBestOrdersForExitTest();
  // getBestOrdersForRefinanceTest();
});

const calculateLeaderboardPoints = async () => {
  const getLeaderboard = async () => {
    let dataAccumulation = [] as any;
    // let count = 0;
    // for(let skip = 0; skip < 900; skip++)
    for (let skip = 0; skip < 900; skip += 100) {
      console.log('skip: ', skip);
      const urlMeta = `https://api.banx.gg/leaderboard/6CnQUFVk2d8TRvQa2Lr7KDvx9zK12Q4jkA7mmDtzj71e?order=asc&skip=${skip}&limit=${100}&userType=lender&timeRangeType=all`;

      const response = await fetch(urlMeta, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      console.log('received: ', data.data.length);

      dataAccumulation = [...dataAccumulation, ...data.data];
    }
    // console.log('metadata: ', data);
    return dataAccumulation;
  };

  const leaderboard = await getLeaderboard();

  const pointsSum = leaderboard.reduce((acc, rank) => acc + rank.points, 0);
  console.log('pointsSum: ', pointsSum);
};

const recalculatingOffersForCollectionCart = (
  nfts: { loanValue: number; mint: '1' }[],
  offers: { currentSpotPrice: number },
) => {};

const getFraktGnomiesStats = async () => {
  const nfts = JSON.parse(await lazyFs().readFile(__dirname + '/frakt_nfts.json', { encoding: 'utf8' })).results;

  const withoutMigrated = nfts.filter((nft) => nft.ownership.owner !== 'bnxZZLyvcezhYxRzBwdw7duK9Q9DN26Jd9YZhizTnwg');
  console.log('withoutMigrated: ', withoutMigrated.length);
  const map = {};

  for (let nft of withoutMigrated) {
    const key = nft.ownership.owner;
    map[key] = map[key] ? map[key] + 1 : 1;
  }

  console.log(map);
};

async function getFilteredTransactions() {
  const connection = mainnetConnection;

  const LIMIT = 100;

  const currentLastSignatureInfo = (
    await connection.getConfirmedSignaturesForAddress2(
      FBONDS_MAINNET,
      {
        limit: 1,
      },
      'confirmed',
    )
  )[0];

  const allSignatures = await connection.getConfirmedSignaturesForAddress2(FBONDS_MAINNET, {
    limit: LIMIT,
    before: currentLastSignatureInfo.signature,
  });

  const borrowInstructionLogs = ['BorrowPerpetual', 'BorrowStakedBanxPerpetual', 'BorrowCnftPerpetual'];

  let filteredTransactions: web3.ParsedTransactionWithMeta[] = [];

  let count = 0;
  for (let signatureInfo of allSignatures) {
    console.log('parsing: ', count++);
    const txDetails: web3.ParsedTransactionWithMeta | null = await connection.getParsedTransaction(
      signatureInfo.signature,
      {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      },
    );

    if (txDetails && txDetails.meta?.logMessages) {
      const logs: string[] = txDetails.meta?.logMessages as string[];

      if (logs.find((log) => borrowInstructionLogs.find((borrowLog) => log.includes(borrowLog)))) {
        filteredTransactions.push(txDetails);
      }
    }
  }

  const totalVolume = filteredTransactions
    .map((tx) => getTransferAmountFromInnerInstructions((tx.meta?.innerInstructions as any)[0]))
    .reduce((acc, vol) => acc + vol);
  console.log('volumes: ', totalVolume);
}

const testPerpetualInterest = () => {
  const currentTime = nowInSeconds();
  const loanValue = 1e9;
  const startTime = currentTime - 86400 * 7;
  const rateApr = 10450;

  const interestSol = calculateCurrentInterestSolPure({
    loanValue,
    startTime,
    currentTime,
    rateBasePoints: rateApr,
  });
  console.log('interestSol: ', interestSol);
};

export enum SHAPE {
  WAVE = 'Wave',
  EYE = 'Eye',
  STAR = 'Star',
  PORTAL = 'Portal',
  NET = 'Net',
}

export enum COLOR {
  RAINBOW = 'Rainbow',
  MAGENTA = 'Magenta',
  RED = 'Red',
  ORANGE = 'Orange',
  WHITE = 'White',
}
const FRAKT_PARTNER_POINTS_MAPPING = {
  [COLOR.WHITE + SHAPE.NET]: 10,
  [COLOR.ORANGE + SHAPE.NET]: 13,
  [COLOR.WHITE + SHAPE.PORTAL]: 15,
  [COLOR.ORANGE + SHAPE.PORTAL]: 20,
  [COLOR.RED + SHAPE.NET]: 20,
  [COLOR.WHITE + SHAPE.STAR]: 22,
  [COLOR.ORANGE + SHAPE.STAR]: 29,
  [COLOR.RED + SHAPE.PORTAL]: 29,
  [COLOR.MAGENTA + SHAPE.NET]: 40,
  [COLOR.RED + SHAPE.STAR]: 44,
  [COLOR.MAGENTA + SHAPE.PORTAL]: 59,
  [COLOR.MAGENTA + SHAPE.STAR]: 88,
  [COLOR.WHITE + SHAPE.EYE]: 88,
  [COLOR.ORANGE + SHAPE.EYE]: 117,
  [COLOR.RED + SHAPE.EYE]: 176,
  [COLOR.MAGENTA + SHAPE.EYE]: 352,
  [COLOR.WHITE + SHAPE.WAVE]: 440,
  [COLOR.ORANGE + SHAPE.WAVE]: 587,
  [COLOR.RED + SHAPE.WAVE]: 880,
  [COLOR.RAINBOW + SHAPE.WAVE]: 1760,
};

const FRAKT_PLAYER_POINTS_MAPPING = {
  [COLOR.WHITE + SHAPE.NET]: 1,
  [COLOR.ORANGE + SHAPE.NET]: 1,
  [COLOR.WHITE + SHAPE.PORTAL]: 1,
  [COLOR.ORANGE + SHAPE.PORTAL]: 2,
  [COLOR.RED + SHAPE.NET]: 2,
  [COLOR.WHITE + SHAPE.STAR]: 2,
  [COLOR.ORANGE + SHAPE.STAR]: 2,
  [COLOR.RED + SHAPE.PORTAL]: 2,
  [COLOR.MAGENTA + SHAPE.NET]: 4,
  [COLOR.RED + SHAPE.STAR]: 4,
  [COLOR.MAGENTA + SHAPE.PORTAL]: 5,
  [COLOR.MAGENTA + SHAPE.STAR]: 8,
  [COLOR.WHITE + SHAPE.EYE]: 8,
  [COLOR.ORANGE + SHAPE.EYE]: 11,
  [COLOR.RED + SHAPE.EYE]: 17,
  [COLOR.MAGENTA + SHAPE.EYE]: 35,
  [COLOR.WHITE + SHAPE.WAVE]: 44,
  [COLOR.ORANGE + SHAPE.WAVE]: 58,
  [COLOR.RED + SHAPE.WAVE]: 88,
  [COLOR.RAINBOW + SHAPE.WAVE]: 176,
};

const getPlayerPointsFromFraktAttributes = (attributes: { trait_type: string; value: string }[]) => {
  const shapeAttribute: SHAPE = attributes.find((attribute) => attribute.trait_type === 'shape')?.value as any;
  const colorAttribute: COLOR = attributes.find((attribute) => attribute.trait_type === 'color')?.value as any;
  if (!shapeAttribute || !colorAttribute) throw Error('something is wrong with meta');

  return FRAKT_PLAYER_POINTS_MAPPING[colorAttribute + shapeAttribute];
};

const getPartnerPointsFromFraktAttributes = (attributes: { trait_type: string; value: string }[]) => {
  const shapeAttribute: SHAPE = attributes.find((attribute) => attribute.trait_type === 'shape')?.value as any;
  const colorAttribute: COLOR = attributes.find((attribute) => attribute.trait_type === 'color')?.value as any;
  if (!shapeAttribute || !colorAttribute) throw Error('something is wrong with meta');
  return FRAKT_PARTNER_POINTS_MAPPING[colorAttribute + shapeAttribute];
};

const PLAYER_POINTS = 'player points';
const PARTNER_POINTS = 'partner points';
// enum SHAPE_OLD {
// WAVE = 1,
//   EYE = 2,
//   STAR = 3,
//   PORTAL = 4,
//   NET = 5,
// }
const SHAPE_OLD = ['', SHAPE.WAVE, SHAPE.EYE, SHAPE.STAR, SHAPE.PORTAL, SHAPE.NET];

// enum COLOR_OLD {
//   MAGENTA = 1,
//   RED = 2,
//   ORANGE = 3,
//   WHITE = 4,
// }
const COLOR_OLD = ['', COLOR.MAGENTA, COLOR.RED, COLOR.ORANGE, COLOR.WHITE];
const updateFraktMetadata = async () => {
  const userKeypair = await createKeypairFromFile(__dirname + '/keys/frakt_creator.json');
  const fraktWhitelist = [
    'AMHB6DjPbheL6pF4SwU4fEj1ZeZ8wvdhofsLBsdjizP1',
    'AJWCGRmXBp7QQeEtUM2tMpTJXG7w7HUD1RKktv2kZYCu',
    '8mgeiQWREcWUBL9yXDPEJQwZUU2jcT5ajVKm6PVkQHJX',
    '8S1PyzEayaKrJynARQSRHTsLooNESSqchmwXXF4rgozk',
    '9b77kLnhbandp5iAS8z31m2jkRdPMQ16zfFMrVnTNwoR',
    'AD6Q1d3eP4YAMDUjUiunb6ig2HGJNe9AGAwo51poUYQ1',
    '8WSafRw4KowVjPFSj7GxH31jdE3FAXzZW4xJ2pbiQ7MQ',
    '7zc1dvZKXqpDZNcqzWkkqeiNUNdwwv5eijM1CEzvVMWP',
    'ANs4q2M78r6ufvEFxayJuMfvuggHFuHJkMUdeFuCVEbd',
    '7qz8jFNpvcNjpbTsBoB9Gfvb4KQK56bctaj5cKmKcdoT',
    '86xxhgc7ouEupBX5Mreo3UufJ73hDoquhrNCM96mR1DA',
  ];
  //  ['AfSRTheZPUBNLpNojswc6iEKvrKcYbs3pAgcCpJgU86Q'];
  //   JSON.parse(await lazyFs().readFile(__dirname + '/frakt_mintlist.json', { encoding: 'utf8' }));
  // console.log(fraktWhitelist.length);
  const metaplex = new Metaplex(mainnetConnection);

  metaplex.use(keypairIdentity(userKeypair));

  const start = 0;
  for (let i = start; i < fraktWhitelist.length; i++) {
    try {
      const fraktMint = fraktWhitelist[i];
      const mintAddress = new PublicKey(fraktMint);
      console.log('processing mint: ', fraktMint);

      const nft = await metaplex.nfts().findByMint({ mintAddress });

      if (nft.json?.attributes?.find((attribute) => attribute.trait_type === PLAYER_POINTS)) {
        console.log('already patched mint ', fraktMint, '...');
        continue;
      }
      if ((nft.json?.attributes?.length as any) > 4) {
        console.log('broken mint with old meta ', fraktMint, '...');
        const shapeAttribute: number = (nft.json?.attributes as any).find(
          (attribute) => attribute.trait_type === 'shape',
        )?.value as any;
        const colorAttribute: number = (nft.json?.attributes as any).find(
          (attribute) => attribute.trait_type === 'color',
        )?.value as any;
        nft.json?.attributes?.splice(
          0,
          nft.json?.attributes.length,
          {
            trait_type: 'color',
            value: COLOR_OLD[colorAttribute],
          },
          {
            trait_type: 'shape',
            value: SHAPE_OLD[shapeAttribute],
          },
        );
        // continue;
      }
      const playerPoints = getPlayerPointsFromFraktAttributes(nft.json?.attributes as any);
      const partnerPoints = getPartnerPointsFromFraktAttributes(nft.json?.attributes as any);
      nft.json?.attributes?.push({ trait_type: PLAYER_POINTS, value: playerPoints.toString() });
      nft.json?.attributes?.push({ trait_type: PARTNER_POINTS, value: partnerPoints.toString() });
      // console.log('nft: ', nft.json);

      const uploadedMetadata = await metaplex.nfts().uploadMetadata(nft.json as any);
      console.log('uploadedMetadata: ', uploadedMetadata);

      await metaplex.nfts().update({
        nftOrSft: nft,
        uri: uploadedMetadata.uri,
      });
    } catch (err) {
      console.log(err);
      i--;
      await delay(1000);
    }
  }
};

const AddBanxToFIll = async () => {
  await getMintsWithPagination();
  const userKeypair = await createKeypairFromFile(__dirname + '/keys/frakt_creator.json');
  const fraktWhitelist = (
    JSON.parse(await lazyFs().readFile(__dirname + '/metas_banx_full.json', { encoding: 'utf8' })) as any
  ).map((tokenlight) => tokenlight.mint);
  const metaplex = new Metaplex(mainnetConnection);

  // writeFileSync(__dirname + '/banx_current_mintlist.json', JSON.stringify(fraktWhitelist));

  metaplex.use(keypairIdentity(userKeypair));

  // const alNfts = await metaplex
  //   .nfts()
  //   .findAllByCreator({ creator: new PublicKey('BHexcGVJbpbk1DCJfT8GJph7wYiFTiMc3iTVc6ACP99W') });
  const urlMeta = `https://api.helius.xyz/v0/token-metadata?api-key=0dd0537a-65dd-4d40-a7d5-97804e3caa7e`;
  const getMetadata = async (nfts) => {
    const response = await fetch(urlMeta, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mintAccounts: nfts,
        includeOffChain: true,
        disableCache: false,
      }),
    });

    const data = await response.json();
    console.log('metadata: ', data);
    return data;
  };

  // const trueMeta = await getMetadata(fraktWhitelist.slice(0, 100));

  let totalUnrevealedCount = 0;
  let unrevealedTotal: any[] = [];
  let total_banx_metas: any[] = [];

  // let count = 0;
  for (let i = 0; i < fraktWhitelist.length; i += 100) {
    const trueMeta = await getMetadata(
      fraktWhitelist.slice(i, i + 100 < fraktWhitelist.length ? i + 100 : fraktWhitelist.length),
    );
    const unrevealed = trueMeta.filter((meta) => meta.offChainMetadata.uri.includes('https://arweave.net'));
    totalUnrevealedCount += unrevealed.length;
    unrevealedTotal = [...unrevealedTotal, ...unrevealed];
    total_banx_metas = [...total_banx_metas, ...trueMeta];
    console.log('new unrevealed: ', totalUnrevealedCount);
    console.log('i: ', i);
  }
  writeFileSync(__dirname + '/count_banx_unrevealed_full.json', JSON.stringify(totalUnrevealedCount));
  writeFileSync(__dirname + '/banx_unrevealed_full.json', JSON.stringify(unrevealedTotal));
  writeFileSync(__dirname + '/total_banx_metas.json', JSON.stringify(total_banx_metas, null, 2));
};

const getHeliusNftsTest = async () => {
  const url = `https://rpc.helius.xyz/?api-key=b2809690-1304-40ba-814d-ea5ee64dc4ed`;
  const getAssetsByGroup = async () => {
    console.time('getAssetsByGroup'); // Start the timer
    let page = 1;
    let assetList: any[] = [];

    while (page < 11) {
      console.log('fetching page: ', page);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'my-id',
          method: 'getAssetsByCreator',
          params: {
            creatorAddress: 'EEgrfJLLdEo8GdP25BCLAaEAofcGq7Bq1Qpb9ZrXizGm',
            onlyVerified: true,
            page: page++, // Starts at 1
            limit: 1000,
          },
        }),
      });
      const { result }: any = await response.json();

      assetList.push(...result.items);
      // if (true) {
      //   page = 0;
      // } else {
      //   page++;
      // }
    }
    const resultData = {
      totalResults: assetList.length,
      results: assetList,
    };
    // console.log('Frakt Assets: ', JSON.stringify(assetList, null, 2));
    writeFileSync(__dirname + '/gnomies_nfts.json', JSON.stringify(resultData, null, 2));
    console.log('length: ', assetList.length);
  };
  await getAssetsByGroup();
  // writeFileSync(__dirname + '/metas_banx_full.json', JSON.stringify(total.map((helMint) => helMint.mint)));
};

const getMintsByAssetsGroup = async () => {
  const url = `https://rpc.helius.xyz/?api-key=b2809690-1304-40ba-814d-ea5ee64dc4ed`;
  const getAssetsByGroup = async () => {
    console.time('getAssetsByGroup'); // Start the timer
    let page = 1;
    let assetList: any[] = [];

    while (page < 2) {
      console.log('fetching page: ', page);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'my-id',
          method: 'getAssetsByOwner',
          params: {
            ownerAddress: 'FwGL4QEk5EEytBKkJdnD62GtpjTakUypyJ5ErPL8J3TS',
            page: page++, // Starts at 1
            limit: 1000,
          },
        }),
      });
      const { result }: any = await response.json();

      // console.log('res', res);
      assetList.push(...result.items);
      // if (true) {
      //   page = 0;
      // } else {
      //   page++;
      // }
    }
    const resultData = {
      totalResults: assetList.length,
      results: assetList,
    };
    console.log('Banx Assets: ', JSON.stringify(assetList, null, 2));
    writeFileSync(__dirname + '/collection_banx.json', JSON.stringify(resultData));
  };
  await getAssetsByGroup();
  // writeFileSync(__dirname + '/metas_banx_full.json', JSON.stringify(total.map((helMint) => helMint.mint)));
};

const getMintsWithPagination = async () => {
  const url = `https://api.helius.xyz/v1/mintlist?api-key=0dd0537a-65dd-4d40-a7d5-97804e3caa7e`;
  const response1 = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: {
        // ABC COLLECTION
        firstVerifiedCreators: ['BHexcGVJbpbk1DCJfT8GJph7wYiFTiMc3iTVc6ACP99W'],
      },
      options: {
        limit: 10000,
        // paginationToken: 'V1_10000',
      },
    }),
  });
  const allResult1 = (await response1.json()) as any;

  const response2 = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: {
        // ABC COLLECTION
        firstVerifiedCreators: ['BHexcGVJbpbk1DCJfT8GJph7wYiFTiMc3iTVc6ACP99W'],
      },
      options: {
        limit: 10000,
        paginationToken: allResult1.paginationToken,
      },
    }),
  });
  const allResult2 = (await response2.json()) as any;
  // console.log('Mintlist: ', allResult);
  // await metaplex.candyMachinesV2().update()
  const total = [...allResult1.result, ...allResult2.result];
  console.log('length: ', total.length);
  writeFileSync(__dirname + '/metas_banx_full.json', JSON.stringify(total));
};

const getAssetHelius = async () => {
  const url = `https://rpc.helius.xyz/?api-key=0dd0537a-65dd-4d40-a7d5-97804e3caa7e`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'my-id',
      method: 'getAsset',
      params: {
        id: '7dXDzopvjWZd3cH7q9kUhBX31DihV57vktXQaD5E2C6j',
      },
    }),
  });
  const { result } = await response.json();
  console.log('Asset: ', result);
};
// const url = `https://api.helius.xyz/v1/mintlist?api-key=0dd0537a-65dd-4d40-a7d5-97804e3caa7e`;
// const response = await fetch(url, {
//   method: 'POST',
//   headers: {
//     'Content-Type': 'application/json',
//   },
//   body: JSON.stringify({
//     query: {
//       // ABC COLLECTION
//       firstVerifiedCreators: ['BHexcGVJbpbk1DCJfT8GJph7wYiFTiMc3iTVc6ACP99W'],
//     },
//     options: {
//       limit: 10000,
//       // skip: 10000,
//     },
//   }),
// });

// const { result } = (await response.json()) as any;
// console.log('Mintlist: ', result);
// // await metaplex.candyMachinesV2().update()
// writeFileSync(__dirname + '/metas_banx2.json', JSON.stringify(result));

const updateGnomiesMetadata = async () => {
  const userKeypair = await createKeypairFromFile(__dirname + '/keys/gnomies_creator.json');
  const gnomiesWhitelist = JSON.parse(
    await lazyFs().readFile(__dirname + '/gnomies_mintlist.json', { encoding: 'utf8' }),
  );
  const metaplex = new Metaplex(mainnetConnection);
  metaplex.use(keypairIdentity(userKeypair));

  const start = 0;
  for (let i = start; i < gnomiesWhitelist.length; i++) {
    try {
      const tokenMintAddress = gnomiesWhitelist[i];
      const mintAddress = new PublicKey(tokenMintAddress);
      console.log('processing mint: ', tokenMintAddress, ', count: ', i);

      const nft = await metaplex.nfts().findByMint({ mintAddress });
      // (metaplex.nfts()).
      if (nft.json?.attributes?.find((attribute) => attribute.trait_type === PLAYER_POINTS)) {
        console.log('already patched mint ', tokenMintAddress, '...');
        continue;
      }
      const playerPoints = 1;
      const partnerPoints = 63;
      nft.json?.attributes?.push({ trait_type: PLAYER_POINTS, value: playerPoints.toString() });
      nft.json?.attributes?.push({ trait_type: PARTNER_POINTS, value: partnerPoints.toString() });
      // console.log('nft: ', nft.json);

      const uploadedMetadata = await metaplex.nfts().uploadMetadata(nft.json as any);
      console.log('uploadedMetadata: ', uploadedMetadata);

      await metaplex.nfts().update({
        nftOrSft: nft,
        uri: uploadedMetadata.uri,
      });
    } catch (err) {
      console.log(err);
      i--;
      await delay(1000);
    }
  }
};

const fixGnomiesMetadata = async () => {
  const userKeypair = await createKeypairFromFile(__dirname + '/keys/gnomies_creator.json');
  const gnomiesWhitelist = [
    '2jUAyLnyLdC4r72mpyjwNPTLTDPKut3NmDMNr5S4uDkv',
    'tN3KEQXZihT2kFdextKnmGfNWA2jfhRZcQSgS9QHq4P',
    'vWkHft6oiky3zKjjj2jmQrf5DaXdcizhqozgFjmqT6P',
    'EXby2VcuBXFRNPJ3XtBv3TQxVACgseTRiKGZLXmBFSsM',
    'GxX5N3SmhtBkHHWrJUriYdVvQMcthpPFF2UPGKL2XjT6',
    'HQj7YSwweUMY2tcV3Wqpv9YGuLdqf4oGnyADJ24LerPX',
    'GmedL5nm6mJWFAhBybddH72wmwWp3VxNAktMvGFwRX6e',
    '8bbE9Uya6nj13h8vnLJkTjzru8T5SVg5sf6CgqAv3yTb',
    '5u3MrUjSfukQZVk4Qezh2tQ4NLt65xbgg9La45STYNV5',
    '4XYE3rkYr55jFDC8Y6a86BRTJekMaUjETmpPaGfhFzq4',
    '7K4V3UwK2gqRACenNEBm7LpYDu6w48nptfF1nd93Lhx9',
    'BcC3hAd37okvRSqniB3B5Yk21DzAGmABPt2m3vQJ4zNq',
    'GngShi2FF8yu4widP3Q13nBWbLU4TxsVDnDKNFUXmpCk',
    '2vL294QoWntZTNJn2r9TvXj2uzt1mkcQoBPRefkiMy8M',
    '8hcN8BN3gMAZPTn6ZT49vfasKAceETtUadVu6BBkCCUB',
    'BrLvshjMrYyHBtV4JG1vvS9MaEzRzCyTbCtbAGYRg1nf',
    'EanPqFmT57tX79W8PpPih33eC38BEAkrYAQZAPYLyLh5',
    'Ag9EWEHUGyBF7x1Kubhv5KPyvCJSLrtadG8L2hni188F',
    '2VUiLRnBQm3MgjnACMGbUjxW2xA1FTayvLXVysw3xDqR',
    'ABnLmYNhgMFj19aeKNkrjYFiXhvsXuvZZs72C4SaneYm',
    'Gts2KJPGenooV7iBCJ9RWDwpUcRnHHw3Rr5gnaMV9kZf',
    '2GrCiHEtQWsWEbUWZthG7JA8GHgtsQxZD985WoiMnMr8',
    '91TEyFa3hXEt2TZaD2WTbYXT9XQeeWDCJmbLwcq6FPHs',
    'FfoGMPm7xCHJsKC3NmQ1qQfajKP2skffmu2EHtbLEWrb',
    'HJubLFocibkLvHRetbttTwTNr9DDTc8ZHzNShgLakXHm',
    'GckTeBLuNGbuVkvtxC6MJ6B7DcuL51CXxXdRDB15d8Jy',
    'DBduCKF1AA14LGt3vLYk7yM6tyUQ5mG8iKMBMDi3AqX8',
    'GHtfp9iZ8xAVKmc2ikVsEJf1rdsaGnyH4rjk9sxqPepZ',
    'BCcFEbPbJEXpY5tEyqBrereShM45tTrktooWzESKX8gd',
    '9rq1MZjJaJnPDangPrMJeRyHBQy34zn5pmvmpEVBj6a',
    '9vqYC5uUQkrq15CkBU7wGcydK6ybcUSRB4nsM3Rcewwd',
    'pqFujUny8NH5TtSPuKK4fbRngCG7ZSc7Xho4aWcuPuS',
    '3x3kfvUd2ocfxQNhmrw78HohWdizwXNjYUN19wdPbVBb',
    '2F8fi9yRi92t2NFUUfDVJWSPonMYtjTybKfbJD77R3wF',
    '3Vx6qt6x7ZVbNj1T8AHiCx5Ybho3y1KYBatuGUkR7mwR',
    'CsoC7QZ1RvrhR1N4bW3CbkqWy8bDc2HZP3Lw6Ng4Azqj',
    'C6nKsRtbkEnW9QLB3LdMC4XrNXPJS82ZFimCyq5iAgZ',
    '9qnG8Cji5onJ4kcVZJAQ5LnfPbXbJspErdfyF3YLQaMj',
    'AU9zj7a6aqmdjjN31egvyQzYdGH1QDnA3eZnzsn57wzM',
    '2FcRQokntBLeJvGZMHdvPAzWu9rSBsGBk9r5UHXnXpeY',
    'Hxzxo7LfytkJSdsjTKY4gnqfLgSByDtgCbKogLjvRSSj',
    '4wYNHEq7KJCxsPH5bXW7dNpTfJiJitiMSmNPmcrtdq6x',
    '9FVMSRFwX7dE7yEwZMfAYy3wqTuenMNPg17qphsJszuV',
    '3FKYTWuoTDvS6wFYxKZrkpohzcjacR3T8BcPrJG5Diy4',
    'GHeYd8LcnGWe9MHCr3TH8Qn4gSZkuT1TuFZ1jJzsYGi6',
    'GsMWm767tyiNK371g8d63w8VcAMoSJyk37Ve9r3hrSWc',
    'G6xC5Xq6Uw61xUegnmaZruksb9CZhNVcBvjPJvjfhwtq',
    'HFfYAghh3ghyv9RuKFUKzPbbFgCjiy2gZ1UGcN4pFnPi',
    '83AjQh8Xt7XCt8iSEhZ5nV7cVCHzGkirjVLCcKEknv7e',
    '2YsndFrbT9UKAjtnBsu2fEx46D1wmA5ESWV8LGrJhowM',
    '5gSgARx3tJYhhKMasir4dVVrX5yutyPvjqPeD2i14eNw',
    '3Z9TLBv6kYRLutt4pMkSWd2UWZ3sqqWrpmxu3goaGDce',
    'E9f7cHaG74wggKkQxvi7EUfroymdfyqkf6rqkvKJMHnD',
    '2UxVepsAFB7H3zr43gQeqguMWNupAop2ydj8K4M9Y8zD',
    'CyzJfFrdMwdxQhUfGmE1TkmJPzoqJEApxtV5JdykWLQa',
    '6sN4XSETSe2QqKyBbCMW9tWavMT5XsgrraFQnpmv2vRP',
    'EXDPFeK2fMaaai7dZ36B3EXDECyx2CoYTKBHck9CqHVs',
    '9Bcg3UL9ErcKCNKdPxTiwpB3LwgranQH253uZBHywcjW',
    '72YpbFxWQFvCzPR5pZFDxFSkEPp9e7D7e6tDpEt4jRmL',
    'HtCyZWSp6BgMFJJQ3FLf6nxrAD5jqCsQt9RB4AbFp9Vv',
    '2RgQzfgY7cPtpsrjBUbApkK1nmnAEUCvKoMCQd3fe9yX',
    '8jfhUNXmqfB9UTEgqbpnSG1bhA1yB2VmMwj1nBgLyRoj',
    'En4vSFZ4852pUJs2akQh2Vk3TyhxvBHc3nt9tZnGQeLs',
    '8GsieiXXS8PULbo1jTLQA6cYKsy6FNZYP2DtdEWg9D1r',
    '6qSWTjhPYzA1LYiDB3sBjzM1zKk7nJLkp1F45fSyuxZE',
    '9XABaDV7WoLJ7omjb6MCNQpV7ptVyAzZrY2LFkSmB3uU',
    'CSfRc6BbanqrSiTRST8EqbU4fwR7wq62TtVrndVPB16G',
    'FmjY6NU8GRhCzmyDJT41LDaj6tBRFFw35m4o7q6chhcQ',
    '2iykLFZTFzjNvNQZ5fLVvbF5xzkN13dD5sVcZA8UR9Q6',
    '39qDqz6QYZCofy5roZeSMbB7Q3TFCnJHPBzUtfvrHWbw',
    '7BrYBkJe5U4KCwmMQxMDfHwvyPyjv8qmjqw9BXknMsSG',
    'CuoegYZehRfhWJo16hbPfuqLUCejzfdckhEq7nd5ZuTv',
    'CaKnixE6Cg9hsPWDmFU772uJJYULwaYgknJuEe3VMwXS',
    '3W8oGsrvGAe31pYJRiZCBsiggmmd6R62ZoiwbEf6TL2M',
    '8ZkFLfKeFB2trjqdwJSb7kiCi7nECH5TbaijepkFCJ8G',
    '7baWPMqZaubahQGs1KX5MmFqNk3bxEJAsEZXB74zQC2s',
    '5R9591v7BfdXGFH9sgc6226rbRhCXWrAMFdEke9fD2VK',
    '65JvfrLrTqNuf4p8U8yDumXvtoGHG2XWVhfA3s5AYaFc',
    'CuCnXda2NHMjWsLifX91NK7m1baEDULVfqDwBoJsnNx8',
    'GpFmQUyJeTTokK2Si9aoYDDCEsjELczDBr1TCNEHsPnC',
    '7kLASDihzRaZ1CZAzp3B2N2MFwGTzhpAnCg9qyyNazQ7',
    'HXTQK3dGDnhHNcu3nNrUwBGP4kigUiyvoWamK6P9pJ4W',
    '2ZfCabs1UGXh5LfioKdK2Um4gXgsZwnfniumi6y5TS5n',
    '3QC392sfdZoP9LMhkZooDF2MaaMSjwZycFjn5peociSc',
    'GuzJcwR7pdcrH9oqHdPx5u8asLnvSWHqV8gpPnUvM7wv',
    '3Ab7qaX2eAha2DPPxG9xn7UMcFRehYhnuWPzXZfbeLQy',
    'BtCyntmGR7zwh6YBK3Y5tSS7t9UtUdSuMMyqxPmEThwP',
    '77nGQxrKybzQTr4UYvkAyu8oqk6pP8Bvg4imJCPxsVA',
    '37z9KgBj69KGVwszn9empLerkuA5tb3sBBjP7mzWoEnS',
    'DSGiydg8JE3Kw5qEBwaxDN4GbwMERmaD9MHogbpeLXHb',
    '4GPdg7KuQsJRKYbm9ZCLCQN8ypwmpAmDNtnSPT3hKobr',
    '697vk8N5PaCUS2wisCd1x4jKS5GZoaJPCWi1MAuA98Go',
    '3s8gLiDFKD6MssznyQcW15hMaBDacDgUY71JPjpLXznJ',
    '7kmnXNTvBPebmLMCjUoFW7zWgKtPXShCHEESZtpaPcTn',
    'za6wVmreZoJamMQAMJBb4PJbfDAhWRqisf6C2TEE1zt',
    '3KXLzhJi4Hxh94fXrK1JbYHXHDaRdJ5SXCDnQzXZvC24',
    '66QSkYf3sMwZMP6jFbvNgkaCpFmfvqFTsWw8U8AExQRk',
    '6yzZtCKm7XbBVu7yxkMNijsyJZjPRpkx5FY2jBG8bfQi',
    'EnzDerMKVD4GxTGt9ieFAwUAsGJGrpoERau1qnbwi4Jz',
    '81sEAEJqATtoK42ixCBWmFDYikmkXeggyA8vfswhb3kT',
    '5VW9gYmZWbLbf4VwxiNfUwdLWM5UVYHggLnDnkPd3jMS',
    'FD8dBMWjXYYSVqq4GkhLCqB4arTbt8VMSpNHahuVUxqK',
    'Gyepo5kK87N5XXsFmJux8JV3V2XnVie9jrPWjkkBaKny',
    'B9FsjZmtDgMiWdhsPSe8M1w7UVVmL1GQYod2zsScDrzT',
    '6R4qfF5KxDMdrKxmBDiVGmmvPPT264AxCMbnKRZ2f6Kg',
    'CDVQ9Qh6jP21b787EWHKynpgCwd7hXGCf8sBSTMXSUZW',
    '9JTJinopfaEjv5yJYw8iRQAeDazfyb4gvwrvHfXDkLNf',
    '4YqyzpELsYgnQnddwFeEDFKQmxWGQGn2x5ZTEE2fs5JF',
    'Fy661ZqmcmT4DKKGv6p66kXLTEGz2N6ucHHU8Xm6oofz',
    '89tDtcnZ62eju2B2ziwPe2VRcMjAydB73xqYmNUjXxE8',
    '49wTEarUGqwGY1RhaPzwLApWM5SZfeKv5wDF7qgmttzA',
    'A5KzZBYLboczSiD8U5ZHJv13Wf4D6g2oC2xexvnr1WYF',
    '45VqaEHdtAwWdboP4SNR9rRntxJFM9oYLwKsRB5UpKNW',
  ];

  const goodGnomieAddress = new PublicKey('26f6fEAZgorjjZsZ6AEhRjNj8VgGdxSkdAWsXiqfaE1Y');
  const metaplex = new Metaplex(mainnetConnection);
  metaplex.use(keypairIdentity(userKeypair));
  const goodGnomie = await metaplex.nfts().findByMint({ mintAddress: goodGnomieAddress });

  console.log('goodGnomie uri: ', goodGnomie.uri);
  const start = 0;
  for (let i = start; i < gnomiesWhitelist.length; i++) {
    try {
      const tokenMintAddress = gnomiesWhitelist[i];
      const mintAddress = new PublicKey(tokenMintAddress);
      console.log('processing mint: ', tokenMintAddress, ', count: ', i);

      const nft = await metaplex.nfts().findByMint({ mintAddress });
      console.log('nft.json before: ', nft.json);
      if (nft.json !== null) continue;
      // const mappedGnomie = {
      //   ...goodGnomie,
      //   mint: nft.mint,
      //   metadataAddress: nft.metadataAddress,
      //   address: nft.address,
      // };
      // nft.uri = goodGnomie.uri

      // const uploadedMetadata = await metaplex.nfts().uploadMetadata(nft.json as any);
      // console.log('uploadedMetadata: ', uploadedMetadata);

      await metaplex.nfts().update({
        nftOrSft: nft,
        uri: goodGnomie.uri,
      });
    } catch (err) {
      console.log(err);
      i--;
      await delay(1000);
    }
  }
};

const findLost2Banx = async () => {
  const banxMintList = JSON.parse(await lazyFs().readFile(__dirname + '/metas_banx_full.json', { encoding: 'utf8' }));

  const banxAssets = JSON.parse(await lazyFs().readFile(__dirname + '/vollection_banx.json', { encoding: 'utf8' }));
  // console.log('asset: ', banxAssets.results[0]);

  const notIncluded = banxAssets.results.filter((asset) => !banxMintList.includes(asset.id));
  console.log('not included: ', notIncluded);
};

const fixBrokenBanxStakeScript = async () => {
  const connection = mainnetConnection;
  const userKeypair = await createKeypairFromFile('/Users/gleblevin/.config/solana/admin_deploy.json');
  const sendTxnUserDevnet = async (txn, signers) =>
    void (await connection.sendTransaction(txn, [userKeypair, ...signers]).catch((err) => console.log(err)));
  const programId = FBONDS_MAINNET;

  const banxStakes = (
    await fbonds.functions.getters.getSpecificAccounts('banxStake', FBONDS_MAINNET, connection)
  ).filter(
    (banxStake) =>
      banxStake.isLoaned == true &&
      banxStake.bond === EMPTY_PUBKEY.toBase58() &&
      banxStake.banxStakeState === BanxStakeState.Staked,
    //&& banxStake.user === '6JgexLq1STiDE3MvjvnsZqdevnoHMTeaM7FrJRNt2Mrg' && banxStake.nftMint === "GdsmkeAvh47CZWDvGs5BKg9E5c27yarowQoMn5LwCxjt"
  );

  // banxStakes.length = 1;

  console.log(banxStakes);

  const fraktBonds = (
    await fbonds.functions.getters.getSpecificAccounts('fraktBond', FBONDS_MAINNET, connection)
  ).filter(
    (fraktBond) =>
      fraktBond.fraktBondState === FraktBondState.PerpetualActive &&
      banxStakes.find((banxStake) => banxStake.nftMint === fraktBond.fbondTokenMint),
  );

  console.log(fraktBonds);

  const results = await Promise.all(
    banxStakes.map(async (banxStake) => {
      const frakrBond = fraktBonds.find((tempFraktBond) => tempFraktBond.fbondTokenMint == banxStake.nftMint);
      const isLoaned = frakrBond ? true : false;

      return await fbonds.functions.staking.settings.fixBrokenBanxStake({
        programId: programId,
        connection: connection,
        args: {
          isLoaned: isLoaned,
        },
        accounts: {
          userPubkey: userKeypair.publicKey,
          banxStake: new PublicKey(banxStake.publicKey),
          frakrBond: frakrBond ? new PublicKey(frakrBond.publicKey) : undefined,
        },
        sendTxn: sendTxnUserDevnet,
      });
    }),
  );

  console.log('Done');
};

const migrateOldToBondingOffer = async () => {
  const connection = mainnetConnection;
  const userKeypair = await createKeypairFromFile('/Users/gleblevin/.config/solana/admin_deploy.json');
  const sendTxnUserDevnet = async (txn, signers) =>
    void (await connection.sendTransaction(txn, [userKeypair, ...signers]).catch((err) => console.log(err)));
  const programId = FBONDS_MAINNET;

  const bondOffers = (
    await fbonds.functions.getters.getSpecificAccounts('bondOfferV2', FBONDS_MAINNET, connection)
  ).filter((bondOffer) => bondOffer.pairState == PairState.PerpetualOnMarket);

  console.log(bondOffers);

  const results = await Promise.all(
    bondOffers.map(async (bondOffer) => {
      return await fbonds.functions.perpetual.migrateOldToBondingOffer({
        programId: programId,
        connection: connection,
        accounts: {
          oldBondOffer: bondOffer.publicKey,
          userPubkey: userKeypair.publicKey,
        },
        sendTxn: sendTxnUserDevnet,
        optimistic: {
          oldBondOffer: bondOffer,
        },
      });
    }),
  );

  console.log('Done');
};

const addCollectionIdToFraktsAndGnomies = async () => {
  const userKeypair = await createKeypairFromFile(__dirname + '/keys/frakt_creator.json');
  const newCollectonId = await createKeypairFromFile(__dirname + '/keys/frakt_and_gnomies_collection_id.json');
  console.log('userKeypair: ', userKeypair.publicKey.toBase58());
  console.log('newCollectonId: ', newCollectonId.publicKey.toBase58());

  const gnomiesWhitelist = JSON.parse(
    await lazyFs().readFile(__dirname + '/frakt_mintlist.json', { encoding: 'utf8' }),
  );
  const metaplex = new Metaplex(mainnetConnection);
  metaplex.use(keypairIdentity(userKeypair));

  const collectionMintAddress = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
  // metaplex.use(keypairIdentity(newCollectonId));

  // const allNfts = await metaplex.nfts().findAllByUpdateAuthority({ updateAuthority: userKeypair.publicKey });
  console.log(gnomiesWhitelist[0]);

  const start = 0;
  for (let i = start; i < gnomiesWhitelist.slice(0, 1).length; i++) {
    try {
      const tokenMintAddress = gnomiesWhitelist[i];
      const mintAddress = new PublicKey(tokenMintAddress);
      console.log('processing mint: ', tokenMintAddress, ', count: ', i);

      const metaplex = new Metaplex(mainnetConnection);
      metaplex.use(keypairIdentity(userKeypair));

      const nft = await metaplex.nfts().findByMint({ mintAddress });

      await metaplex.nfts().update({
        nftOrSft: nft,
        uri: nft.uri,
        name: 'What you want',
        symbol: 'what you want',

        // creators: [...nft.creators, { address: newCreator.publicKey, share: 0, authority: newCreator }],
        // collection: newCollectonId.publicKey,
      });

      // metaplex.nfts().COL
      await metaplex.nfts().verifyCollection({
        collectionAuthority: userKeypair,
        mintAddress: mintAddress,
        collectionMintAddress: mintAddress,
      });
      // metaplex.nfts().update()
    } catch (err) {
      console.log(err);
      i--;
      await delay(1000);
    }
  }
};

const addNewCreatorToDesolates = async () => {
  const userKeypair = await createKeypairFromFile(__dirname + '/keys/desolates_update_authority2.json');
  const newCreator = await createKeypairFromFile(__dirname + '/keys/verified_desolate_creator.json');
  console.log('userKeypair: ', userKeypair.publicKey.toBase58());
  console.log('newCreator: ', newCreator.publicKey.toBase58());

  const gnomiesWhitelist = JSON.parse(
    await lazyFs().readFile(__dirname + '/desolates_whitelist.json', { encoding: 'utf8' }),
  );
  const metaplex = new Metaplex(mainnetConnection);
  metaplex.use(keypairIdentity(userKeypair));
  // metaplex.use(keypairIdentity(newCreator));

  // const allNfts = await metaplex.nfts().findAllByUpdateAuthority({ updateAuthority: userKeypair.publicKey });
  console.log(gnomiesWhitelist[0]);

  const start = 150;
  for (let i = start; i < gnomiesWhitelist.length; i++) {
    try {
      const tokenMintAddress = gnomiesWhitelist[i];
      const mintAddress = new PublicKey(tokenMintAddress);
      console.log('processing mint: ', tokenMintAddress, ', count: ', i);

      const nft = await metaplex.nfts().findByMint({ mintAddress });
      if (nft.updateAuthorityAddress.toBase58() != userKeypair.publicKey.toBase58()) continue;
      // nft.creators = [{l}]
      // // nft.creators.
      if (nft.creators.find((creator) => creator.address.toBase58() == newCreator.publicKey.toBase58())) {
        console.log('skipping');
        continue;
      }
      // const uploadedMetadata = await metaplex.nfts().uploadMetadata(nft.json as any);

      await metaplex.nfts().update({
        nftOrSft: nft,
        uri: nft.uri,
        creators: [...nft.creators, { address: newCreator.publicKey, share: 0, authority: newCreator }],
      });

      // await metaplex.nfts().verifyCreator({ creator: newCreator, mintAddress: mintAddress });
    } catch (err) {
      console.log(err);
      i--;
      await delay(1000);
    }
  }
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
const getTopOrderSizeTest = () => {
  const pair = {
    publicKey: '5DdUz77L9KWoc4mL2zY7s9p3h6hzSALGZrRVFwwSNQmc',
    assetReceiver: '6FjwAfAuNRYk6sAkViYumVCQPng9inAkQ58zDG1EK2FP',
    baseSpotPrice: 9900,
    bidCap: 70707,
    bidSettlement: -70707,
    bondingCurve: { delta: 0, bondingType: 'linear' },
    buyOrdersQuantity: 1,
    concentrationIndex: 0,
    createdAt: '2023-03-13T18:04:31.846Z',
    currentSpotPrice: 9900,
    edgeSettlement: 0,
    fee: 0,
    feeTokenAccount: '11111111111111111111111111111111',
    feeVaultSeed: 255,
    fundsSolOrTokenBalance: 501029100,
    fundsSolVaultSeed: 255,
    fundsTokenAccount: '11111111111111111111111111111111',
    hadoMarket: '6bUAJarFDjdQ7fFEe8DWf99FwNzdnM1Xr2HrrbGVkjA1',
    initialFundsSolOrTokenBalance: 699999300,
    isRemoved: false,
    lastTransactedAt: 1678730641,
    lpTokensInCirculation: 0,
    lpTokensMint: '11111111111111111111111111111111',
    mathCounter: 0,
    nftsSeed: 255,
    pairAuthorityAdapterProgram: '4tdmkuY6EStxbS6Y8s5ueznL3VPMSugrvQuDeAHGZhSt',
    pairAuthorityType: 'classicAuthority',
    pairState: 'onMarketVirtual',
    pairType: 'tokenForNft',
    sellOrdersCount: 0,
    solOrTokenFeeAmount: 0,
    updatedAt: '2023-03-17T13:12:31.823Z',
    validation: {
      publicKey: 'CLvVmSavqVVPuTQiTdEt6kFW2ActJJsPwfsemsjgBEN7',
      bondFeatures: 'none',
      createdAt: '2023-03-13T18:04:31.801Z',
      durationFilter: 604800,
      isRemoved: false,
      loanToValueFilter: 4100,
      maxReturnAmountFilter: 17909851841,
      pair: '5DdUz77L9KWoc4mL2zY7s9p3h6hzSALGZrRVFwwSNQmc',
      updatedAt: '2023-03-13T18:04:31.801Z',
      user: '6FjwAfAuNRYk6sAkViYumVCQPng9inAkQ58zDG1EK2FP',
    },
    authorityAdapterPublicKey: 'H8Z1D9TBPHgigB8EMVgS6ynBBPeceyeyU2yqrt7TgyEZ',
  };

  const topSize = getTopOrderSize(pair as any);
  console.log('topSize: ', topSize);
};
// floor = 1 SOL
/// pairs = [{buyPrice: 0.9 SOL, loanToValueFilter: 20%,
/// {buyPrice: 0.7 SOL, loanToValueFilter: 70%}  ]
// nfts = ["1"]
// combinations  0: orders[{ buyPrice: 0.9, returnValue: 1 * 0.2 = 0.2 SOL, loanValue: returnValue *  buyPrice = 0.18 SOL, fee: 0.02 }, ]
// combinations  1: orders[{ buyPrice: 0.7 SOL, loanToValueFilter: 70%, returnValue: 1 * 0.7 = 0.7 SOL,
/// loanValue: returnValue *  buyPrice = 0.49 SOL, fee: 0.21  }]

const exampleGetTradeActivities = async () => {
  const activities = await getTradeActivities({
    programId: FBONDS_MAINNET,
    connection: mainnetConnection,
    // fromThisSignature: '3Vkh5r6dM4bhjhnQY2qrtEmnyE9GaNtkmEnd9UYo87MAnrq97vS4ix3t11XxVQLHtzaG4oX81yK3G25E5rTKhUwW', //lastTxSignature,
    // limit: 1000,
  });
  console.log('activities: ', activities);
  // const activitiesBySignatures = await getTradeActivitiesBySignatures({
  //   signatures: ['4Q3nHNL25FHV6TR8rHDZ6rhMydLMWoSswXWYwWCsJCsTHhDkwofQvH4GqNXmNiyvpWHsikPbdh1rPjspm7Cbs3iY'],
  //   connection: mainnetConnection,
  // });
  // console.log('activitiesBySignatures: ', activitiesBySignatures);
};
const exampleGetBondActivities = async () => {
  const activities = await getBondEventsBySignatures({
    signatures: [
      // '5pTtTEt9SkuXMfkoxKBy2tc4rCsAsmQwY47rAsKFbYjikuMK8DamWE43a1knbZZj6T7J3GiG3xmz81ApTeB6fsnK',
      '5nbaw9qmnYDNtF7A2JtD7Z7JjhZrc8MQs9kkJm8gjtXwkBWxWpN9yPcVQGCG9TbHeSSLC7MZ3pkjQ6CeyM2qNdEc',
    ],
    connection: mainnetConnection,
  });
  //   await getBondEvents({
  //     programId: FBONDS_MAINNET,
  //     connection: mainnetConnection,
  //     untilThisSignature: '2J3QP9B9HGGYMErNCSwL8E5EEojJRNSZTekzW7EnJQGLtCA5oMUh7x5SixdnuEb76Yc9EL32LwnBLi9XkpBxFfeu',
  //     eventslimit: 100,
  //   });
  console.log('activities: ', activities);
  // const activitiesBySignatures = await getTradeActivitiesBySignatures({
  //   signatures: ['4Q3nHNL25FHV6TR8rHDZ6rhMydLMWoSswXWYwWCsJCsTHhDkwofQvH4GqNXmNiyvpWHsikPbdh1rPjspm7Cbs3iY'],
  //   connection: mainnetConnection,
  // });
  // console.log('activitiesBySignatures: ', activitiesBySignatures);
};

const makeBondsValidationFilterScript = async () => {
  const userKeypair = await createKeypairFromFile(__dirname + '/keys/devnet_admin.json');
  const connection = devnetConnection;
  const sendTxnUserDevnet = async (txn, signers) =>
    void (await connection
      .sendTransaction(txn, [userKeypair, ...signers], {
        skipPreflight: true,
      })
      .catch((err) => console.log(err)));
  const programId = CROSS_TOKEN_AMM_DEVNET;

  // await fbonds.functions.validation.validateFBond({
  //   programId: programId,
  //   connection: connection,
  //   accounts: {
  //     pair: new PublicKey('DU1NQeT6R6sRs5Dcah3PohrxmyyEMNeABHTAdJXsq5E3'),
  //     userPubkey: userKeypair.publicKey,
  //   },
  //   sendTxn: sendTxnUserDevnet,
  // });
};

const exampleCreateBondValidation = async () => {
  const userKeypair = await createKeypairFromFile(__dirname + '/keys/devnet_admin.json');
  const connection = devnetConnection;
  const sendTxnUserDevnet = async (txn, signers) =>
    void (await connection
      .sendTransaction(txn, [userKeypair, ...signers], {
        skipPreflight: false,
      })
      .catch((err) => console.log(err)));
  const programId = BONDS_VALIDATION_ADAPTER_DEVNET;
};

const exampleRedeemCollateral = async () => {
  const userKeypair = await createKeypairFromFile(__dirname + '/keys/master_dev_wallet.json');
  const connection = mainnetConnection;
  const sendTxnUserDevnet = async (txn, signers) =>
    void (await connection.sendTransaction(txn, [userKeypair, ...signers]).catch((err) => console.log(err)));
  const programId = FBONDS_MAINNET;
  const admin = new PublicKey('9J4yDqU6wBkdhP5bmJhukhsEzBkaAXiBmii52kTdxpQq');
  const fbondsAllAccounts = await fbonds.functions.getters.getAllProgramAccounts(FBONDS_MAINNET, connection);

  const fbondStr = 'F4zConkqF1YsPW6QfUJfDDy9K2LNVk43nnB866CQNn1N';
  const collateralTokenMintStr = fbondsAllAccounts.collateralBoxes.find(
    (box) => box.fbond === fbondStr,
  )?.collateralTokenMint;
};

const createLookupTableScript = async () => {
  const userKeypair = await createKeypairFromFile(__dirname + '/keys/mainnet_admin.json');
  console.log('user: ', userKeypair.publicKey.toBase58());
  const connection = mainnetConnection;
  const sendTxnUserDevnet = async (txn, signers) =>
    void (await connection.sendTransaction(txn, [userKeypair, ...signers]).catch((err) => console.log(err)));

  const slot = await connection.getSlot();

  const pubkeysToAdd = [
    new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    new PublicKey('11111111111111111111111111111111'),
    new PublicKey('SysvarRent111111111111111111111111111111111'),
    new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'),
    new PublicKey('auth9SigNpDKz4sJJ1DfCTuZrZNSAgh9sFD3rboVmgg'),
    new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'),
    new PublicKey('Sysvar1nstructions1111111111111111111111111'),
    new PublicKey('FoNprxYzYmwnYzhM964CxEHchhj17YREieJtSAXg9FMU'), // mutual vault
    new PublicKey('9J4yDqU6wBkdhP5bmJhukhsEzBkaAXiBmii52kTdxpQq'), // fee receiver
    new PublicKey('4tdmkuY6EStxbS6Y8s5ueznL3VPMSugrvQuDeAHGZhSt'), // bonds program
  ];

  console.log('INITIAL PASSED SLOT: ', slot);
  const combinedAddressesForLookupTable = uniqBy(
    [
      // ...addressesForLookupTable,
      ...pubkeysToAdd,
    ],
    (publicKey) => publicKey.toBase58(),
  );
  console.log('combinedAddressesForLookupTable: ', combinedAddressesForLookupTable.length);
  const [lookupTableInst, lookupTableAddress] = web3.AddressLookupTableProgram.createLookupTable({
    authority: userKeypair.publicKey,
    payer: userKeypair.publicKey,
    recentSlot: slot - 2,
  });
  const extendInstructions = chunk(combinedAddressesForLookupTable, 20).map((chunkOfAddressesForLookupTable) =>
    web3.AddressLookupTableProgram.extendLookupTable({
      payer: userKeypair.publicKey,
      authority: userKeypair.publicKey,
      lookupTable: lookupTableAddress,
      addresses: chunkOfAddressesForLookupTable,
    }),
  );
  const createLookupTableTxn = new web3.Transaction().add(lookupTableInst, extendInstructions[0]);

  console.log('lookupTableAddress: ', lookupTableAddress.toBase58());
  await sendTxnUserDevnet(createLookupTableTxn, []);
};

const extendLookupTableScript = async () => {
  const userKeypair = await createKeypairFromFile(__dirname + '/keys/mainnet_admin.json');
  console.log('user: ', userKeypair.publicKey.toBase58());
  const connection = mainnetConnection;
  const sendTxnUserDevnet = async (txn, signers) =>
    void (await connection.sendTransaction(txn, [userKeypair, ...signers]).catch((err) => console.log(err)));

  const slot = await connection.getSlot();

  const latest_adventure = SPL_NOOP_PROGRAM_ID;

  //   8cAiWvn6c3c17YVEvnKpZGbwzbBBNgoi2raVv7Tuhut3
  // DjTiDCi76vJ41ujJfuKc1RRxfeS7coca7bQ3EqLAztjg
  // 3Td8mTq4797hjipsCMCKmrUYuEM5UQsraVfzAxiAWo5N
  // FS8AeMBVvyaiDHVVNuN3ECW8TBWvSxN4ucEtRmVYWWjR
  // ETBDWA9nj4raEbXKEaFrPoNo2pqN6mumHutP4zFzFEpL
  // 7hfLoYFQbSdw5J6KvMtN34USRfRWc2HGmUibxBcxHigh]

  // const { stakingSettings, banxStakes, adventureSubscriptions, adventures, banxUsers } =
  //   await fbonds.functions.getters.getStakingAccounts(FBONDS_MAINNET, connection);

  // const adventure = adventures.find((adventure) => adventure.periodStartedAt === weeksToAdventureTimestamp(8));

  const [adventure] = await web3.PublicKey.findProgramAddress(
    [ENCODER.encode(ADVENTURE_PREFIX), ENCODER.encode(weeksToAdventureTimestamp(20).toString())],
    FBONDS_MAINNET,
  );
  //   EYUCnz9ZoNJJtBLiJt7gwktrrb5kvvVhAj7zcQFfSuS9
  // FM9pHsVQTXU5v4LzqrEpGSuR16e7H1eswagGij1UQhwW
  // 7CTtQAwtLfVu4JyG5q96QLwojoxdXJCiPwWLBcgU6CHC
  // FASRc5PpGKm8nGHs9jed3jpkSKw6jSxb1wbxXWKFwwck
  // 4JjupUGMCK5bnQeiHfTzhoHv6SAdUaCFU58pj91FoeMn
  // 5W3Vkb7bGPFHiDu6jovdXFagmCGpzptbz8WANRuZqKhz
  // 3x7uxQ6sxRCbRgYVWNiidHL85rgnHwbTtpQPfM43KkNt
  const pubkeysToAdd = [
    adventure,
    // new PublicKey('EYUCnz9ZoNJJtBLiJt7gwktrrb5kvvVhAj7zcQFfSuS9'),
    // new PublicKey('FM9pHsVQTXU5v4LzqrEpGSuR16e7H1eswagGij1UQhwW'),
    // new PublicKey('7CTtQAwtLfVu4JyG5q96QLwojoxdXJCiPwWLBcgU6CHC'),
    // new PublicKey('FASRc5PpGKm8nGHs9jed3jpkSKw6jSxb1wbxXWKFwwck'),
    // new PublicKey('4JjupUGMCK5bnQeiHfTzhoHv6SAdUaCFU58pj91FoeMn'),
    // new PublicKey('3x7uxQ6sxRCbRgYVWNiidHL85rgnHwbTtpQPfM43KkNt'),
  ];
  console.log(
    'pubkeysToAdd: ',
    pubkeysToAdd.map((pubkey) => pubkey.toBase58()),
  );
  const lookupTableAddress = new PublicKey('8Hd6eCqRPfguSkRQn1qhNeKUXCLPkhAJimFkLiWERTEm');

  console.log('INITIAL PASSED SLOT: ', slot);
  const combinedAddressesForLookupTable = uniqBy(
    [
      // ...addressesForLookupTable,
      ...pubkeysToAdd,
    ],
    (publicKey) => publicKey.toBase58(),
  );
  console.log('combinedAddressesForLookupTable: ', combinedAddressesForLookupTable.length);

  const extendInstructions = chunk(combinedAddressesForLookupTable, 20).map((chunkOfAddressesForLookupTable) =>
    web3.AddressLookupTableProgram.extendLookupTable({
      payer: userKeypair.publicKey,
      authority: userKeypair.publicKey,
      lookupTable: lookupTableAddress,
      addresses: chunkOfAddressesForLookupTable,
    }),
  );
  const createLookupTableTxn = new web3.Transaction().add(extendInstructions[0]);

  console.log('lookupTableAddress: ', lookupTableAddress.toBase58());
  await sendTxnUserDevnet(createLookupTableTxn, []);
};

const migratePairsToBondOffersScript = async () => {
  const userKeypair = await createKeypairFromFile(__dirname + '/keys/mainnet_admin.json');
  console.log('user: ', userKeypair.publicKey.toBase58());
  const connection = mainnetConnection;
  const sendTxnUserDevnet = async (txn, signers) =>
    void (await connection.sendTransaction(txn, [userKeypair, ...signers]).catch((err) => console.log(err)));
  const programId = FBONDS_MAINNET;
  const {
    fraktBonds,
    hadoMarketRegistry,
    collateralBoxes,

    bondTradeTransactionsV2,
  } = await fbonds.functions.getters.getAllProgramAccounts(FBONDS_MAINNET, connection);
};

const finalizeHadoMarketScript = async () => {
  const userKeypair = await createKeypairFromFile(__dirname + '/keys/frakt_market_admin.json');
  const connection = mainnetConnection;
  const sendTxnUserDevnet = async (txn, signers) =>
    void (await connection.sendTransaction(txn, [userKeypair, ...signers]).catch((err) => console.log(err)));
  const programId = FBONDS_MAINNET;
  //  new anchor.web3.PublicKey('DFsZgwKM3SvkvMwVRPQhhEnkYZCS1hZ2g2u6ehmAWjyc');
  // console.log('userKeypair: ', userKeypair.publicKey.toBase58());
  const hadoMarket = new anchor.web3.PublicKey('HDqFpbBazXf5VwjmpiZFYqtss2PRPwvXFv5VSnqBvnWN');

  await finishHadoMarket({
    programId,
    connection: connection,
    accounts: {
      hadoMarket: hadoMarket,
      userPubkey: userKeypair.publicKey,
    },
    sendTxn: sendTxnUserDevnet,
  });
};

const decodedTokenBuffersToUI = (decodedTokenState, tokenAddress: PublicKey) => {
  let amountNum = -1;
  try {
    amountNum = new BN(decodedTokenState.amount, 10, 'le').toNumber();
  } catch (err) {}

  return {
    tokenAccountPubkey: tokenAddress.toBase58(),
    mint: new PublicKey(decodedTokenState.mint).toBase58(),
    owner: new PublicKey(decodedTokenState.owner).toBase58(),
    amount: amountNum,
    amountBN: new BN(decodedTokenState.amount, 10, 'le'),
    delegateOption: !!decodedTokenState.delegateOption,
    delegate: new PublicKey(decodedTokenState.delegate).toBase58(),
    state: !!decodedTokenState.state,
    isNativeOption: !!decodedTokenState.isNativeOption,
    isNative: new BN(decodedTokenState.isNative, 10, 'le').toNumber(),
    delegatedAmount: new BN(decodedTokenState.delegatedAmount, 10, 'le'),
    closeAuthorityOption: !!decodedTokenState.closeAuthorityOption,
    closeAuthority: new PublicKey(decodedTokenState.closeAuthority).toBase58(),
  };
};

const getAllUserTokensModified = async () => {
  const connection = mainnetConnection;

  const userPubkey = new PublicKey('6CnQUFVk2d8TRvQa2Lr7KDvx9zK12Q4jkA7mmDtzj71e');
  const tokenAccounts = (
    await connection.getTokenAccountsByOwner(
      userPubkey,
      { programId: TOKEN_PROGRAM_ID },
      { commitment: 'singleGossip' },
    )
  ).value;
  const parsedAddresses = tokenAccounts
    .map((tokenAccount) =>
      decodedTokenBuffersToUI(AccountLayout.decode(tokenAccount.account.data), tokenAccount.pubkey),
    )
    .filter((token) => token.amount !== 0);

  console.log('parsedAddresses: ', parsedAddresses);
  // return parsedAddresses;
};
const getUsersTokenBalancesNew = async (userPubkey: PublicKey) => {
  const connection = mainnetConnection;
  const tokensRaw = await connection.getTokenAccountsByOwner(userPubkey, {
    programId: TOKEN_PROGRAM_ID,
  });
  const parsedTokens = tokensRaw.value
    .map((tokenRaw) => ({
      ...AccountLayout.decode(tokenRaw.account.data),
      tokenAccountPubkey: tokenRaw.pubkey.toBase58(),
    }))
    .map((tokenParsed) => ({
      ...tokenParsed,
      amount: Number(tokenParsed.amount.valueOf()),
      amountBN: new BN(Number(tokenParsed.amount.valueOf())),
      isNative: Number(tokenParsed.isNative.valueOf()),
      delegatedAmount: Number(tokenParsed.delegatedAmount.valueOf()),

      mint: tokenParsed.mint.toBase58(),
      owner: tokenParsed.owner.toBase58(),
      delegate: tokenParsed.delegate.toBase58(),
      closeAuthority: tokenParsed.closeAuthority.toBase58(),
    }))
    .filter((token) => token.amount > 0);

  return parsedTokens;
};

const migrateAllHadoMarketScript = async () => {
  const programId = FBONDS_MAINNET;
  const connection = mainnetConnection;
  const userKeypair = await createKeypairFromFile('/Users/gleblevin/.config/solana/mainDeploy.json');
  const sendTxnUserDevnet = async (txn, signers) =>
    void (await connection.sendTransaction(txn, [userKeypair, ...signers]).catch((err) => console.log(err)));
  const sendTxnPlaceHolder = async (): Promise<void> => await Promise.resolve();

  const { hadoMarkets, bondTradeTransactionsV2, fraktBonds, bondOffersV2 } =
    await fbonds.functions.getters.getAllPerpetualProgramAccounts(FBONDS_MAINNET, connection);

  const { fraktMarkets, whitelistEntries } = await frakt_market_registry.functions.getters.getAllProgramAccounts(
    FRAKT_MARKET_REGISTRY_MAINNET,
    connection,
  );

  const notCreatedFraktMarkets = fraktMarkets.filter(
    (fraktMarket) =>
      whitelistEntries.filter((entry) => entry.fraktMarket === fraktMarket.publicKey).length === 1 &&
      !hadoMarkets.find(
        (hadoMarket) =>
          whitelistEntries.find((entry) => entry.fraktMarket === fraktMarket.publicKey)?.whitelistedAddress ===
            hadoMarket.whitelistedAddress &&
          (hadoMarket.marketState === MarketState.AvailablePerpetual ||
            hadoMarket.marketState === MarketState.PrivateAvailablePerpetual),
      ),
  );

  const whitelistEntriesNotCreated = whitelistEntries.filter((entry) =>
    notCreatedFraktMarkets.find((fraktMarket) => entry.fraktMarket === fraktMarket.publicKey),
  );

  console.log(whitelistEntriesNotCreated.length, notCreatedFraktMarkets.length);
  whitelistEntriesNotCreated.length = 1;
  const results = await Promise.all(
    whitelistEntriesNotCreated.map(async (entry) => {
      const {
        account: privateMarket,
        instructions: privateInstructions,
        signers: privateSigners,
      } = await makePerpetualMarket({
        programId,
        connection: connection,

        args: {
          minBidCap: 1,
          minMarketFee: 10400,
          marketState: MarketState.PrivateAvailablePerpetual,
        },
        accounts: {
          fraktMarket: new PublicKey(entry.fraktMarket),
          userPubkey: userKeypair.publicKey,
          whitelistEntry: new PublicKey(entry.publicKey),
        },
        sendTxn: sendTxnPlaceHolder,
      });

      const {
        account: publicMarket,
        instructions: publicInstructions,
        signers: publicSigners,
      } = await makePerpetualMarket({
        programId,
        connection: connection,

        args: {
          minBidCap: 1,
          minMarketFee: 10400,
          marketState: MarketState.AvailablePerpetual,
        },
        accounts: {
          fraktMarket: new PublicKey(entry.fraktMarket),
          userPubkey: userKeypair.publicKey,
          whitelistEntry: new PublicKey(entry.publicKey),
        },
        sendTxn: sendTxnPlaceHolder,
      });

      const transaction = new web3.Transaction();
      const instructions = [...privateInstructions, ...publicInstructions];
      for (let instruction of instructions) transaction.add(instruction);

      const signers = [...privateSigners, ...publicSigners];
      await sendTxnUserDevnet(transaction, signers);

      const postMarket = async (hadoMarket, fraktMarket) => {
        const url = 'https://api.frakt.xyz/market-by-fraktMarket/' + fraktMarket;
        const response = await fetch(url);
        const result = await response.json();
        const responsePost = await fetch('https://api.banx.gg/admin/update-market', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            hadoMarket: hadoMarket,
            name: result.collectionName,
            imageUrl: result.collectionImage,
            secret: '36LiwBuWy3TvNrl4',
          }),
        });

        const data = await responsePost.json();
        console.log('metadata: ', data);
        console.log(result);
        console.log(entry.fraktMarket);
      };

      await postMarket(privateMarket.toBase58(), entry.fraktMarket);
      await postMarket(publicMarket.toBase58(), entry.fraktMarket);
    }),
  );

  console.log('Done');
};

const closeAdventuresScript = async () => {
  const userKeypair = await createKeypairFromFile(__dirname + '/keys/mainnet_admin.json');
  console.log('userKeypair: ', userKeypair.publicKey.toBase58());
  const connection = mainnetConnection;
  const sendTxnUserDevnet = async (txn, signers) =>
    void (await connection
      .sendTransaction(txn, [userKeypair, ...signers], { skipPreflight: false })
      .catch((err) => console.log(err)));
  const programId = FBONDS_MAINNET;
  const { stakingSettings, banxStakes, adventureSubscriptions, adventures, banxUsers } =
    await fbonds.functions.getters.getStakingAccounts(FBONDS_MAINNET, connection);

  const subscriptionsToRemove = adventureSubscriptions.filter(
    (sub) => (adventures.find((adv) => sub.adventure === adv.publicKey) as any)?.periodEndingAt < nowInSeconds(),
  );

  console.log('subscriptionsToRemove: ', subscriptionsToRemove.length);
  console.log('total: : ', adventureSubscriptions.length);
  // writeFileSync(__dirname + '/subscriptionsToRemove.json', JSON.stringify(subscriptionsToRemove, null, 2));

  // const fraktMarket = new anchor.web3.PublicKey('HrsMreAqj4ss19WDemwFCVnxnhgJ5tTNjt4k8cKzTmko');

  // const whitelistEntry = new anchor.web3.PublicKey('6GBJtSCQBRTwU9XmH3gxsfUvvGE9QBMrMTvB4kcEGiya');

  // const hadoMarket = new anchor.web3.PublicKey('9mCw8UDAV1w3UcrASDisGF4y3QZxAQXMRtYCJVQNiTsn');

  let count = 0;
  for (let sub of subscriptionsToRemove) {
    console.log('count: ', count++, ' / ', subscriptionsToRemove.length);
    const {} = await topSubscription({
      programId,
      connection: connection,

      accounts: {
        adventureSubscription: new PublicKey(sub.publicKey),
        userPubkey: userKeypair.publicKey,
        receiver: new PublicKey(sub.user),
      },
      sendTxn: sendTxnUserDevnet,
    });
  }
};

const getAllProgramAccountsScript = async () => {
  // new anchor.web3.PublicKey('DFsZgwKM3SvkvMwVRPQhhEnkYZCS1hZ2g2u6ehmAWjyc');
  // console.log('userKeypair: ', userKeypair.publicKey.toBase58());
  const connection = mainnetConnection;
  const { hadoMarkets } = await fbonds.functions.getters.getPerpetualStaticAccounts(FBONDS_MAINNET, connection);
  // const { adventureSubscriptions } = await fbonds.functions.getters.getActiveStakingAccounts(
  //   FBONDS_MAINNET,
  //   connection,
  // );
  // console.log(adventureSubscriptions.filter((sub) => sub.unsubscribedAt > 0)[0]);

  // console.log('more: ', adventureSubscriptions.filter((sub) => sub.unsubscribedAt > 0).length);

  // console.log('active: ', adventureSubscriptions.filter((sub) => sub.unsubscribedAt === 0).length);

  console.log(
    'hadoMarket: ',
    hadoMarkets.filter((market) => market.publicKey === 'J1QcsYCEMZHtJDn27N7278KXNabY7UHeuHDoatQUH2to'),
  );
  // const before = nowInSeconds()
  // const { hadespinLeaderboardEntrys} =
  //   await fbonds.functions.getters.getAllHadespinProgramAccounts(FBONDS_MAINNET, connection);

  // const specBonds = await getSpecificAccounts('fraktBond', FBONDS_MAINNET, connection)
  // writeFileSync(__dirname + '/bondPubkeys.json', JSON.stringify(specBonds.map(bond => bond.publicKey), null, 2));

  // console.log("bonds: ", specBonds.length)
  // console.log("nowDiff: ", nowInSeconds() - before)

  // const pubkeys = JSON.parse(readFileSync(__dirname + '/bondPubkeys.json', { encoding: 'utf8' }));
  // const specificAccountsByKeys = await getSpecificAccountsByKeys({
  //   programId: FBONDS_MAINNET,
  //   connection,
  //   accountId: "fraktBond",
  //   publicKeys: pubkeys.slice(0, 40000).map(key =>new PublicKey(key))
  // })

  // console.log("bonds by keys: ", specificAccountsByKeys.length)

  //   const after = nowInSeconds()

  // // console.log('offer: ', bondTradeTransactionsV2.filter(bondTradeTransactionsV2 =>bondTradeTransactionsV2.bondTradeTransactionState === BondTradeTransactionV2State.PerpetualPartialRepaid))

  // console.log("time diff: ", ( after- before));

  // console.log("tradeTxn: ", bondTradeTransactionsV2.find(tx => tx.publicKey === "6Nr6ZYNW62NEa3x5VRw6wtcrVXjzmw5FcxNmPVEBYUew"))
  // console.log("offerActive: ", bondOffersV2.filter(offer => offer.publicKey === "9pHqwRKWLsTmB6Qj8ptHVrxByeUDr753ZnKGtsE8bQRJ")) // next 9pHqwRKWLsTmB6Qj8ptHVrxByeUDr753ZnKGtsE8bQRJ
  // bondOffersSpecific:  [
  //   {
  //     hadoMarket: '9mCw8UDAV1w3UcrASDisGF4y3QZxAQXMRtYCJVQNiTsn',
  //     pairState: 'perpetualBondingCurveOnMarket',
  //     bondingCurve: { delta: 100000000, bondingType: 'linear' },
  //     baseSpotPrice: 400000000,
  //     mathCounter: 0,
  //     currentSpotPrice: 400000000,
  //     concentrationIndex: 513,
  //     bidCap: 100000000000000,
  //     bidSettlement: 0,
  //     edgeSettlement: 0,
  //     fundsSolOrTokenBalance: 900000000,
  //     buyOrdersQuantity: 3,
  //     lastTransactedAt: 1700836445,
  //     assetReceiver: '6JgexLq1STiDE3MvjvnsZqdevnoHMTeaM7FrJRNt2Mrg',
  //     validation: {
  //       loanToValueFilter: 400000000,
  //       durationFilter: 604800,
  //       maxReturnAmountFilter: 0,
  //       bondFeatures: 'autoReceiveAndReceiveNft'
  //     },
  //     publicKey: 'GYcgGksmYtvJVi2nwTgWcY5sUPHxSf3tdfPszfQ8oUNa'
  //   }
  // ]
  // const offer= new PublicKey("GYcgGksmYtvJVi2nwTgWcY5sUPHxSf3tdfPszfQ8oUNa")

  //   const bondOffersSpecific = await getSpecificAccountsByKeys({
  //     accountId: "bondOfferV2",
  //     connection,
  //     programId: FBONDS_MAINNET,
  //     publicKeys: [offer]
  //   })
  //   const [bondOfferVault, bondOfferVaultBump] = await web3.PublicKey.findProgramAddress(
  //     [
  //       ENCODER.encode(BOND_OFFER_VAULT_PREFIX),
  //       offer.toBuffer(),
  //     ],
  //     FBONDS_MAINNET,
  //   );
  //   const balance = await mainnetConnection.getBalance(bondOfferVault);
  //   console.log("bondOffersSpecific: ", bondOffersSpecific)
  //   console.log("balance: ", balance)
  // const overPaidFees = bondTradeTransactionsV2.filter(tradeTxn => tradeTxn.seller === "ChEoG1BSLLreRivWUzou5UZNqRNmos5BNnt4Bh8od8Qg")
  // .filter(tradeTxn => tradeTxn.bondTradeTransactionState === BondTradeTransactionV2State.PerpetualRefinancedActive ||tradeTxn.bondTradeTransactionState === BondTradeTransactionV2State.PerpetualRefinanceRepaid)
  // .reduce((acc, trade ) => acc + trade.feeAmount, 0);

  // console.log("overPaidFees: ", overPaidFees)

  // const nftMint = new PublicKey("C8QriqukD91xNT41mxP5kptM71Dh83gudBUwMiKtaQj2");
  // console.log("stake: ", banxStakes.find(stake => stake.publicKey === "9hhLXmQwbrxSCB2Au15boc2qivnDoZLpoNx6rLUJpZjV"))

  // const userTokenAccount = await findAssociatedTokenAddress(new PublicKey("A7zFvsW6bo6vUL5KDb9atQ1mtszmjSmLgGmcvfY3CShy"), nftMint);

  // const ownerTokenRecord = findTokenRecordPda(nftMint, userTokenAccount);
  // const tokenRecordData =await TokenRecord.fromAccountAddress(connection, ownerTokenRecord)
  // console.log({userTokenAccount})
  // console.log({tokenRecordData})
  // console.log("overPaidFees: ", overPaidFees / 1e9)

  // const overPaidFees = bondTradeTransactionsV2.filter(tradeTxn => tradeTxn.seller === "9koepu1KGbWGvZLFiRzTQRqHzqjKGZULxSkQpqoRnChv")
  // .filter(tradeTxn => tradeTxn.bondTradeTransactionState === BondTradeTransactionV2State.PerpetualRefinancedActive ||tradeTxn.bondTradeTransactionState === BondTradeTransactionV2State.PerpetualRefinanceRepaid)
  // .reduce((acc, trade ) => acc + trade.feeAmount, 0);
  // console.log("overPaidFees: ", overPaidFees / 1e9)

  // const offersSum = bondOffersV2.reduce((acc, offer) => acc + offer.fundsSolOrTokenBalance, 0)
  // const [mutualBondTradeTxnVault] = await web3.PublicKey.findProgramAddress(
  //   [ENCODER.encode(MUTUAL_BOND_TRADE_TXN_VAULT)],
  //   FBONDS_MAINNET
  // );

  // const mutualBalance = await mainnetConnection.getBalance(mutualBondTradeTxnVault);

  // const isMutualBalanceOk = offersSum === mutualBalance;
  // console.log({
  //   offersSum,
  //   mutualBalance
  // })
  // console.log("bondOffersV2: ", bondOffersV2)
  // console.log(
  //   hadoMarkets.filter((market) => market.whitelistedAddress === 'tS2srkdCZeqnzrFt25PbBFg4KoVJB4WtPUJnVidsY4p'),
  // );

  // console.log(
  //   bondTradeTransactionsV2.filter((market) => market.publicKey === '3xH84Cb9BJwv6t6vY5u3Xt1v13tbWcREEzgX3yJ2tkfn'),
  // );
  // const bondOffers: BondOfferV2[] = await fbonds.functions.getters.getSpecificAccounts(
  //   'bondOfferV2',
  //   FBONDS_MAINNET,
  //   connection,
  // );
  // console.log('bond trade txn: ', bondTradeTransactionsV2[0]);

  // const program = await returnAnchorProgram(FBONDS_MAINNET, connection);
  // console.log(
  //   'bondOffersV2: ',
  //   bondOffersV2.filter((offer) => offer.pairState == PairState.PerpetualOnMarket),
  // );

  // const liteOffers = bondOffers.filter((offer) => offer.validation.loanToValueFilter === BASE_POINTS);
  // const ltvOffers = bondOffers.filter((offer) => offer.validation.loanToValueFilter !== BASE_POINTS);

  // const liteOffersLiquidity = liteOffers.reduce((acc, offer) => offer.fundsSolOrTokenBalance + acc, 0);
  // const ltvOffersLiquidity = ltvOffers.reduce((acc, offer) => offer.fundsSolOrTokenBalance + acc, 0);

  // // console.log(

  // console.log('liteOffers: ', liteOffers.length);
  // console.log('ltvOffers: ', ltvOffers.length);

  // console.log('liteOffersLiquidity: ', liteOffersLiquidity / 1e9);
  // console.log('ltvOffersLiquidity: ', ltvOffersLiquidity / 1e9);

  //   'bond: ',
  //   fraktBonds.find((bond) => bond.publicKey === 'BUvxjYgzvXRiBZJATR3L8srjrxBDLTADB6ucfxN4qL2A'),
  // );

  // console.log('hadoMarkets: ', hadoMarkets);
  // const bond = fraktBonds.find((bond) => bond.publicKey === '9DeHyLjuXEnX86wo6vX5Cqi18gep2xy27GKLaETPFp3W') as any;

  // // console.log(
  // //   'tradeTxn: ',
  // //   bondTradeTransactionsV2.find((txn) => txn.publicKey === 'DXCoSEMweJfPNh8e3JR38myKy25cChm8dduo2cDLbhek'),
  // // );
  // const tradeTxn = bondTradeTransactionsV2.find((bondtrade) => bondtrade.fbondTokenMint === bond.publicKey) as any;
  // // console.log('bond: ', bond);
  // // console.log('tradeTxn: ', tradeTxn);
  // const allLenderActivity = getPerpetualLenderActivity({
  //   fraktBond: bond,
  //   bondTradeTransaction: {
  //     ...tradeTxn,
  //     // bondTradeTransactionState: BondTradeTransactionV2State.PerpetualLiquidatedByClaim,
  //   },
  // });
  // console.log('allLenderActivity: ', allLenderActivity);

  // const allBorrowerActivity = getPerpetualBorrowerActivity({
  //   fraktBond: { ...bond },
  //   bondTradeTransaction: {
  //     ...tradeTxn,
  //     // bondTradeTransactionState: BondTradeTransactionV2State.PerpetualLiquidatedByClaim,
  //   },
  //   // apr: tradeTxn.amountOfBonds,
  //   // bondTradeTransaction: {
  //   //   ...tradeTxn,
  //   //   // bondTradeTransactionState: BondTradeTransactionV2State.PerpetualLiquidatedByClaim,
  //   // },
  // });
  // console.log('allBorrowerActivity: ', allBorrowerActivity);

  // console.log(
  //   'hadoMarket: ',
  //   hadoMarkets.find((market) => market.publicKey === '3uWkWzePvoaETULR3RMU5gxUmuDCnu1VPTqox5PTwwCy'),
  // );
  // console.log('bondTradeTxns: ', bondTradeTransactionsV2);
  // console.log('hadomarket: ', hadoMarkets)
  // console.log('bondTradeTransactionsV2: ', bondTradeTransactionsV2.length);

  // console.log('hadoMarkets: ', hadoMarkets.length);

  // const bondTxns = await fbonds.functions.getters.getSpecificAccounts(
  //   'bondTradeTransactionV2',
  //   FBONDS_MAINNET,
  //   connection,
  // );
  // const offers: BondOfferV2[] = await fbonds.functions.getters.getSpecificAccounts(
  //   'bondOfferV2',
  //   FBONDS_MAINNET,
  //   connection,
  // );

  // console.log(
  //   'txn: ',
  //   bondTxns.find((txn) => txn.fbondTokenMint === '5of8SrvQaTXLzS5EjKDYTTW5ckQVEyzRgBnybYjikdqo'),
  // );
  // console.log(
  //   'offer: ',
  //   offers.filter((offer) => offer.pairState === PairState.PerpetualOnMarket),
  // );
  // console.log(
  //   'hadoMarkets: ',
  //   hadoMarkets.filter((market) => market.marketState === MarketState.PrivateAvailablePerpetual),
  // );
  // const bondOffers: BondOfferV2[] = await fbonds.functions.getters.getSpecificAccounts(
  //   'bondOfferV2',
  //   FBONDS_MAINNET,
  //   connection,
  // );

  // console.log(
  //   'bondOffers: ',
  //   bondOffers.filter((market) => market.hadoMarket === '9mCw8UDAV1w3UcrASDisGF4y3QZxAQXMRtYCJVQNiTsn'),
  // );
  // const bonds: FraktBond[] = await fbonds.functions.getters.getSpecificAccounts(
  //   'fraktBond',
  //   FBONDS_MAINNET,
  //   connection,
  // );

  // console.log('boxes length: ', boxes.length);
  // console.log(
  //   'boxes: ',
  //   boxes.filter((box) => box.collateralTokenMint === '3AKTJTcAtxqZfweGJ19rqeGiiw5Rgpt3nDpLTbo1vSK5'),
  // );

  // const currentTimestamp = Math.floor(new Date().getTime() / 1000);

  // const weeks = adventureTimestampToWeeks(currentTimestamp);
  // const weekStart = weeksToAdventureTimestamp(weeks);
  // const diffCurrentWeek = currentTimestamp - weekStart;
  // // if (diffCurrentWeek <= 86400) {
  // //   args.weeksOfSubscriptions = args.weeksOfSubscriptions.find((week) => week === weeks)
  // //     ? args.weeksOfSubscriptions
  // //     : [weeks, ...args.weeksOfSubscriptions];
  // // }

  // console.log(
  //   'actual adventure: ',
  //   adventures.find((adventure) => adventure.periodStartedAt === weeksToAdventureTimestamp(weeks)),
  // );

  // console.log('diffCurrentWeek: ', diffCurrentWeek);
  // console.log('weeks: ', weeks);

  // console.log('userRevenue: ', userRevenue);

  // console.log(adventures); // 5ifP7kyvajkbEqnmZCAAxxz9rdmkup1kCCoPBoKKcgjZ

  // console.log("subscripti")

  // // console.log('adventures: ', adventures);

  // console.log(
  //   'closest_banx_to_liquidate: ',
  //   minBy(
  //     fraktBonds.filter(
  //       (bond) => bond.banxStake != EMPTY_PUBKEY.toBase58() && bond.fraktBondState == FraktBondState.Active,
  //     ),
  //     (bond) => bond.liquidatingAt,
  //   ),
  // );
  // const { bondTradeTransactionsV2 } = await fbonds.functions.getters.getAllProgramAccounts(FBONDS_MAINNET, connection);
  // console.log(
  //   'banxStake: ',
  //   banxStakes.find(
  //     (stake) => stake.nftMint == 'https://solscan.io/address/CrxGhCDhLktnuywtR8V6zYJq7tCbrtmgXVJczc3xph7e',
  //   ),
  // );

  // console.log(
  //   'hadoMarketRegistry: ',
  //   hadoMarketRegistry.filter((registry) => registry.hadoMarket === 'DRFLEcG8PGatbyQUEFAJmoZBgGnmRibq6H3yfkumcWbn'),
  // );
  // console.log(
  //   'bond: ',
  //   fraktBonds.find(
  //     (bond) => bond.fbondIssuer === '6CnQUFVk2d8TRvQa2Lr7KDvx9zK12Q4jkA7mmDtzj71e' && bond.activatedAt > 1688101374,
  //   ),
  // );
  // console.log(
  //   'activeBonds: ',
  //   bondTradeTransactionsV2.filter((txn) => txn.fbondTokenMint === 'HqG9iqgHVyBqkaKCnat1U2AmT1DuvmxnkDEWnEmmsRTg'),
  // );
  //HqG9iqgHVyBqkaKCnat1U2AmT1DuvmxnkDEWnEmmsRTg
  // const { fraktMarkets, whitelistEntries, oracleFloors } =
  //   await frakt_market_registry.functions.getters.getAllProgramAccounts(FRAKT_MARKET_REGISTRY_MAINNET, connection);

  // console.log(
  //   'whitelist: ',
  //   whitelistEntries.filter((entry) => entry.fraktMarket == 'GH23we5PsTSoCqRyK9Ee5b2uyD8MawTChvUuCEAKvh68'),
  // );
};

const takeStakingSnapshot = async () => {
  // new anchor.web3.PublicKey('DFsZgwKM3SvkvMwVRPQhhEnkYZCS1hZ2g2u6ehmAWjyc');
  // console.log('userKeypair: ', userKeypair.publicKey.toBase58());
  const connection = mainnetConnection;
  const { stakingSettings, banxStakes, adventureSubscriptions, adventures, banxUsers } =
    await fbonds.functions.getters.getStakingAccounts(FBONDS_MAINNET, connection);

  const adventure = adventures.find((adventure) => adventure.periodStartedAt === weeksToAdventureTimestamp(9));
  console.log('adventure: ', adventure);
  const subscriptionDistribution = adventureSubscriptions.filter(
    (subscription) =>
      subscription.adventure === adventure?.publicKey &&
      (subscription.unsubscribedAt > adventure?.periodEndingAt ||
        subscription.harvestedAt > adventure?.periodEndingAt ||
        (subscription.unsubscribedAt === 0 && subscription.harvestedAt === 0)),
  );

  console.log('sub sample: ', subscriptionDistribution[531]);
  console.log(
    'subscriptionPoints: ',
    subscriptionDistribution.reduce(
      (acc, sub) => acc + (banxStakes.find((stake) => stake.publicKey === sub.stake) as any)?.partnerPoints,
      0,
    ),
  );
  const grouppedByUsers = groupBy(subscriptionDistribution, (subscription) => subscription.user);

  const usersPartnerPoints = Object.keys(grouppedByUsers).map((user) => ({
    user,
    points: grouppedByUsers[user].reduce(
      (acc, subscription) =>
        acc + (banxStakes.find((stake) => stake.publicKey === subscription.stake)?.partnerPoints || 0),
      0,
    ),
    userProfilePoints: banxUsers.find((userBanx) => userBanx.user === user)?.stakedPartnerPoints,
    stakedBanx: banxUsers.find((userBanx) => userBanx.user === user)?.stakedBanx,
  }));

  const userRevenue = usersPartnerPoints.map((userPoints) => ({
    user: userPoints.user,
    points: userPoints.points,
    stakedBanx: userPoints.stakedBanx,
    revenueShare: (userPoints.points * 2500) / (adventure?.partnerPointsLeft || 0),
  }));

  console.log(
    'allPoints: ',
    userRevenue.reduce((acc, rev) => rev.points + acc, 0),
  );
  writeFileSync(__dirname + '/userRevenue3.json', JSON.stringify(userRevenue, null, 2));
};
const addMerkleTreeWhitelistEntryToFraktMarketScript = async () => {
  const userKeypair = await createKeypairFromFile(__dirname + '/keys/frakt_market_admin.json');
  const connection = mainnetConnection;
  const sendTxnUserDevnet = async (txn, signers) =>
    void (await connection.sendTransaction(txn, [userKeypair, ...signers]).catch((err) => console.log(err)));
  const programId = FRAKT_MARKET_REGISTRY_MAINNET;
  // new anchor.web3.PublicKey('DFsZgwKM3SvkvMwVRPQhhEnkYZCS1hZ2g2u6ehmAWjyc');
  // console.log('userKeypair: ', userKeypair.publicKey.toBase58());
  const whitelistType = fbonds.types.NftValidationWhitelistType.MerkleTree;
  const fraktMarket = new anchor.web3.PublicKey('CA97Eq4gLoXVkY5Y7UAZTyh1s4bHWWTikwy4kJZCHhCL');

  // const fraktWhitelist = whitelists.find((wl) => wl.name === 'FRAKT');
  const funnyBearsWhitelist = JSON.parse(
    await lazyFs().readFile(__dirname + '/funny_bears_mintlist.json', { encoding: 'utf8' }),
  );
  const leaves: any = funnyBearsWhitelist
    .sort((a, b) => ('' + a).localeCompare(b))
    .map((leaf) => new PublicKey(leaf).toBuffer());
  // console.log(leaves.slice(0, 10));

  const tree = new MerkleTree(leaves, keccak256, {
    sortPairs: true,
    hashLeaves: true,
  });
  const root = tree.getRoot();
  console.log('root: ', root.toJSON());
  console.log('hashes length: ', funnyBearsWhitelist.length);

  const { account: whitelistPubkey } = await frakt_market_registry.functions.marketFactory.addWhitelistToMarket({
    programId,
    connection: connection,
    args: {
      whitelistType,
      root,
    },
    accounts: {
      fraktMarket: fraktMarket,
      whitelistedAddress: EMPTY_PUBKEY,
      userPubkey: userKeypair.publicKey,
    },
    sendTxn: sendTxnUserDevnet,
  });

  // console.log('whitelistPubkey: ', whitelistPubkey.toBase58());
};

const removeWhitelistFromMarketScript = async () => {
  const userKeypair = await createKeypairFromFile(__dirname + '/keys/frakt_market_admin.json');
  const connection = mainnetConnection;
  const sendTxnUserDevnet = async (txn, signers) =>
    void (await connection.sendTransaction(txn, [userKeypair, ...signers]).catch((err) => console.log(err)));
  const programId = FRAKT_MARKET_REGISTRY_MAINNET;
  // new anchor.web3.PublicKey('DFsZgwKM3SvkvMwVRPQhhEnkYZCS1hZ2g2u6ehmAWjyc');
  // console.log('userKeypair: ', userKeypair.publicKey.toBase58());
  // const whitelistType = fbonds.types.NftValidationWhitelistType.Creator;
  const fraktMarket = new anchor.web3.PublicKey('7ytHEEN2PPczNYLE4X66u15ZMUGDqvUrVFpuPS3Vgj2F');

  const whitelisted_address = new anchor.web3.PublicKey('ES2iF5ctjqvtopPn4n6K7c9fdHjYg41rYXL2XzJK37jF');

  const {} = await frakt_market_registry.functions.marketFactory.removeWhitelistFromMarket({
    programId,
    connection: connection,
    accounts: {
      fraktMarket: fraktMarket,
      whitelistedAddress: whitelisted_address,
      userPubkey: userKeypair.publicKey,
    },
    sendTxn: sendTxnUserDevnet,
  });

  // console.log('whitelistPubkey: ', whitelistPubkey.toBase58());
};

const addToWhitelistEntryToFraktMarketScript = async () => {
  const userKeypair = await createKeypairFromFile(__dirname + '/keys/frakt_market_admin.json');
  const connection = mainnetConnection;
  const sendTxnUserDevnet = async (txn, signers) =>
    void (await connection.sendTransaction(txn, [userKeypair, ...signers]).catch((err) => console.log(err)));
  const programId = FRAKT_MARKET_REGISTRY_MAINNET;
  // new anchor.web3.PublicKey('DFsZgwKM3SvkvMwVRPQhhEnkYZCS1hZ2g2u6ehmAWjyc');
  // console.log('userKeypair: ', userKeypair.publicKey.toBase58());
  const whitelistType = fbonds.types.NftValidationWhitelistType.CollectionId;
  const fraktMarket = new anchor.web3.PublicKey('7ytHEEN2PPczNYLE4X66u15ZMUGDqvUrVFpuPS3Vgj2F');

  const whitelisted_address = new anchor.web3.PublicKey('ES2iF5ctjqvtopPn4n6K7c9fdHjYg41rYXL2XzJK37jF');

  const { account: whitelistPubkey } = await frakt_market_registry.functions.marketFactory.addWhitelistToMarket({
    programId,
    connection: connection,
    args: {
      whitelistType,
    },
    accounts: {
      fraktMarket: fraktMarket,
      whitelistedAddress: whitelisted_address,
      userPubkey: userKeypair.publicKey,
    },
    sendTxn: sendTxnUserDevnet,
  });

  // console.log('whitelistPubkey: ', whitelistPubkey.toBase58());
};

const activateFraktMarketScript = async () => {
  const userKeypair = await createKeypairFromFile(__dirname + '/keys/frakt_market_admin.json');
  const connection = mainnetConnection;
  const sendTxnUserDevnet = async (txn, signers) =>
    void (await connection.sendTransaction(txn, [userKeypair, ...signers]).catch((err) => console.log(err)));
  const programId = FRAKT_MARKET_REGISTRY_MAINNET;
  const fraktMarket = new anchor.web3.PublicKey('7ytHEEN2PPczNYLE4X66u15ZMUGDqvUrVFpuPS3Vgj2F');

  const {} = await frakt_market_registry.functions.marketFactory.activateFraktMarket({
    programId,
    connection: connection,
    accounts: {
      fraktMarket: fraktMarket,
      userPubkey: userKeypair.publicKey,
    },
    sendTxn: sendTxnUserDevnet,
  });
};
// DRFLEcG8PGatbyQUEFAJmoZBgGnmRibq6H3yfkumcWbn

const updateHadomarketFeeScript = async () => {
  const userKeypair = await createKeypairFromFile(__dirname + '/keys/frakt_market_admin.json');
  const connection = mainnetConnection;
  const sendTxnUserDevnet = async (txn, signers) =>
    void (await connection.sendTransaction(txn, [userKeypair, ...signers]).catch((err) => console.log(err)));
  const programId = FBONDS_MAINNET;
  const hadoMarket = new anchor.web3.PublicKey('DRFLEcG8PGatbyQUEFAJmoZBgGnmRibq6H3yfkumcWbn');

  const {} = await updateHadoMarketFee({
    programId,
    args: {
      marketFee: 9900,
    },
    connection: connection,
    accounts: {
      hadoMarket: hadoMarket,
      userPubkey: userKeypair.publicKey,
    },
    sendTxn: sendTxnUserDevnet,
  });
};

const makePerpetualMarketScript = async () => {
  const userKeypair = await createKeypairFromFile('/Users/gleblevin/.config/solana/mainDeploy.json');
  const connection = mainnetConnection;
  const sendTxnUserDevnet = async (txn, signers) =>
    void (await connection.sendTransaction(txn, [userKeypair, ...signers]).catch((err) => console.log(err)));
  const programId = FBONDS_MAINNET;
  const fraktMarket = new anchor.web3.PublicKey('HrsMreAqj4ss19WDemwFCVnxnhgJ5tTNjt4k8cKzTmko');
  const whitelistEntry = new anchor.web3.PublicKey('6GBJtSCQBRTwU9XmH3gxsfUvvGE9QBMrMTvB4kcEGiya');

  const { account } = await makePerpetualMarket({
    programId,
    connection: connection,

    args: {
      minBidCap: 1,
      minMarketFee: 0,
      marketState: MarketState.AvailablePerpetual,
    },
    accounts: {
      fraktMarket: fraktMarket,
      userPubkey: userKeypair.publicKey,
      whitelistEntry: whitelistEntry,
    },
    sendTxn: sendTxnUserDevnet,
  });

  console.log('hadoMarket: ', account.toBase58());
};

const fixClaimbyAdminScript = async () => {
  const userKeypair = await createKeypairFromFile(__dirname + '/keys/whitelister.json');
  const connection = mainnetConnection;
  const sendTxnUserDevnet = async (txn, signers) =>
    void (await connection.sendTransaction(txn, [userKeypair, ...signers]).catch((err) => console.log(err)));
  const programId = FBONDS_MAINNET;
  const bondTradeTxn = new anchor.web3.PublicKey('CdWm9RygHNQJdHZN2YmxjL4vmEDQkYvQVjGnvDTzAzCx');

  const { bondTradeTransactionsV2 } = await getPerpetualActiveAccounts(programId, connection);

  const neededTradeTxn = bondTradeTransactionsV2.filter((tx) => tx.publicKey === bondTradeTxn.toBase58());

  console.log('needed txn: ', neededTradeTxn);
  const { account } = await claimPerpetualLoanTest({
    programId,
    connection: connection,

    accounts: {
      userPubkey: userKeypair.publicKey,
      bondOffer: new PublicKey(neededTradeTxn[0].bondOffer),
      bondTradeTransaction: new PublicKey(neededTradeTxn[0].publicKey),
      fbond: new PublicKey(neededTradeTxn[0].fbondTokenMint),
    },
    optimistic: {} as any,
    sendTxn: sendTxnUserDevnet,
  });

  // console.log('hadoMarket: ', account.toBase58());
};

const changePerpetualMarketScript = async () => {
  const userKeypair = await createKeypairFromFile(__dirname + '/keys/frakt_market_admin.json');
  const connection = mainnetConnection;
  const sendTxnUserDevnet = async (txn, signers) =>
    void (await connection.sendTransaction(txn, [userKeypair, ...signers]).catch((err) => console.log(err)));
  const programId = FBONDS_MAINNET;
  const fraktMarket = new anchor.web3.PublicKey('HrsMreAqj4ss19WDemwFCVnxnhgJ5tTNjt4k8cKzTmko');

  const whitelistEntry = new anchor.web3.PublicKey('6GBJtSCQBRTwU9XmH3gxsfUvvGE9QBMrMTvB4kcEGiya');

  const hadoMarket = new anchor.web3.PublicKey('9mCw8UDAV1w3UcrASDisGF4y3QZxAQXMRtYCJVQNiTsn');

  const { account } = await updatePerpetualMarket({
    programId,
    connection: connection,

    accounts: {
      fraktMarket: fraktMarket,
      userPubkey: userKeypair.publicKey,
      whitelistEntry,
      hadoMarket,
    },
    sendTxn: sendTxnUserDevnet,
  });

  // console.log('hadoMarket: ', account.toBase58());
};

const changePerpetualMarketInterestScript = async () => {
  const userKeypair = await createKeypairFromFile(__dirname + '/keys/whitelister.json');
  console.log('user: ', userKeypair.publicKey.toBase58());
  const connection = mainnetConnection;
  const sendTxnUserDevnet = async (txn, signers) =>
    void (await connection.sendTransaction(txn, [userKeypair, ...signers]).catch((err) => console.log(err)));
  const programId = FBONDS_MAINNET;

  const { hadoMarkets, bondTradeTransactionsV2, fraktBonds, bondOffersV2 } =
    await fbonds.functions.getters.getAllPerpetualProgramAccounts(FBONDS_MAINNET, connection);

  let count = 0;
  for (let market of hadoMarkets) {
    console.log('count: ', count++, ' / ', hadoMarkets.length);
    const { account } = await updateInterestPerpetualMarket({
      programId,
      connection: connection,

      args: {
        minMarketFee: 3380,
      },

      accounts: {
        userPubkey: userKeypair.publicKey,
        hadoMarket: new PublicKey(market.publicKey),
      },
      sendTxn: sendTxnUserDevnet,
    });
  }
  // console.log('hadoMarket: ', account.toBase58());
};

const makePerpetualOfferScript = async () => {
  const userKeypair = await createKeypairFromFile(__dirname + '/keys/second_dev_wallet.json');
  const connection = mainnetConnection;
  const sendTxnUserDevnet = async (txn, signers) =>
    void (await connection.sendTransaction(txn, [userKeypair, ...signers]).catch((err) => console.log(err)));
  const programId = FBONDS_MAINNET;
  console.log('user: ', userKeypair.publicKey.toBase58());
  const hadoMarket = new anchor.web3.PublicKey('9mCw8UDAV1w3UcrASDisGF4y3QZxAQXMRtYCJVQNiTsn');
  const userKey = new anchor.web3.PublicKey('6CnQUFVk2d8TRvQa2Lr7KDvx9zK12Q4jkA7mmDtzj71e');

  const { optimisticResult } = await createPerpetualBondOffer({
    programId,
    connection: connection,

    args: {
      loanValue: 1 * 1e9,
      amountOfLoans: 1,
    },
    accounts: {
      hadoMarket: hadoMarket,
      userPubkey: userKey,
    },
    sendTxn: () => Promise.resolve(),
  });
  console.log(optimisticResult);

  // console.log('hadoMarket: ', account.toBase58());
};

const updatePerpetualOfferScript = async () => {
  const userKeypair = await createKeypairFromFile(__dirname + '/keys/second_dev_wallet.json');
  const connection = mainnetConnection;
  const sendTxnUserDevnet = async (txn, signers) =>
    void (await connection.sendTransaction(txn, [userKeypair, ...signers]).catch((err) => console.log(err)));
  const programId = FBONDS_MAINNET;
  console.log('user: ', userKeypair.publicKey.toBase58());
  const bondOffer = new anchor.web3.PublicKey('5mxSZxG9JSwWG9bf3rVG2jC4GyDqemdF9gKQM4AKSpGw');
  const userKey = new anchor.web3.PublicKey('6CnQUFVk2d8TRvQa2Lr7KDvx9zK12Q4jkA7mmDtzj71e');

  const optimistic = {
    bondOffer: {
      hadoMarket: '9mCw8UDAV1w3UcrASDisGF4y3QZxAQXMRtYCJVQNiTsn',
      pairState: PairState.PerpetualOnMarket,
      bondingCurve: { delta: 0, bondingType: BondingCurveType.Linear },
      baseSpotPrice: 1000000000,
      mathCounter: 0,
      currentSpotPrice: 1000000000,
      concentrationIndex: 0,
      bidCap: 100000000000000,
      bidSettlement: -99999000000000,
      edgeSettlement: 1000000000,
      fundsSolOrTokenBalance: 3000000000,
      buyOrdersQuantity: 1,
      lastTransactedAt: 1692149055,
      assetReceiver: '6CnQUFVk2d8TRvQa2Lr7KDvx9zK12Q4jkA7mmDtzj71e',
      validation: {
        loanToValueFilter: 0,
        durationFilter: 604800,
        maxReturnAmountFilter: 0,
        bondFeatures: BondFeatures.AutoReceiveAndReceiveNft,
      },
      publicKey: '5mxSZxG9JSwWG9bf3rVG2jC4GyDqemdF9gKQM4AKSpGw',
    },
  };
  const { optimisticResult } = await updatePerpetualOffer({
    programId,
    connection: connection,

    args: {
      loanValue: 0.5 * 1e9,
      amountOfLoans: 4,
    },
    accounts: {
      bondOfferV2: bondOffer,
      userPubkey: userKey,
    },
    optimistic: optimistic,
    sendTxn: () => Promise.resolve(),
  });
  console.log(optimisticResult);

  // console.log('hadoMarket: ', account.toBase58());
};

const removePerpetualOfferScript = async () => {
  const userKeypair = await createKeypairFromFile(__dirname + '/keys/second_dev_wallet.json');
  const connection = mainnetConnection;
  const sendTxnUserDevnet = async (txn, signers) =>
    void (await connection.sendTransaction(txn, [userKeypair, ...signers]).catch((err) => console.log(err)));
  const programId = FBONDS_MAINNET;
  console.log('user: ', userKeypair.publicKey.toBase58());
  const bondOffer = new anchor.web3.PublicKey('5mxSZxG9JSwWG9bf3rVG2jC4GyDqemdF9gKQM4AKSpGw');
  const userKey = new anchor.web3.PublicKey('6CnQUFVk2d8TRvQa2Lr7KDvx9zK12Q4jkA7mmDtzj71e');

  const optimistic = {
    bondOffer: {
      hadoMarket: '9mCw8UDAV1w3UcrASDisGF4y3QZxAQXMRtYCJVQNiTsn',
      pairState: PairState.PerpetualOnMarket,
      bondingCurve: { delta: 0, bondingType: BondingCurveType.Linear },
      baseSpotPrice: 1000000000,
      mathCounter: 0,
      currentSpotPrice: 1000000000,
      concentrationIndex: 0,
      bidCap: 100000000000000,
      bidSettlement: -99999000000000,
      edgeSettlement: 1000000000,
      fundsSolOrTokenBalance: 3000000000,
      buyOrdersQuantity: 1,
      lastTransactedAt: 1692149055,
      assetReceiver: '6CnQUFVk2d8TRvQa2Lr7KDvx9zK12Q4jkA7mmDtzj71e',
      validation: {
        loanToValueFilter: 0,
        durationFilter: 604800,
        maxReturnAmountFilter: 0,
        bondFeatures: BondFeatures.AutoReceiveAndReceiveNft,
      },
      publicKey: '5mxSZxG9JSwWG9bf3rVG2jC4GyDqemdF9gKQM4AKSpGw',
    },
  };
  const { optimisticResult } = await removePerpetualOffer({
    programId,
    connection: connection,

    accounts: {
      bondOfferV2: bondOffer,
      userPubkey: userKey,
    },
    optimistic: optimistic,
    sendTxn: () => Promise.resolve(),
  });
  console.log(optimisticResult);

  // console.log('hadoMarket: ', account.toBase58());
};

const borrowPerpetialScript = async () => {
  const userKeypair = await createKeypairFromFile(__dirname + '/keys/second_dev_wallet.json');
  const connection = mainnetConnection;
  const sendTxnUserDevnet = async (txn, signers) =>
    void (await connection.sendTransaction(txn, [userKeypair, ...signers]).catch((err) => console.log(err)));
  const programId = FBONDS_MAINNET;
  const protocolFeeReceiver = new anchor.web3.PublicKey('9J4yDqU6wBkdhP5bmJhukhsEzBkaAXiBmii52kTdxpQq');

  const hadoMarket = new anchor.web3.PublicKey('9mCw8UDAV1w3UcrASDisGF4y3QZxAQXMRtYCJVQNiTsn');

  const bondOffer = new anchor.web3.PublicKey('5mxSZxG9JSwWG9bf3rVG2jC4GyDqemdF9gKQM4AKSpGw');

  const tokenMint = new anchor.web3.PublicKey('BhjoLWG2APLtNZUFVjrh627srMPwdao5uMXcUPD9r2qv');
  const userPubkey = new anchor.web3.PublicKey('6CnQUFVk2d8TRvQa2Lr7KDvx9zK12Q4jkA7mmDtzj71e');

  const optimistic = {
    fraktMarket: 'HrsMreAqj4ss19WDemwFCVnxnhgJ5tTNjt4k8cKzTmko',
    minMarketFee: 10400,
    bondOffer: {
      hadoMarket: '9mCw8UDAV1w3UcrASDisGF4y3QZxAQXMRtYCJVQNiTsn',
      pairState: PairState.PerpetualOnMarket,
      bondingCurve: { delta: 0, bondingType: BondingCurveType.Linear },
      baseSpotPrice: 1000000000,
      mathCounter: 0,
      currentSpotPrice: 1000000000,
      concentrationIndex: 0,
      bidCap: 100000000000000,
      bidSettlement: -99999000000000,
      edgeSettlement: 1000000000,
      fundsSolOrTokenBalance: 3000000000,
      buyOrdersQuantity: 1,
      lastTransactedAt: 1692149055,
      assetReceiver: '6JgexLq1STiDE3MvjvnsZqdevnoHMTeaM7FrJRNt2Mrg',
      validation: {
        loanToValueFilter: 0,
        durationFilter: 604800,
        maxReturnAmountFilter: 0,
        bondFeatures: BondFeatures.AutoReceiveAndReceiveNft,
      },
      publicKey: '5mxSZxG9JSwWG9bf3rVG2jC4GyDqemdF9gKQM4AKSpGw',
    },
  };

  const { optimisticResults } = await borrowPerpetual({
    programId,
    connection: connection,
    addComputeUnits: true,
    args: {
      perpetualBorrowParamsAndAccounts: [
        {
          amountOfSolToGet: 50000000,
          bondOfferV2: bondOffer,
          hadoMarket: hadoMarket,
          tokenMint: tokenMint,
          optimistic: optimistic,
        },
      ],
    },
    accounts: {
      userPubkey: userPubkey,
      protocolFeeReceiver: protocolFeeReceiver,
    },
    sendTxn: () => Promise.resolve(),
  });
  console.log(optimisticResults);
};
const repayPerpetualScript = async () => {
  const userKeypair = await createKeypairFromFile(__dirname + '/keys/second_dev_wallet.json');
  const connection = mainnetConnection;
  const sendTxnUserDevnet = async (txn, signers) =>
    void (await connection.sendTransaction(txn, [userKeypair, ...signers]).catch((err) => console.log(err)));
  const programId = FBONDS_MAINNET;

  const userPubkey = new anchor.web3.PublicKey('6CnQUFVk2d8TRvQa2Lr7KDvx9zK12Q4jkA7mmDtzj71e');
  const bondTradeTransaction = new anchor.web3.PublicKey('3BsKGZvUNxAn9y9huWRnJYk9xLQpkWoRpnfpGyRcaKan');
  const lender = new anchor.web3.PublicKey('6JgexLq1STiDE3MvjvnsZqdevnoHMTeaM7FrJRNt2Mrg');
  const fbond = new anchor.web3.PublicKey('2a4fxPLDmo8vyDu7g4pyrRPsHtHQ4Hgiv7urctJKnFjc');

  const tokenMint = new anchor.web3.PublicKey('BhjoLWG2APLtNZUFVjrh627srMPwdao5uMXcUPD9r2qv');

  const optimistic = {
    fraktBond: {
      hadoMarket: '123',
      fraktBondState: 'perpetualActive' as any,
      bondTradeTransactionsCounter: 0,
      borrowedAmount: 49750000,
      banxStake: '11111111111111111111111111111111',
      fraktMarket: 'HrsMreAqj4ss19WDemwFCVnxnhgJ5tTNjt4k8cKzTmko',
      amountToReturn: 0,
      actualReturnedAmount: 0,
      terminatedCounter: 0,
      fbondTokenMint: 'BhjoLWG2APLtNZUFVjrh627srMPwdao5uMXcUPD9r2qv',
      fbondTokenSupply: 0,
      activatedAt: 1692152273,
      liquidatingAt: 0,
      fbondIssuer: '6CnQUFVk2d8TRvQa2Lr7KDvx9zK12Q4jkA7mmDtzj71e',
      repaidOrLiquidatedAt: 0,
      currentPerpetualBorrowed: 50000000,
      lastTransactedAt: 1692152273,
      refinanceAuctionStartedAt: 0,
      publicKey: 'HY44jjetisKfx8mDQYVBMRdH8Srmf2dCNqamQPsRZNuk',
    },
    bondTradeTransaction: {
      bondTradeTransactionState: 'perpetualActive' as any,
      bondOffer: '5mxSZxG9JSwWG9bf3rVG2jC4GyDqemdF9gKQM4AKSpGw',
      user: '6JgexLq1STiDE3MvjvnsZqdevnoHMTeaM7FrJRNt2Mrg',
      amountOfBonds: 10400,
      solAmount: 49750000,
      feeAmount: 2500000000,
      bondTradeTransactionType: 'autoReceiveAndReceiveNft' as any,
      fbondTokenMint: 'HY44jjetisKfx8mDQYVBMRdH8Srmf2dCNqamQPsRZNuk',
      soldAt: 1692152273,
      redeemedAt: 0,
      redeemResult: 'none' as any,
      seller: '6CnQUFVk2d8TRvQa2Lr7KDvx9zK12Q4jkA7mmDtzj71e',
      isDirectSell: true,
      publicKey: 'CwAmTjnHD9PLbisV1aX73YHCS1Bu8wckJkxziYX6f5GE',
    },
  };

  // console.log('user: ', userKeypair.publicKey.toBase58());

  // const { optimisticResults } = await repayPerpetualLoan({
  //   programId,
  //   connection: connection,
  //   addComputeUnits: true,
  //   args: {
  //     repayAccounts: [
  //       {
  //         collateralTokenMint: tokenMint,
  //         bondTradeTransaction,
  //         lender,
  //         fbond,
  //         optimistic,
  //       },
  //     ],
  //   },
  //   accounts: {
  //     userPubkey: userPubkey,
  //     protocolFeeReceiver: new PublicKey(''),
  //   },
  //   sendTxn: () => Promise.resolve(),
  // });

  // console.log(optimisticResults);
  // console.log('hadoMarket: ', account.toBase58());
};

const boundFraktMarketToHadoMarketScript = async () => {
  const userKeypair = await createKeypairFromFile(__dirname + '/keys/frakt_market_admin.json');
  const connection = mainnetConnection;
  const sendTxnUserDevnet = async (txn, signers) =>
    void (await connection.sendTransaction(txn, [userKeypair, ...signers]).catch((err) => console.log(err)));
  const programId = FBONDS_MAINNET;
  const fraktMarket = new anchor.web3.PublicKey('HrsMreAqj4ss19WDemwFCVnxnhgJ5tTNjt4k8cKzTmko');
  const hadoMarket = new anchor.web3.PublicKey('HDqFpbBazXf5VwjmpiZFYqtss2PRPwvXFv5VSnqBvnWN');

  const {} = await boundHadoMarketToFraktMarket({
    programId,
    connection: connection,
    accounts: {
      hadoMarket: hadoMarket,
      fraktMarket: fraktMarket,
      userPubkey: userKeypair.publicKey,
    },
    sendTxn: sendTxnUserDevnet,
  });
};

const getAllHadespinProgramAccountsScript = async () => {
  const connection = mainnetConnection;
  const programId = FBONDS_MAINNET;

  const allAccounts = await getAllHadespinProgramAccounts(programId, connection);
  // const str = allAccounts.rounds[0].roundValue.toString()
  console.log(allAccounts.userRounds);
};

const makeHadespinRoundSettings = async () => {
  const userKeypair = await createKeypairFromFile('/Users/gleblevin/.config/solana/admin_deploy.json');
  const connection = mainnetConnection;
  const sendTxnUserDevnet = async (txn, signers) =>
    void (await connection.sendTransaction(txn, [userKeypair, ...signers]).catch((err) => console.log(err)));
  const programId = FBONDS_MAINNET;

  const result = await initializeRoundSettings({
    programId,
    connection: connection,
    accounts: {
      userPubkey: userKeypair.publicKey,
    },
    sendTxn: sendTxnUserDevnet,
    args: {
      roundDuration: 120,
      minSolToDeposit: 100,
      feePercent: 50,
      completedRounds: 0,
      canInitializeNextRound: true,
      rakebackHadesForSol: 20,
      contractBid: 50000,
    },
  });

  console.log(result);
};

const joinHadespinRoundScript = async () => {
  const userKeypair = await createKeypairFromFile('/home/gleb/keys/admin_deploy.json');
  const connection = mainnetConnection;
  const sendTxnUserDevnet = async (txn, signers) =>
    void (await connection.sendTransaction(txn, [userKeypair, ...signers]).catch((err) => console.log(err)));
  const programId = FBONDS_MAINNET;

  // const resultJoin = await joinRound({
  //   programId,
  //   connection,
  //   args: {
  //     solToDeposit: 1000000,
  //     roundNumber: 130
  //   },
  //   accounts: {
  //     userPubkey: userKeypair.publicKey,
  //   },
  //   sendTxn: sendTxnUserDevnet,
  //   optimistic: {
  //     roundSettings: {
  //       completedRounds: 0,
  //       totalSolDeposited: 0,
  //       totalFeeCollected: 0,
  //       totalParticipants: 0,
  //       roundDuration: 120,
  //       minSolToDeposit: 10,
  //       feePercent: 50,
  //       canInitializeNextRound: true,
  //       lastRoundEndsAt: 0,
  //       lastTransactedAt: 0,
  //       publicKey: '',
  //       placeholderOne: ''
  //     },
  //     round: await getMockRound()
  //   }
  // });
  // const resultJoin = await joinRound({
  //   programId,
  //   connection,
  //   args: {
  //     solToDeposit: 1000000,
  //     roundNumber: 1
  //   },
  //   accounts: {
  //     userPubkey: userKeypair.publicKey,
  //   },
  //   sendTxn: sendTxnUserDevnet,
  //   optimistic: {
  //     roundSettings: {
  //       completedRounds: 0,
  //       totalSolDeposited: 0,
  //       totalFeeCollected: 0,
  //       totalParticipants: 0,
  //       roundDuration: 120,
  //       minSolToDeposit: 10,
  //       feePercent: 50,
  //       canInitializeNextRound: true,
  //       lastRoundEndsAt: 0,
  //       lastTransactedAt: 0,
  //       publicKey: '',
  //       placeholderOne: ''
  //     },
  //     round: await getMockRound()
  //   }
  // });

  // console.log(resultJoin);
};

const initializeOracleFloor = async () => {
  const userKeypair = await createKeypairFromFile(__dirname + '/keys/frakt_market_admin.json');
  const connection = mainnetConnection;
  const sendTxnUserDevnet = async (txn, signers) =>
    void (await connection.sendTransaction(txn, [userKeypair, ...signers]).catch((err) => console.log(err)));
  const programId = FRAKT_MARKET_REGISTRY_MAINNET;
  const fraktMarket = new anchor.web3.PublicKey('8JYNs4Xab34FsJCkG63BSwVA5P3Nzqk3G6PF8he9DqJM');

  const {} = await frakt_market_registry.functions.oracle.initializeOracle({
    programId,
    connection: connection,
    args: {
      oracleAuthority: userKeypair.publicKey,
      oracleInfo: new PublicKey('11111111111111111111111111111111'),
      floor: 0,
    },
    accounts: {
      fraktMarket: fraktMarket,
      userPubkey: userKeypair.publicKey,
    },
    sendTxn: sendTxnUserDevnet,
  });
};

const updateOracleFloorScript = async () => {
  const userKeypair = await createKeypairFromFile(__dirname + '/keys/frakt_market_admin.json');
  const connection = mainnetConnection;
  const sendTxnUserDevnet = async (txn, signers) =>
    void (await connection.sendTransaction(txn, [userKeypair, ...signers]).catch((err) => console.log(err)));
  const programId = FRAKT_MARKET_REGISTRY_MAINNET;
  const fraktMarket = new anchor.web3.PublicKey('GpYUdS9ZGgizSmuRqf52nM6MkA3SsUawV3Ck8j6y7mdT');

  const {} = await frakt_market_registry.functions.oracle.setOracleFloor({
    programId,
    connection: connection,
    args: {
      newFloor: 23 * 1e9,
    },
    accounts: {
      fraktMarket: fraktMarket,
      userPubkey: userKeypair.publicKey,
    },
    sendTxn: sendTxnUserDevnet,
  });
};

const CreateFullFraktMarketScript = async () => {
  const userKeypair = await createKeypairFromFile(__dirname + '/keys/frakt_market_admin.json');
  const connection = mainnetConnection;
  const sendTxnUserDevnet = async (txn, signers) =>
    void (await connection.sendTransaction(txn, [userKeypair, ...signers]).catch((err) => console.log(err)));
  const programId = FRAKT_MARKET_REGISTRY_MAINNET;
  // new anchor.web3.PublicKey('DFsZgwKM3SvkvMwVRPQhhEnkYZCS1hZ2g2u6ehmAWjyc');
  // console.log('userKeypair: ', userKeypair.publicKey.toBase58());

  const whitelistType = fbonds.types.NftValidationWhitelistType.CollectionId;

  const whitelisted_address = new anchor.web3.PublicKey('3saAedkM9o5g1u5DCqsuMZuC4GRqPB4TuMkvSsSVvGQ3');

  const {
    account: fraktMarket,
    instructions: ixs1,
    signers: signers1,
  } = await frakt_market_registry.functions.marketFactory.initializeFraktMarket({
    programId,
    connection: connection,
    accounts: {
      userPubkey: userKeypair.publicKey,
      adminPubkey: userKeypair.publicKey,
    },

    sendTxn: () => Promise.resolve(),
  });

  const {
    account: whitelistPubkey,
    instructions: ixs2,
    signers: signers2,
  } = await frakt_market_registry.functions.marketFactory.addWhitelistToMarket({
    programId,
    connection: connection,
    args: {
      whitelistType,
    },
    accounts: {
      fraktMarket: fraktMarket,
      whitelistedAddress: whitelisted_address,
      userPubkey: userKeypair.publicKey,
    },
    sendTxn: () => Promise.resolve(),
  });

  const { instructions: ixs3, signers: signers3 } =
    await frakt_market_registry.functions.marketFactory.activateFraktMarket({
      programId,
      connection: connection,
      accounts: {
        fraktMarket: fraktMarket,
        userPubkey: userKeypair.publicKey,
      },
      sendTxn: () => Promise.resolve(),
    });

  const bondsProgramId = FBONDS_MAINNET;
  const {
    account: hadoMarket,
    instructions: ixs4,
    signers: signers4,
  } = await initializeHadoMarket({
    programId: bondsProgramId,
    connection: connection,
    accounts: {
      userPubkey: userKeypair.publicKey,
      validationAdapterProgram: bondsProgramId,
    },
    args: {
      minMarketFee: 5,
      minBidCap: 1,
    },
    sendTxn: () => Promise.resolve(),
  });

  const { instructions: ixs5, signers: signers5 } = await boundHadoMarketToFraktMarket({
    programId: bondsProgramId,
    connection: connection,
    accounts: {
      hadoMarket: hadoMarket,
      fraktMarket: fraktMarket,
      userPubkey: userKeypair.publicKey,
    },
    sendTxn: () => Promise.resolve(),
  });

  const { instructions: ixs6, signers: singers6 } = await finishHadoMarket({
    programId: bondsProgramId,
    connection: connection,
    accounts: {
      hadoMarket: hadoMarket,
      userPubkey: userKeypair.publicKey,
    },
    sendTxn: () => Promise.resolve(),
  });

  const { instructions: ixs7, signers: signers7 } = await frakt_market_registry.functions.oracle.initializeOracle({
    programId,
    connection: connection,
    args: {
      oracleAuthority: userKeypair.publicKey,
      oracleInfo: new PublicKey('11111111111111111111111111111111'),
      floor: 0,
    },
    accounts: {
      fraktMarket: fraktMarket,
      userPubkey: userKeypair.publicKey,
    },
    sendTxn: () => Promise.resolve(),
  });

  const transaction = new Transaction();
  for (let ix of [...ixs1, ...ixs2, ...ixs3, ...ixs4, ...ixs5, ...ixs6, ...ixs7]) transaction.add(ix);

  await sendTxnUserDevnet(transaction, [
    ...signers1,
    ...signers2,
    ...signers3,
    ...signers4,
    ...signers5,
    ...singers6,
    ...signers7,
  ]);
  console.log('hadoMarket: ', hadoMarket.toBase58());

  console.log('fraktMarket: ', fraktMarket.toBase58());
};

const initializeFraktMarketScript = async () => {
  const userKeypair = await createKeypairFromFile(__dirname + '/keys/frakt_market_admin.json');
  const connection = mainnetConnection;
  const sendTxnUserDevnet = async (txn, signers) =>
    void (await connection.sendTransaction(txn, [userKeypair, ...signers]).catch((err) => console.log(err)));
  const programId = FRAKT_MARKET_REGISTRY_MAINNET;
  // new anchor.web3.PublicKey('DFsZgwKM3SvkvMwVRPQhhEnkYZCS1hZ2g2u6ehmAWjyc');
  // console.log('userKeypair: ', userKeypair.publicKey.toBase58());

  const { account: fraktMarket } = await frakt_market_registry.functions.marketFactory.initializeFraktMarket({
    programId,
    connection: connection,
    accounts: {
      userPubkey: userKeypair.publicKey,
      adminPubkey: userKeypair.publicKey,
    },

    sendTxn: sendTxnUserDevnet,
  });

  console.log('fraktMarket: ', fraktMarket.toBase58());
};

const patchBondOfferBidCaps = async () => {
  const userKeypair = await createKeypairFromFile(__dirname + '/keys/mainnet_admin.json');
  const connection = mainnetConnection;
  const sendTxnUserDevnet = async (txn, signers) =>
    void (await connection.sendTransaction(txn, [userKeypair, ...signers]).catch((err) => console.log(err)));
  const programId = FBONDS_MAINNET;
  // new anchor.web3.PublicKey('DFsZgwKM3SvkvMwVRPQhhEnkYZCS1hZ2g2u6ehmAWjyc');
  // console.log('userKeypair: ', userKeypair.publicKey.toBase58());
  // CROSS_TOKEN_AMM_DEVNET;
  const {
    bondOffersV2,
    fraktBonds,
    hadoMarketRegistry,
    collateralBoxes,

    hadoMarkets,

    bondTradeTransactionsV2,
  } = await fbonds.functions.getters.getAllProgramAccounts(FBONDS_MAINNET, connection);

  const STANDARD_BID_CAP = 100000e9;
  const offersToPatch = bondOffersV2.filter(
    (offer) =>
      offer.pairState === PairState.OnMarketVirtual && offer.buyOrdersQuantity > 1 && offer.bidCap !== STANDARD_BID_CAP,
  );
  // console.log('sample: ', offersToPatch[24]);

  console.log('patching: ', offersToPatch.length);
  console.log('samples: ', offersToPatch);

  // for (let i = 0; i < offersToPatch.length; i++) {
  //   const offer = offersToPatch[i];
  //   console.log('patching: ', i);
  //   const {} = await patchBondOffer({
  //     programId,
  //     connection: connection,
  //     accounts: {
  //       userPubkey: userKeypair.publicKey,
  //       bondOfferV2: new PublicKey(offer.publicKey),
  //     },
  //     sendTxn: sendTxnUserDevnet,
  //   });
  // }
};

const initializeHadoMarketScript = async () => {
  const userKeypair = await createKeypairFromFile(__dirname + '/keys/frakt_market_admin.json');
  const connection = mainnetConnection;
  const sendTxnUserDevnet = async (txn, signers) =>
    void (await connection.sendTransaction(txn, [userKeypair, ...signers]).catch((err) => console.log(err)));
  const programId = FBONDS_MAINNET;
  // new anchor.web3.PublicKey('DFsZgwKM3SvkvMwVRPQhhEnkYZCS1hZ2g2u6ehmAWjyc');
  // console.log('userKeypair: ', userKeypair.publicKey.toBase58());
  // CROSS_TOKEN_AMM_DEVNET;
  const { account: hadoMarket } = await initializeHadoMarket({
    programId,
    connection: connection,
    accounts: {
      userPubkey: userKeypair.publicKey,
      validationAdapterProgram: FBONDS_MAINNET,
    },
    args: {
      minMarketFee: 9950,
      minBidCap: 1,
    },
    sendTxn: sendTxnUserDevnet,
  });

  console.log('hadoMarket: ', hadoMarket.toBase58());
};

const lazyFs = () => {
  const fs = require('fs/promises');
  return fs;
};
const createKeypairFromFile = async (filePath: string) => {
  const secretKeyString = await lazyFs().readFile(filePath, { encoding: 'utf8' });
  const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
  return anchor.web3.Keypair.fromSecretKey(secretKey);
};

const fillBanxPoints = async () => {
  await AddBanxToFIll();
  const userKeypair = await createKeypairFromFile(__dirname + '/keys/mainnet_admin.json');
  const connection = mainnetConnection;
  const sendTxnUserDevnet = async (txn, signers) =>
    void (await connection.sendTransaction(txn, [userKeypair, ...signers]).catch((err) => console.log(err)));
  const programId = FBONDS_MAINNET;
  const banxMetas = JSON.parse(await lazyFs().readFile(__dirname + '/total_banx_metas.json', { encoding: 'utf8' }));

  const banxPointsMaps: BanxPointsMap[] = await fbonds.functions.getters.getSpecificAccounts(
    'banxPointsMap',
    FBONDS_MAINNET,
    connection,
  );
  console.log('banxPointsMaps: ', banxPointsMaps);
  console.log('banxMetas: ', banxMetas[0].offChainMetadata.metadata.attributes);

  const notFilledBanxes = banxMetas.filter((meta) => !banxPointsMaps.find((map) => map.banxMint === meta.account));

  console.log('banx to fill: ', notFilledBanxes.length);

  const metas_with_broken_points: any[] = [];
  for (let i = 0; i < notFilledBanxes.length; i++) {
    const banxMeta = notFilledBanxes[i];
    console.log('patching: ', i, ' of: ', notFilledBanxes.length, ', mint: ', banxMeta.account);
    if (!banxMeta.offChainMetadata.metadata) {
      console.log('brokenMeta');
      continue;
    }
    const playerPointsAttribute = banxMeta.offChainMetadata.metadata.attributes.find(
      (meta) => meta.traitType === 'player points',
    );
    const partnerPointsAttribute = banxMeta.offChainMetadata.metadata.attributes.find(
      (meta) => meta.traitType === 'partner points',
    );

    console.log({
      playerPointsAttribute,
      partnerPointsAttribute,
    });
    if (!partnerPointsAttribute || !playerPointsAttribute) {
      console.log('broken points in attributes');
      metas_with_broken_points.push(banxMeta);
      continue;
    }
    const {} = await mapBanxToPoints({
      programId,
      connection: connection,
      args: {
        partnerPoints: partnerPointsAttribute.value,
        playerPoints: playerPointsAttribute.value,
      },
      accounts: {
        nftMint: new PublicKey(banxMeta.account),

        userPubkey: userKeypair.publicKey,
      },
      sendTxn: sendTxnUserDevnet,
    });
  }

  // writeFileSync(__dirname + '/metas_with_broken_points.json', JSON.stringify(metas_with_broken_points, null, 2));
};

const individualFillBanxPoints = async () => {
  const userKeypair = await createKeypairFromFile(__dirname + '/keys/mainnet_admin.json');
  const connection = mainnetConnection;
  const sendTxnUserDevnet = async (txn, signers) =>
    void (await connection.sendTransaction(txn, [userKeypair, ...signers]).catch((err) => console.log(err)));
  const programId = FBONDS_MAINNET;
  const {} = await mapBanxToPoints({
    programId,
    connection: connection,
    args: {
      partnerPoints: 63,
      playerPoints: 1,
    },
    accounts: {
      nftMint: new PublicKey('CzB9uUTYZ66hRqAoNeusNXMpuZp6BKef7scJfHpm25UF'),

      userPubkey: userKeypair.publicKey,
    },
    sendTxn: sendTxnUserDevnet,
  });

  // writeFileSync(__dirname + '/metas_with_broken_points.json', JSON.stringify(metas_with_broken_points, null, 2));
};

const deleteUserRoundScript = async () => {
  const userKeypair = await createKeypairFromFile('/Users/gleblevin/.config/solana/admin_deploy.json');
  const connection = mainnetConnection;
  const sendTxnUserDevnet = async (txn, signers) =>
    void (await connection.sendTransaction(txn, [userKeypair, ...signers]).catch((err) => console.log(err)));
  const programId = FBONDS_MAINNET;
  const result = await deleteUserRound({
    programId,
    connection: connection,
    accounts: {
      userRound: new PublicKey('GaqAamUthSdNzTr78cqd3GXphvmhDscsgX12quPPdEVf'),

      userPubkey: userKeypair.publicKey,
    },
    sendTxn: sendTxnUserDevnet,
  });

  console.log(result);
};

const fixUserStakesScript = async () => {
  const userKeypair = await createKeypairFromFile(__dirname + '/keys/mainnet_admin.json');
  const connection = mainnetConnection;
  const sendTxnUserDevnet = async (txn, signers) =>
    void (await connection.sendTransaction(txn, [userKeypair, ...signers]).catch((err) => console.log(err)));
  const programId = FBONDS_MAINNET;

  const { stakingSettings, banxStakes, adventureSubscriptions, adventures, banxUsers } =
    await fbonds.functions.getters.getStakingAccounts(FBONDS_MAINNET, connection);

  let count = 0;
  for (let userBanx of banxUsers) {
    const targetStakes = banxStakes.filter(
      (stake) => stake.banxStakeState === BanxStakeState.Staked && stake.user === userBanx.user,
    );
    const totalPartnerPoints = targetStakes.reduce((acc, stake) => acc + stake.partnerPoints, 0);
    const totalPlayerPoints = targetStakes.reduce((acc, stake) => acc + stake.playerPoints, 0);

    console.log('fixing: ', count++, ', total: ', banxUsers.length);
    const {} = await patchBrokenUserStakes({
      programId,
      connection: connection,
      args: {
        partnerPoints: totalPartnerPoints,
        playerPoints: totalPlayerPoints,
      },
      accounts: {
        banxUser: new PublicKey(userBanx.publicKey),

        userPubkey: userKeypair.publicKey,
      },
      sendTxn: sendTxnUserDevnet,
    });
  }
  // const {} = await mapBanxToPoints({
  //   programId,
  //   connection: connection,
  //   args: {
  //     partnerPoints: 63,
  //     playerPoints: 1,
  //   },
  //   accounts: {
  //     nftMint: new PublicKey('CzB9uUTYZ66hRqAoNeusNXMpuZp6BKef7scJfHpm25UF'),

  //     userPubkey: userKeypair.publicKey,
  //   },
  //   sendTxn: sendTxnUserDevnet,
  // });

  // writeFileSync(__dirname + '/metas_with_broken_points.json', JSON.stringify(metas_with_broken_points, null, 2));
};

const setStakingSettings = async () => {
  const userKeypair = await createKeypairFromFile(__dirname + '/keys/mainnet_admin.json');
  const connection = mainnetConnection;
  const sendTxnUserDevnet = async (txn, signers) =>
    void (await connection.sendTransaction(txn, [userKeypair, ...signers]).catch((err) => console.log(err)));
  const programId = FBONDS_MAINNET;

  const {} = await updateStakingSettings({
    programId,
    connection: connection,
    args: {
      lowerRewardsLimit: 300 * 1e9,
      upperRewardsLimit: 500 * 1e9,
    },
    accounts: {
      userPubkey: userKeypair.publicKey,
    },
    sendTxn: sendTxnUserDevnet,
  });
};

const whitelistDiff = () => {
  const whitelistsNew = {
    data: [
      {
        marketPubkey: 'J3v7oBRUboG58ziQ5wxM9nPaQuXarQpaotug2a62Z4ta',
        collectionName: 'ABC',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679309901155_abc.jpg',
        collectionFloor: 12163760000,
        offerTvl: 48050000000,
        activeOfferAmount: 2,
        bestOffer: 6000000000,
        bestLtv: 49.326852881017054,
        activeBondsAmount: 1,
        loansTvl: 5970000000,
        marketApr: 10400,
      },
      {
        marketPubkey: 'DBTE4wRgkA823Pu9nGqfrAztPsJ4iYJSitanJUc2cgkJ',
        collectionName: 'AGE of SAM',
        collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/aos_pfp_1669992364632.gif',
        collectionFloor: 1050501999,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'AZfyLikWK3dntYKu5v6GFRjvqJv5uJTnE7vWsKkHnrPZ',
        collectionName: 'ATOZ',
        collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/atoz_pfp_1680969333393.png',
        collectionFloor: 7384160000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'H1X7ThdJpPH8MM85ai2jUS44UnAAmYX1b9651gLoesLw',
        collectionName: 'Alpha Pharaohs',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679312158405_alphaPharaohs.jpg',
        collectionFloor: 6017250000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '98tb5oasTxJE3pM7BR7jjoKGYfaCLiu5bFGRd6qQXh87',
        collectionName: 'AlphaBlock',
        collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/alphablock_pfp_1658081956725.gif',
        collectionFloor: 1895250000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '9SC4raDa4bEwBxyfLU9M9w8w9zZYS74YU2pwLEHy3bSN',
        collectionName: 'Anon Evolved',
        collectionImage: 'https://arweave.net/B-7jXbspeekQipTnk1TmyRqCXNu3UOvV25cXJ-Ta7Hk',
        collectionFloor: 3217550000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '9YiWThrwH5vDTkKaF1HTZ6RQqA6E4HrekWpWrLqHWnY7',
        collectionName: 'Anons',
        collectionImage: 'https://bafkreihmob4prxg4gpjh57xe35yzj2lnceu3jtke2eqmrtq67wtb7djhwe.ipfs.nftstorage.link/',
        collectionFloor: 1693350000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'FVg5YnLDgxH5kie8GshzxdgjsWFXPTKvRqaR5ZwnCjdD',
        collectionName: 'Anybodies',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679312080529_anybodies.jpg',
        collectionFloor: 5857393500,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '9UVNZwjwT7BCc7Z2SzXgNDJP8bF2FvHcibG1fJRpD2VM',
        collectionName: 'AssetDash Vanta',
        collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/assetdash_vanta_pfp_1684801128108.gif',
        collectionFloor: 7902300000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '4Z4L87vE7mwxSa4tYvmXKEF5swbkoEg4RfosFh1nyw1W',
        collectionName: 'Aurory',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679310022353_aurory.jpeg',
        collectionFloor: 16240000000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '8S9NP9ui7CE2xXj53PkfC6T59K3QT5ZzGtLcS7rDhJga',
        collectionName: 'BONKz',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679310146322_bonkz.png',
        collectionFloor: 669900000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '7eR3s7EHraycck8dC7uSfZfp8545wuYBaruF3fhEVhWD',
        collectionName: 'BR1: Ape Operatives',
        collectionImage: 'https://storage.googleapis.com/feliz-crypto/project_photos/br1.png',
        collectionFloor: 2682030000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '4DAibWe9GitY4DXZuFN8j1T6fjxg171tsPRTUX167JYw',
        collectionName: 'BR1: Droid Operatives',
        collectionImage:
          'https://creator-hub-prod.s3.us-east-2.amazonaws.com/br1_droid_operatives_pfp_1685046708497.png',
        collectionFloor: 422240000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '5nexTKLM2fEXyTnc67RYh8u1otBfU3EpG3KEUj7RDn8C',
        collectionName: 'BVDCATs',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679312024181_bvdcaTs.jpg',
        collectionFloor: 553235550,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'FG5qySDnPjGXdvrXrvJAHbos8yDCb7YyMjKoVw52c6oh',
        collectionName: 'Banx',
        collectionImage: 'https://banxnft.s3.amazonaws.com/images/custom.png',
        collectionFloor: 8531987730,
        offerTvl: 84900000000,
        activeOfferAmount: 3,
        bestOffer: 6850000000,
        bestLtv: 80.28609764538422,
        activeBondsAmount: 13,
        loansTvl: 80844785306,
        marketApr: 10400,
      },
      {
        marketPubkey: 'BsAaSBUc7xY42R65XB6P9Qg4WYAvekNYb5AWxsm43cnu',
        collectionName: 'Banx',
        collectionImage:
          'https://prod-tensor-creators-s3.s3.us-east-1.amazonaws.com/image-33c03f28-6ab7-4481-9fa6-0127b7db1621',
        collectionFloor: 8531987730,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '8tgnc54nnKz3CPU3FV6x8njHKbJudozaGGGfoieHLzYA',
        collectionName: 'Beans by Raposa',
        collectionImage: 'https://bafkreies37lv4bntrirxbqxbeklaijace7mze36ifhuj7ur5hcncgqf6di.ipfs.nftstorage.link/',
        collectionFloor: 3716850000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'GVZqbSwKTqp1aPUjJYNA7MkFmN6Sy6dvuWPLaXQQeqwu',
        collectionName: 'Bear Drop #1: Founders Coins',
        collectionImage: 'https://bafybeihk5ci2yoltqduesihfggh7bbaah7djicne62hztsl5jrhmnh64yi.ipfs.nftstorage.link/',
        collectionFloor: 1267500000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'GWdEPEy9CU7oPWd1z5YCHuScu3guQvj7VQjwzLugL5wG',
        collectionName: 'Best Buds',
        collectionImage:
          'https://bafybeifqa5uu7om66ldyuemlpo22zacjiproqn2tqsx3qo4rqtnvn5pqj4.ipfs.dweb.link/503.png?ext=png',
        collectionFloor: 3183960000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'GpVJ7XXZf6k62DrrFHv6eYH9ivZDYVN52r5CQrHnUrUq',
        collectionName: 'Blockasset Legends',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679311942440_blockassetLegends.jpg',
        collectionFloor: 4340000000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '5ekHdfSZ5AqJ1dqASAxHzjgCPtxc91ivAVkX13U2aBzH',
        collectionName: 'Bodoggos',
        collectionImage: 'https://ipfs.io/ipfs/QmcQYWF1Kmpz5GuKqPHCMRbUCRAVC4gCq8nkA5RPDsB7pK',
        collectionFloor: 1996896000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'E63xo26b5ivVDXNKJFM9iA7EFLKFF8pUrjsG8cdJYA97',
        collectionName: 'BonkeDAO',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679312145338_solanaBonkBusiness.jpg',
        collectionFloor: 172448500,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '7w8QWLkoPnZrtSQX99eAoAqX7N8p2oHvwGUq72zwY1Tk',
        collectionName: 'Bored Ape Solana Club',
        collectionImage: 'https://bafkreihmrwipluc6ro6uzl5ue2mkknexkkxw34df5icy4pzoh54lieexcq.ipfs.nftstorage.link/',
        collectionFloor: 12034050000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '2saGSxsUrpNC4ZUE2HPCe5usY8YYSPaVkS7mpqVbWCK7',
        collectionName: 'Boryoku Dragonz',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679309345491_boryokuDragonz.jpg',
        collectionFloor: 14036700000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'DRmtDmLXxqoFvraqCCUaaCJ9rss8P3aCbawp2iQ5A4DP',
        collectionName: 'Bozo Collective',
        collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/bozo_collective_pfp_1696263152018.png',
        collectionFloor: 1624100000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'DhNHVPKLPkM2oJJRM3DsVg2h4qz6mmR3um5AbnYCBMWG',
        collectionName: 'Brohalla',
        collectionImage:
          'https://prod-image-cdn.tensor.trade/images/400x400/freeze=false/https://prod-tensor-creators-s3.s3.us-east-1.amazonaws.com/image-be423bdb-275c-4fa2-8ad4-0733919ecace',
        collectionFloor: 3357178200,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'AxbrYZH8TAKxFxwXcxo6RyH9rHnvL3SsZvsbaDea7d5Q',
        collectionName: 'Cardboard Citizens',
        collectionImage: 'https://upcdn.io/FW25avLUwiHGMAGKQrDbaNL',
        collectionFloor: 2439182400,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'EpcGAzYdvHsKxEnW3eSNNwDAR9csUNFMfTAXeoybiAHK',
        collectionName: 'Caveworld',
        collectionImage: 'https://bafkreievxcbi4onhj3goelqfi77w2jibfeanbbohunop3ncexm2jugvv54.ipfs.nftstorage.link/',
        collectionFloor: 1935450000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '2Bx5S1qFyo6xPnqmhh4FDJ7MJrbXBg7mY19gQ4QeVZUj',
        collectionName: 'Cets On Creck',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679309316920_cetsOnCreck.jpg',
        collectionFloor: 4142850000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'HzWFXf74AnqbVq21YdBD9Yg5yVNmzPZRdNzzydwoV5EE',
        collectionName: 'Chads',
        collectionImage: 'https://shdw-drive.genesysgo.net/DULc8DgYywybLKKosZXbT5HBYHZiUbkkwNYy7QbirUc2/chads.png',
        collectionFloor: 659235000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '9VYeTs4iwCv7TVHxrNuUC5t6Yz1xhWeBHbFgNsx9u7rP',
        collectionName: 'Claynosaurz',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679309967323_claynosaurz.jpg',
        collectionFloor: 31600800000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '9jdTs6yF294dVCdGe22rqLPrSfSJth3e39jsdPSKicJh',
        collectionName: 'Claynosaurz: Clay',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679312208360_claynosaurzClay.jpg',
        collectionFloor: 1000160000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'F1896UV5Qb82HBucktkNZpodf47cLg2jYbdNzJomDXca',
        collectionName: 'Claynosaurz: Claymaker',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679312102487_claynosaurzClaymaker.jpg',
        collectionFloor: 1959600000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'CzJig9DjXigVggfnkJ1kqRbAeeWt1abutqT7rrAJjFWk',
        collectionName: 'Claynosaurz: Croissants',
        collectionImage: 'https://arweave.net/3FrLQ8fvl6usHpYi9wFvC9BoyJgmkLGXaGsT6b8pCY8',
        collectionFloor: 20554500000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'BQ8u98Eq68FFiBcsaSL4gqB8aRJ3LwGNfNu7nDETUSm9',
        collectionName: 'Claynosaurz: Sardinhas',
        collectionImage: 'https://bafybeia6ljoo6x7iku2xa24ls2m72xhp3hjqqeqmroxpn73k7ulreb4vyq.ipfs.nftstorage.link/',
        collectionFloor: 419796000000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '3D26L8eZbMP4s5Di7TnkyUrD8V3zgoFrawRw78svn2Fc',
        collectionName: 'Claynosaurz: The Call of Saga',
        collectionImage: 'https://bafkreifirgaxlprdb7xtumjeewnllapjuodgxyofwulspxwjqrb6q2rqhi.ipfs.nftstorage.link/',
        collectionFloor: 18136950000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '8rubdmapgkfdHgwo63Z82iUDvyyvwChXN6Z2X34fjQip',
        collectionName: 'CrashOut',
        collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/dustcrashcoinflip_pfp_1679000560023.png',
        collectionFloor: 1313470000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '8egjieuq6wyRb1vN2yTCK5T3J9CYCPnUFHiSuTDzSAYr',
        collectionName: 'Crashfaces',
        collectionImage: 'https://bafkreihqw63zx6mb36dx7rv4wf4vxwabjsazeyfsqgmgf5sslbrd24qi6e.ipfs.nftstorage.link/',
        collectionFloor: 3924180000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'EG2LbYfY8TFRvAp7RPHRr9Jr16eSKMRD28htzDuKMSPA',
        collectionName: 'Critters Cult',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679312035702_crittersCult.jpg',
        collectionFloor: 2362692600,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '899apVNUqP1WgHjbwtC8q7LDkD7SUE4zXbp3TivzAnuc',
        collectionName: 'Cyber Frogs',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679312029055_cyberFrogs.jpg',
        collectionFloor: 9405760000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'GRTuzPDvybezBLTsjr5wkf3tgAZySb7sG1P4CeRdzh6a',
        collectionName: 'Cyber Samurai',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679309951936_cyberSamurai.jpg',
        collectionFloor: 1015000000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '5FYRiGYGk5bMGU3Ng38ebCcmzRdhofKaDwgJas9fHj5h',
        collectionName: 'DCF Microshares',
        collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/dcf_microshares_pfp_1649354979364.gif',
        collectionFloor: 3751800000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'CiWh3ix99DRWkRYSqy7A5Hmt24of4iH3LfVkk6M9cACs',
        collectionName: 'DUELBOTS',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679310006324_duelbots.jpg',
        collectionFloor: 10000000000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '4ZPosgvL4mYnNUdjpPqitwUCkC2n46xRaa8T2RTzhMBL',
        collectionName: 'Dandies',
        collectionImage:
          'https://kuvv4harom3hiqjmfaw5cgaw5k3n23eumynhx4bvh32ohqnzm2fq.arweave.net/VSteHBFzNnRBLCgt0RgW6rbdbJRmGnvwNT7048G5Zos?ext=png',
        collectionFloor: 1219318500,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '3NDDhRHSPfEMqkJPj4v8e8AgGch1RYjz8EkZXwNuBncr',
        collectionName: 'DeFi Degenerates',
        collectionImage:
          'https://nftstorage.link/ipfs/bafybeic3vwsex2zuph4hidrzpr72l5ir4rcciscxnsuxo4rz3mbzwthdfi/7.jpg',
        collectionFloor: 2256150000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '5gPUUvqTkUPFFxSY9ECaN2Y7mKmnrvQQuwQ39QujZLbp',
        collectionName: 'DeGods',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679309326244_deGods.jpg',
        collectionFloor: 417872700000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '8kPUaQLjDCsJaPZ1afhpgyrR9GhbzNtDk28KNQJYkYiq',
        collectionName: 'Degen Crash WTF',
        collectionImage:
          'https://nftstorage.link/ipfs/bafybeibqru2xmb6wgw4e47oiwtq5wdlhl4hlknvzwpo35nspluwtbq6ht4/0.gif',
        collectionFloor: 0,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '6KGL6tag8k7fQ8LuAxTT61jDsoyU2eL1C9qK8awiRTAE',
        collectionName: 'Degen Fat Cats',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679309896550_degenFatCats.jpg',
        collectionFloor: 7710600000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'BrdzMp2GAMVh5ecyGovY1u4uF6wCapJZEgZULHeapgE3',
        collectionName: 'Degenerate Ape Academy',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679309318888_degenerateApeAcademy.jpg',
        collectionFloor: 30450000000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'HH3iaSEJ7qAN1TC2Q3ACN3QshusFpGAiFzoSb9xscU7Q',
        collectionName: 'Degenerate Drop Bears',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679311875565_degenerateEgg.jpg',
        collectionFloor: 24757054000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'G3Usm3eVHuMGX4QuW7z2MrzYg1uDVYRhpbeJjd1ZZCos',
        collectionName: 'Degenerate Trash Pandas',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679309978539_degenerateTrashPandas.jpg',
        collectionFloor: 1591520000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '8sxxGCRzxsjwF3i4yZYP88XWnLNvRiVChzM4UNLJPK6C',
        collectionName: 'Degens',
        collectionImage: 'https://arweave.net/pDnqZ0Py8a41C3DYcBCIQ0CW5FnCxiWO1Pjp5m901-M',
        collectionFloor: 1893255000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'GhGDDJTge5mdW63cMTRBSZMxakqZECGosAwNfxyR3QDQ',
        collectionName: 'DexterLab OG',
        collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/dexterlab_og_pfp_1670416678382.png',
        collectionFloor: 5054700000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'EPk1xhjXS5osmcDij4PuEa3Eh6RTBMpMfT834Jxvr8U3',
        collectionName: 'Divvy House Pass',
        collectionImage:
          'https://nftstorage.link/ipfs/bafybeifwpelhziuolvdim6q7pey5it4kzwvw2i6zoeb2obsmi4po6kvn7a/gold.png',
        collectionFloor: 1889916000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'DnrQor9TaPJSCZQVQAEL1A7EJMQCs84bhbBKY79PHdJY',
        collectionName: 'Doge Capital',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679309953709_dogeCapital.jpg',
        collectionFloor: 1303260000,
        offerTvl: 8000000000,
        activeOfferAmount: 1,
        bestOffer: 1000000000,
        bestLtv: 76.73066003713764,
        activeBondsAmount: 2,
        loansTvl: 1990000000,
        marketApr: 10400,
      },
      {
        marketPubkey: '4J1Bs6kaS8Mckhn7D4qj4iNbSf7Bhye8wStezeAVZdyA',
        collectionName: 'Doubloons',
        collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/doubloons_pfp_1676338349906.png',
        collectionFloor: 3599700000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'BzxKw3JLmPt7aagkHnRQEMQ4Le1rZdwEib5Viuig42hu',
        collectionName: 'Drip The Faceless',
        collectionImage:
          'https://prod-image-cdn.tensor.trade/images/400x400/freeze=false/https%3A%2F%2Fi6z5zem6ofbyazty7mmrhz4xohr6lynyrfufwklttgjuytivjgqq.arweave.net%2FR7PckZ5xQ4BmePsZE-eXcePl4biJaFspc5mTTE0VSaE%3Fext%3Dgif',
        collectionFloor: 26111999,
        offerTvl: 1059932644,
        activeOfferAmount: 7,
        bestOffer: 20000000,
        bestLtv: 76.59314018815641,
        activeBondsAmount: 64,
        loansTvl: 717663845,
        marketApr: 5000,
      },
      {
        marketPubkey: 'HHsBNfJppTHobsw5XsHZrFK61azu37gmyCB5bSiEowTP',
        collectionName: 'Droid Capital',
        collectionImage:
          'https://prod-image-cdn.tensor.trade/images/400x400/freeze=false/https://bafybeigg33rs7ummf5mkwttlyg6qtu63glbtbj3fija3zifvh5gsanmv2i.ipfs.nftstorage.link/',
        collectionFloor: 3173819999,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'Emvst8WzVjdQkbBHkFJ2bV2rUD1xMaPTx9mySCdSYVp6',
        collectionName: 'DucksVegas',
        collectionImage: 'https://bafkreicqhklhkzbdpynmyg7knpg32z6shyh3jkbhtzylcooe2ox3tl4cwm.ipfs.nftstorage.link/',
        collectionFloor: 811199999,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'Bkw4tJtm6k6Ly5g65u7xVT2rpCc1cUCpyBS59gn5WHJr',
        collectionName: 'Duelwhales',
        collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/duelwhales_pfp_1679796083785.png',
        collectionFloor: 1271314649,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'GJk9PSgjbe4gogAQixpuMqAXE9eBRn5JZi8wntVefa9u',
        collectionName: 'Dust City',
        collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/dustcity_pfp_1679791463277.png',
        collectionFloor: 0,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'BGdswgpznbEj6oNcjajj4oqbhwJNbQ2YPvinCnZTvefi',
        collectionName: 'Dworfz',
        collectionImage:
          'https://nftstorage.link/ipfs/bafybeihbbhiztt7pomu6szwqr56uaffksjq476p2djq6vactydcbqabcg4/5121.png',
        collectionFloor: 393943500,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '7Gh6XRtReCM1oevuhvCWiKJFZYJ18Kxy4FWo6uNcUtNL',
        collectionName: 'Ember Shards',
        collectionImage:
          'https://prod-image-cdn.tensor.trade/images/slug=05c52d84-2e49-4ed9-a473-b43cab41e130/400x400/freeze=true/https://prod-tensor-creators-s3.s3.us-east-1.amazonaws.com/drop-metadata/0f580c3a-cbcd-4243-841c-984d96ebd3b5/images/ember.gif',
        collectionFloor: 0,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'Dmoq4f6KLqoThswx8hh45f7cTG5s5CtaSFQtN2R2sk76',
        collectionName: 'Enigma Ventures',
        collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/enigmaventures_pfp_1647983957961.png',
        collectionFloor: 0,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'Akq516MJRWaDKmZEgg9BX9FCEcfyjub6kwFMdpuTzVCD',
        collectionName: 'Entreprenerdz',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679312166155_entreprenerdz.jpg',
        collectionFloor: 1216984999,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'GNWkjEiRDrY9tpadtjHUgAPKeqnBSofZsbMJycsuk2KA',
        collectionName: 'FRAKT',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679311909782_frakt.jpg',
        collectionFloor: 8406060000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'CAJDNbdmiCQZUeCBuAZAdB1d2Gmubwp4H14dZg1N9G2X',
        collectionName: 'Fake Alpha',
        collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/fakealpha_pfp_1678197229637.jpeg',
        collectionFloor: 292320000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'Bkv2jmAQDqJPWogsRxZD2eD7TenJtYwQUprMoYgPyLB7',
        collectionName: 'Famous Fox Federation',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679309349677_famousFoxFederation.jpg',
        collectionFloor: 35890000000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'EYzv82GTCLSWCy6NRfTZQwS4MwdUeVDYggpm9vuNz75d',
        collectionName: 'FatCats Capital',
        collectionImage: 'https://bafkreiaartlxirpnqhxgrpcm3hxb4ew4qybzerljuuhhderp4o6rsmhuya.ipfs.nftstorage.link/',
        collectionFloor: 441119000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'HiSqstYSj6WHoUXPDPqKFa6nw1g2RbeKgkKxqbfVRT9C',
        collectionName: 'Fearless Bulls',
        collectionImage: 'https://arweave.net/j8OMCbxMavgD6bdALM8XSbmQeBOgu2eOhLL4LYRLUfo',
        collectionFloor: 959944500,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '23phG7JttNuxEB9o2WbGg3iySBhcK9NGY7nMQ6LimMd1',
        collectionName: 'Fidelion',
        collectionImage: 'https://bafkreifyltop4h2htwiojt3vhm3ir3jjmqddjvjhn2fhm5t6itvaccqrfy.ipfs.nftstorage.link/',
        collectionFloor: 11384828700,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'ADJmMDvSwnSeENyqRshdJAAAvk2pVL3RYnRU8GKNwwYB',
        collectionName: 'Frankie 500',
        collectionImage:
          'https://bafybeierrblkx6fusnyfpqavc37v23dipqg42pgz3j55txssyivtw3i6xi.ipfs.nftstorage.link/16.gif',
        collectionFloor: 2419800000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'AHzG2ik9Jqvfd1c67DH1ibCchMXo2Sep4p5mYWfq7oPP',
        collectionName: 'Future Traders',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679312125934_futureTraders.jpg',
        collectionFloor: 505345000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'CPca2BSabUFiP8ioanSSEWVUY5QzND6wKxiWAPi98Yc4',
        collectionName: 'Galactic Geckos',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679309903856_galacticGeckos.jpg',
        collectionFloor: 35905000000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'FEtfh4AJSAKoULMC1cAM862bpunqUxnXD2G8r3uuwxQu',
        collectionName: 'Ghost Kid DAO',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679309941722_ghostKidDao.jpg',
        collectionFloor: 5982105000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'AtJumxpPysfseLMiRVupCEmCfguEUtJg32vs62xPXpAv',
        collectionName: 'GigaDAO Loot Box',
        collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/gigadao_pfp_1658388776098.png',
        collectionFloor: 11154000000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'sAG6BVTBs5DJhJUFTF5EGD6KtdhbsBUFPcipBgrDFH1',
        collectionName: 'Gods',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679310009712_gods.jpg',
        collectionFloor: 7448000000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'ES9KyPtGXDZEs7qbWxqQwvh7woKUAuj4zSp16TrVbsSW',
        collectionName: 'Helions',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679309987039_helions.jpg',
        collectionFloor: 1439160000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '899Bwe9yrs7E5sA9uVQHPPGPL8bDKqyHMYTTyxyryEvf',
        collectionName: 'Honey Genesis Bee',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679311853814_honeyGenesisBee.jpg',
        collectionFloor: 905075500,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'EvotL6isFj6obHiVWd2zw2qEfzDUoJdadK9vdXXWFVu2',
        collectionName: 'Honeyland Genesis Bees',
        collectionImage:
          'https://creator-hub-prod.s3.us-east-2.amazonaws.com/honeyland_genesis_bees_pfp_1669056750194.png',
        collectionFloor: 6078930000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'HNLkPeiT8pYdhZN7njR2ycxymRvp9JzdEUFAmqVMWJWz',
        collectionName: 'Honeyland Land',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679312061218_honeylandLand.jpg',
        collectionFloor: 9389639999,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '4epbrDfyTzkQtVkRUC42sgqBAdzcnimTn1WrkQ3jJN9H',
        collectionName: 'Immortals',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679312119354_immortals.jpg',
        collectionFloor: 1004958000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '3XNDESsPhCaDkYc37npnYX155jNDUE7xHXwXJMWcSh1u',
        collectionName: 'Infected Mob',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679312000015_infectedMob.jpg',
        collectionFloor: 1895201000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '4VLZXumNYehhsU8qhyN1jHoQjMMhorsb17FH29ba6Ci2',
        collectionName: 'Jelly Rascals',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679311819423_jellyRascals.jpg',
        collectionFloor: 24088960000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '4wVN9SN5ACLXiCRchweeNv5vtJHKAyAefvdot7FfpDr4',
        collectionName: 'Jikan Studios',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679311900889_jikanStudios.jpg',
        collectionFloor: 381270000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'DZDrrD8J5uuw6JwGZeERhuupJi39YmK1Sf2ACsLscxg8',
        collectionName: 'Knittables',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679312111691_knittables.jpg',
        collectionFloor: 786822000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'BSbVGYVvEgadtMSrds3FRFUYE9tXdEc8mgsdJmYoh28y',
        collectionName: 'LILY',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679309973226_lily.jpg',
        collectionFloor: 2210929350,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '2iCxJsXQ9qJaQAZ6VaDqEHC8rLY1pkzRfRbgQwhdGvC4',
        collectionName: 'Lazy Alpha',
        collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/lazy_alpha_pfp_1652953834699.gif',
        collectionFloor: 11266500000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '3BmXmT71zPybycBebvttavzAMW6NtmEGqB9uY641FSp6',
        collectionName: 'Liberty Square: The Hallowed',
        collectionImage:
          'https://bafybeicg2dislxyztyix6efaatdke3ll76goy3qiqtdnj5bszxhmpu3rki.ipfs.nftstorage.link/TheHallowed_ME_Profile.png',
        collectionFloor: 469532700,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'B2EPFiboQbkTc4bM1YfoGWwAXiN65Soqq5AzW5emD4Vv',
        collectionName: 'Liberty Square: The Sinister Squirrel Syndicate',
        collectionImage:
          'https://api.frakt.xyz/image/400x400/1679312188138_libertySquareTheSinisterSquirrelSyndicate.jpg',
        collectionFloor: 2759754000,
        offerTvl: 13500000000,
        activeOfferAmount: 1,
        bestOffer: 1500000000,
        bestLtv: 54.3526705641155,
        activeBondsAmount: 1,
        loansTvl: 1492500000,
        marketApr: 10400,
      },
      {
        marketPubkey: 'HpzJyoNhfwbtco6Z8ghtqf85cDwFpYWqkBo1X1ah8cwX',
        collectionName: 'Lifinity Flares',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679309341175_lifinityFlares.jpg',
        collectionFloor: 6546750000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '4aNWv472mYrdkyxuHX5umQr8NzfoeawDygQoQpydfAxn',
        collectionName: "Liko's Banana",
        collectionImage:
          'https://k7q2qemwuv5n2vrp6qhkuscl2dqumz7ltrq4pog56qahdbwfpqwq.arweave.net/V-GoEZalet1WL_QOqkhL0OFGZ-ucYce43fQAcYbFfC0?ext=png',
        collectionFloor: 4107705000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'J4Rh6mZEBSq1aPgd739D8KoHuLz4cKwGJ2Vhv2WAqq7G',
        collectionName: 'Looties',
        collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/looties_pfp_1653388120539.png',
        collectionFloor: 28868580000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '7GmQZfdWoa1HsonxKVptBr2qT4kz4U4dV8NP6ZS9Tzh9',
        collectionName: 'Lotus Gang',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679309976572_lotusGang.jpg',
        collectionFloor: 1907185000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'DwfzEfpuBnPCYpo4A68MMyzciDBsH2ZxPdtczGEVyitC',
        collectionName: 'MARA',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679312117575_mara.jpg',
        collectionFloor: 113955000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '3eF8HfdCFJyAo59zgojh8JqpXAWPYoBZtHeN4p5kbjLy',
        collectionName: 'Mad Lads',
        collectionImage: 'https://madlads-collection.s3.us-west-2.amazonaws.com/_collection.png',
        collectionFloor: 67687382400,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '6rL4u7WA31ctVc5pRVrcYeKKFmcHToT7K9vCjePsQQfi',
        collectionName: 'Magic Ticket',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679311802180_magicTicket.jpg',
        collectionFloor: 1217898500,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'BZyx4nCpkT2b5pWsWZMX3Qa5yPawifFCff2Lb7GzAmHK',
        collectionName: 'Matrica Labs: Pixels',
        collectionImage:
          'https://xlanocctkcrws5ujfbyirg7r2yln7b3nxnsxalukcs2qmqf5wamq.arweave.net/usDXCFNQo2l2iShwiJvx1hbfh227ZXAuihS1BkC9sBk?ext=png',
        collectionFloor: 4809706199,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '3VW8kV9GvGnRWXUZkhLTRhEk3oa1Bud7xA4z7AbV6jb3',
        collectionName: 'Meegos',
        collectionImage:
          'https://img-cdn.magiceden.dev/rs:fill:400:400:0:0/plain/https://creator-hub-prod.s3.us-east-2.amazonaws.com/meegos_pfp_1692443263785.png',
        collectionFloor: 3049250400,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'Cr16CAXiVYU7toULb2KuwaV9mm3C8GoUGNhPZJYnjebS',
        collectionName: 'Monkey Baby Business',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679311789183_monkeyBabyBusiness.jpg',
        collectionFloor: 20370000000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '6LRYZdNeJhnDdxLH39nrsTVV2JuFnEb3vVVJHbVKvQth',
        collectionName: 'Monkey Gods',
        collectionImage:
          'https://nftstorage.link/ipfs/bafybeieth5qpqmz5wt3fbbstccl7kls6wclestscsjkpzt6fm6uqrkuxaa/2.png',
        collectionFloor: 4313750000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'BJkGa1CwALynq86qUM4GjtxtxtXQgDPtFXws3WUjroJu',
        collectionName: 'Nekkro',
        collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/nekkro_pfp_1686997107265.png',
        collectionFloor: 3606960000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'H24qHrc9ww5VWJ7hkKJCq547K3Eb12gKyWDi1DiJj7ry',
        collectionName: 'Nekozuma',
        collectionImage: 'https://arweave.net/2uyILOKasKWt7yKB4sASXUMrvuFj0biwoa0N3oGGRqM',
        collectionFloor: 1984700000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'CEsiqscuLd2Ja1awHHW9CF9DTGcLVNFNKxPwTf6BYksJ',
        collectionName: 'Netrunner',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679310001331_netrunner.jpg',
        collectionFloor: 516635000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '4VNjg3XdW7nkXyEDKckHetK9tQkJwcBJnLGUaCPGd5Kv',
        collectionName: 'Nuked Apes',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679311833977_nukedApes.jpg',
        collectionFloor: 2872800000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'Gntq5xrV1TdbNYDBEbG1mNdTt5NNiGKG4mdKrrM6Ss1x',
        collectionName: 'Oak Paradise',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679312026295_oakParadise.jpg',
        collectionFloor: 1866585000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '3BsNsosfQdNMGNVYNNehz3pDZ2GFgDzsdUUDHpUw1DZn',
        collectionName: 'Obsidian Shards',
        collectionImage:
          'https://prod-image-cdn.tensor.trade/images/slug=05c52d84-2e49-4ed9-a473-b43cab41e130/400x400/freeze=true/https://prod-tensor-creators-s3.s3.us-east-1.amazonaws.com/drop-metadata/ce630426-de91-4b0c-98bf-881bbc854c0d/images/obsidian.gif',
        collectionFloor: 0,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '7hZYBSfxVJEydFxzugnthKJn8f2Xq3Hh44Noi6rXqUF8',
        collectionName: 'Okay Bears',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679309335964_okayBears.jpg',
        collectionFloor: 23621700000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '8L3WXgUCzeer9W65Gs7x7g319EjKyR4E8MmFqrgAgwu7',
        collectionName: 'Orbital',
        collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/orbital_pfp_1677850265308.gif',
        collectionFloor: 1653960000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'FDY3jeYrxUtqKwZFtdnxdKGDkLzE4xi58CdcLuEPqy7C',
        collectionName: 'Ovols',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679309991805_ovols.jpg',
        collectionFloor: 2257595200,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'FQ6TByAUjohLRiF9HKqTi155hcNdkiG2NM9myMwxnEpG',
        collectionName: 'POP!',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679312139716_pop.jpg',
        collectionFloor: 399821892,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '4LgwXpZQZexQ4iDpvy4nD95AgZtbQwbrWfCyQ7H8Lbqd',
        collectionName: 'Parlay',
        collectionImage: 'https://storage.googleapis.com/feliz-crypto/project_photos/parlay.png',
        collectionFloor: 11672500000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '7V1x3MrFfWYFWMLiNMUpDKdRHtRCifTuYmDndFddErxh',
        collectionName: 'Pawnshop Gnomies',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679309924442_pawnshopGnomies.jpg',
        collectionFloor: 11966850000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '4y1EREYcwtVUhQvS1qoTZDhSqo57R2FB4dZypMpVFZyW',
        collectionName: 'Pen Frens',
        collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/penfrens_pfp_1646407666353.gif',
        collectionFloor: 3218600000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '2RvqvRuqqCsx1E16j9taHeVCgmRYWTKX6AFcHZLGtYSD',
        collectionName: 'Pesky Penguins',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679309339507_peskyPenguins.jpg',
        collectionFloor: 2019120000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '5Sv82y2nhQcfGDFeM88h92RcVFht4TmqRxXxB5BDUYKD',
        collectionName: 'Photo Finish PFP Collection',
        collectionImage: 'https://assets.thirdtimegames.com/pfl-pfp/7714.png',
        collectionFloor: 23430000000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'EixhhHHXu3XP8EB3RuUpngoBEnNnvdpoJCkgDavpbE2M',
        collectionName: 'Pixel Panda Crew',
        collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/pixelpandacreew_pfp_1646684986619.png',
        collectionFloor: 76125000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'BYqCxpV1x2QSMdNhT4NEpKciQRP8zvp37Z4niBXZWaE6',
        collectionName: 'Pixel Puffs',
        collectionImage: 'https://arweave.net/sB6zYPoThxGXR87mNyF5CI-z_ZK7LR6GaEpwdlH54_w',
        collectionFloor: 4816500000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '875hjsh3MGjFQkm2ExyWThBMfDTJ8Xjuwb9ECeRFnhbr',
        collectionName: 'Portals',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679309337739_portals.jpg',
        collectionFloor: 11169720000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '9CAFu55fBScqHVHjQE64PR47nG5r6Q1iGyggwMW4x36b',
        collectionName: 'Primates',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679309917929_primates.jpg',
        collectionFloor: 4121550000,
        offerTvl: 27000000000,
        activeOfferAmount: 1,
        bestOffer: 3000000000,
        bestLtv: 72.78815008916548,
        activeBondsAmount: 1,
        loansTvl: 2985000000,
        marketApr: 10400,
      },
      {
        marketPubkey: 'HSWmhuT3gr8y594kSJ67CE84oXHMSczKJWAHb3tggFVa',
        collectionName: 'Raccs',
        collectionImage: 'https://nftstorage.link/ipfs/bafkreiedtknmjb5ocik5yy2v7bgwz7tr7qqxzknpssb7uoh4pobi4fxqwa',
        collectionFloor: 1002250000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '7iYVjmwjskTa53KW4NkcmKpqcJZTqr6cCcGiMFnnNhse',
        collectionName: 'Reavers',
        collectionImage: 'https://storage.googleapis.com/reavers-56900.appspot.com/reaversNftsProd/983.png',
        collectionFloor: 10222935000,
        offerTvl: 63000000000,
        activeOfferAmount: 1,
        bestOffer: 7000000000,
        bestLtv: 68.47348633244758,
        activeBondsAmount: 1,
        loansTvl: 6965000000,
        marketApr: 10400,
      },
      {
        marketPubkey: 'J941MK1yDWc9NouBpr1bw9pPwUK4pfcXJMiviu4Wbdw1',
        collectionName: 'SMB Barrels',
        collectionImage: 'https://nftstorage.link/ipfs/bafkreihka22rqdxvqy7fj4cgeslfdunt44fexwx6tij6hqdryet2v45qvu',
        collectionFloor: 9157924350,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '9BEPCHtAhYh3Jbtot1RJjbWgfcdnRyoafHCbgMVYoqXW',
        collectionName: 'SMB Gen3',
        collectionImage: 'https://bafkreibtf35tniaqma43kvn5upi2e4qlroid56jxfm3nqtwjldrzaxrgtu.ipfs.nftstorage.link/',
        collectionFloor: 6176989350,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '5FxURkTvCwjmurNbhLfYhYpU5E2Zb4QLtztjUYfA4cZa',
        collectionName: 'Scalp Empire Nestor Edition',
        collectionImage:
          'https://creator-hub-prod.s3.us-east-2.amazonaws.com/scalp_empire_nestor_edition_pfp_1646464613353.png',
        collectionFloor: 2750650000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'Gr2rKVJTFbqUDmWVGWtng7dXZGuiAcwpJs2hhuH4vX3p',
        collectionName: 'Secret Skellies Society',
        collectionImage:
          'https://beta.api.solanalysis.com/images/400x400/filters:frames(,0)/https://v5.airtableusercontent.com/v1/13/13/1671472800000/SltGnzxN68oU0zS-FVO7AA/TmdLd9tCeUFXufiE2hw37jzMEENcDq0eMJ3EOQG9sRRF0osX7giaoYqfA4LJhdpF5pvuzrroqB-n3Ti6daHVNA/-PRbkl4IeX2vvAsTU5aNjgXbnpQLTrO2J6rDbSuNE4Y',
        collectionFloor: 392703500,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '3me4HNvkoWUCJq7A6dA6Csa6KWxyx8zBdPfrWubp2KnL',
        collectionName: 'Sentries',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679312181685_sentries.jpg',
        collectionFloor: 609000000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'AGo9rDJG6LauaYoYV92kU6gM1pgiMoDMaHjUwsT8bQ4B',
        collectionName: 'Silicon Shards',
        collectionImage:
          'https://prod-image-cdn.tensor.trade/images/slug=05c52d84-2e49-4ed9-a473-b43cab41e130/400x400/freeze=true/https://prod-tensor-creators-s3.s3.us-east-1.amazonaws.com/drop-metadata/74c71c16-8cbb-4440-805e-a040f34a4c84/images/silicon.gif',
        collectionFloor: 0,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'AwsTSnLff1uyqVpT6vwQRjkjNDHKSVJaMrWGqG5yrEo3',
        collectionName: 'Smart Sea Society',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679312007608_smartSeaSociety.jpg',
        collectionFloor: 77210000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '6BAw8PdkMwU6uVcqXvwYn3Zbejpj6MEYxuopKDDLMQwF',
        collectionName: 'Smyths',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679309333698_smyths.jpg',
        collectionFloor: 0,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '98HG4ngUCd1tc1gZE8LuuMjFLTaHQG5LvysDbvYbtDR2',
        collectionName: 'Soblins',
        collectionImage:
          'https://zvo5wkj2qmqgppsrrudca2ipidczxao5amehm43xvmcdx5as67sa.arweave.net/zV3bKTqDIGe-UY0GIGkPQMWbgd0DCHZzd6sEO_QS9-Q',
        collectionFloor: 162600000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '45sAMdXKSmNkiHEpaopVs33SaoAgfX6yQ6i1RgiALSUs',
        collectionName: 'SolRarity - Rarikeys',
        collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/rarikeys_pfp_1648514569411.png',
        collectionFloor: 3378989100,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'BKTH6dKm3WTwYAr9PxKSEgPfHScqxtMqgfD8kuZ2QPm',
        collectionName: 'Solcasino',
        collectionImage:
          'https://img-cdn.magiceden.dev/rs:fill:400:400:0:0/plain/https://bafybeidd6mu775yyagyr4vgo6y2ayb5dc7vylv5arnd3mupbscek5zveya.ipfs.nftstorage.link/',
        collectionFloor: 60087573000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'BG2tumG6YWSQw1xBrDp3KXpgXjyNjcm5qQXi3S3WLUWT',
        collectionName: 'Solpunks',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679311662511_solpunks.jpg',
        collectionFloor: 3035865000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'J4Gv7erydmkjktpRa8VLBTszTPkHArAe8amZ9Gkh93Vm',
        collectionName: 'Solsteads Surreal Estate',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679311795811_solsteadsSurrealEstate.jpg',
        collectionFloor: 3661470000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'Ad2tuLWeSroMJVuoWMehQ9CbEM7yHWwb2LvghWm4xHGF',
        collectionName: 'Sorcies',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679312053872_sorcies.jpg',
        collectionFloor: 19183500,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'BHjTiajLCGnqQTCCFb9vGBEBWaCQfw2BuLghy7wGY2Gp',
        collectionName: 'Stoned Ape Crew',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679309321580_stonedApeCrew.jpg',
        collectionFloor: 15388078500,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'Edn44sT51wYpxaSA3EqpS8JJqKUXFfGRyqUGvCf4mAdv',
        collectionName: 'Subber K3Y',
        collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/subber_k3y_pfp_1671058143838.gif',
        collectionFloor: 737694600,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '4T139wA9SsGxYfSoyG7bkxJhffke16u9bYRK2tayanhS',
        collectionName: 'Taiyo Infants/Incubators',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679311964476_taiyoInfantsIncubators.jpg',
        collectionFloor: 22354500000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '8jdBd8K62xFioY69oAsinVaHDEfC8AE2fsWDVDTAdSVD',
        collectionName: 'Taiyo Oil',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679311979543_taiyoOil.jpg',
        collectionFloor: 4271200000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '9KRsnTdZs4nz99j3c1ubU5QCAwjvXDTH2Jiyv728w3s',
        collectionName: 'Taiyo Pilots',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679309993826_pilots.jpg',
        collectionFloor: 6527000000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '7Gn2UXqdgZiEFfDpiCPQYKGAtVdp98mWkLRsCbAp9fXR',
        collectionName: 'Taiyo Robotics',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679309331127_taiyoRobotics.jpg',
        collectionFloor: 68995500000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '785cJ8J2CL1WL9NVDhMUXm4Q1CC8dXDytpSap5DPTa2J',
        collectionName: 'Tensorians',
        collectionImage:
          'https://prod-image-cdn.tensor.trade/images/400x400/freeze=false/https%3A%2F%2Fpublic-cdn.tensor.trade%2Fcollection_splash%2Ft2.gif',
        collectionFloor: 14062680000,
        offerTvl: 70000000000,
        activeOfferAmount: 1,
        bestOffer: 10000000000,
        bestLtv: 71.11020090053958,
        activeBondsAmount: 2,
        loansTvl: 10352160914,
        marketApr: 10400,
      },
      {
        marketPubkey: 'Eus61W7QjKjCCNjZWhwVPhYLSq7HADMpVnMZNHB5cA3P',
        collectionName: 'Terra Shards',
        collectionImage:
          'https://prod-image-cdn.tensor.trade/images/slug=05c52d84-2e49-4ed9-a473-b43cab41e130/400x400/freeze=true/https://prod-tensor-creators-s3.s3.us-east-1.amazonaws.com/drop-metadata/85c928a2-4871-4eef-a5e0-ebe511c53c0d/images/terra.gif',
        collectionFloor: 0,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '6nz5LyuYMe8CgdCKAxJATk3jwfkuhccbGLf3wJTiAXFM',
        collectionName: 'The Anon Club',
        collectionImage: 'https://storage.googleapis.com/feliz-crypto/project_photos/888anonclub.png',
        collectionFloor: 0,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '8bHZnznLPFrrTJ53qgSQkBq1dGvTSVKekB1VAmdzLxtq',
        collectionName: 'The Bastards',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679312210469_theBastards.jpg',
        collectionFloor: 1361813600,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'zFwceZU2s3TzvZhAsk5L6puanbJsB1DG2dK2BVxYH77',
        collectionName: 'The Box by The Hoopas',
        collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/hoopas_the_box_pfp_1683797448911.png',
        collectionFloor: 1468320000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'B32ihn9CvNDLnBnfxodjuNir4ddBwnxrKHQ29oZ67Naa',
        collectionName: 'The Bridged',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679311804429_theBridged.jpg',
        collectionFloor: 1015162399,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'FWKiZtp9cdHf6g6AFWbKGiyZ3bUNbE4QCAqaPikDw5h3',
        collectionName: 'The Catalina Whale Mixer',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679309907678_theCatalinaWhaleMixer.jpg',
        collectionFloor: 11502000000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '53To698xbfdXGfdbLBGh1WVDzhLaZfb3gSyfqjS6CVMT',
        collectionName: 'The Decod3rs',
        collectionImage: 'https://nftstorage.link/ipfs/bafybeifoqdg6mpsm7dp44eil37zw5rxyxrzqkwak65zxixbj5gentgbok4',
        collectionFloor: 1331125000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'GCp1SZuERycq5Xe2WAhg7WPcbUNUyhg3QcH2sRSZvMMe',
        collectionName: 'The Fox Club',
        collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/thefoxclub_pfp_1673434678154.jpeg',
        collectionFloor: 2166125000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'GQuQdC7tSpWoCDWHpVwGjvKEEtbx15nqVowMuQ9E6vgc',
        collectionName: 'The Greyhound Cannabis Club',
        collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/gcc_pfp_1682706145932.jpeg',
        collectionFloor: 86000000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'DJ93XkwUQXipHEpNCf8esEZf2mPh1NFhqLoYMnHL1Baw',
        collectionName: 'The Heist',
        collectionImage: 'https://bafybeigch4m7rbec2l255powwbjmacnyj5n5o54qcboiwfgs2nnw6thimq.ipfs.nftstorage.link/',
        collectionFloor: 12704160000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '5Fhoto2HqAMn7DcuvMNbjKDGcc9jwhPrZebWThrxRx52',
        collectionName: 'The Heist: Orangutans',
        collectionImage: 'https://bafybeig7u2mevivictt5j4hyuwio7x4tcfg544dy3dcdzssvazia77fmmu.ipfs.nftstorage.link/',
        collectionFloor: 0,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'CQnzeU8BiDFyKA4wpkKVZaFhQztubE67L8gpUmxUbMAN',
        collectionName: 'The Lowlifes [0.G]',
        collectionImage: 'https://bafybeico7frgy6fbqlcyoefzz5pjmv35ciljhe4amx2wsrlivirfs7liee.ipfs.nftstorage.link/',
        collectionFloor: 15832320000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '2irC4AuS9y7iMte7Mh2wuwB1dAg69tVK4wDeYcUzhUkx',
        collectionName: 'The Remnants',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679311830438_theRemnants.jpg',
        collectionFloor: 2024925000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '8pdR5BZbzM4N54Sqwivvx2pPiHcc6b3qvAYKPrVpN77o',
        collectionName: 'The Stoned Frogs',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679311827787_theStonedFrogs.jpg',
        collectionFloor: 517538000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '9W5itCCoFBFVG8zUwSoUmgvzBscAgsoFyXjH9dCX2jGm',
        collectionName: 'The Suites',
        collectionImage: 'https://bafkreifqopva2uobrl7yurl7p677krfq57senk22qufl4jpnt4d4vz6k2u.ipfs.nftstorage.link/',
        collectionFloor: 2182635000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '9X5LRDqhAkjsyztznqhQuX3FiXH9dSQvX3WwpGgJA11d',
        collectionName: 'Thesmophoria',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679312177588_thesmophoria.jpg',
        collectionFloor: 855445001,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '8rwuK5ctxoiX2MpBY4ML7D7dUNJciCq2HDCPZuSKFRhh',
        collectionName: 'Thugbirdz',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679309905788_thugbirdz.jpg',
        collectionFloor: 5054700000,
        offerTvl: 30000000000,
        activeOfferAmount: 1,
        bestOffer: 3000000000,
        bestLtv: 59.35070330583417,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'EqcM3A78oemLBVQAaWqwoLor8JUAVHMxd1HFS68Mxisj',
        collectionName: 'Toonies',
        collectionImage: 'https://nftstorage.link/ipfs/bafybeifpqubqsrpfnxyqe6bypiclue5umn2qdtptlxeqifdsi4455zdy7e',
        collectionFloor: 5070000000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '2nzn8pwRL8brPebYoAFnyDWGcPer2XEzrnp1YRj3y8Jm',
        collectionName: 'Transdimensional Fox Federation',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679311912412_transdimensionalFoxFederation.jpg',
        collectionFloor: 9295000000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'AipxMFSRmfDLBzCKsB4dP9ErvqmXM6YoDAgBcEXodYMX',
        collectionName: "Trippin' Apes",
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679309920193_trippinApes.jpg',
        collectionFloor: 1341900000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'F5v95GknzhbvLkGeqn9qTfQWZR4vDPksQe4tCs3N4MyJ',
        collectionName: 'Turtles Classic',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679309898791_turtles.jpg',
        collectionFloor: 812000000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'F7uMHZR4bz4Z5fK3VqcT8DULSmDUbVgFQ52P5rFic4js',
        collectionName: 'Ubik',
        collectionImage: 'https://storage.googleapis.com/feliz-crypto/project_photos/ubik.png',
        collectionFloor: 421244160,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '3sUxGTFV698sJQXJk6jqiVsejn5LU1SCt4VL1x8yeTC2',
        collectionName: 'Undead Genesis',
        collectionImage:
          'https://bafybeidpmbpy635k3o26egygasbrp4nv5fnocozzclp63k4dsd635bmkpi.ipfs.nftstorage.link/0.gif',
        collectionFloor: 336040000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'E3fcwDhax2vYPHWKwMD2p2Xbn6Sche2CcE4UPK7pkWmy',
        collectionName: 'Underground DAO',
        collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/udao_pfp_1651855541352.png',
        collectionFloor: 7736819999,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '6poP28NYtHUEr2B3BXFM6tiTBDVcCNqPapnEDctjR6TB',
        collectionName: 'Underground Society',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679312130398_undergroundSociety.jpg',
        collectionFloor: 355250000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'Csjs5Ng8QmKWuHkV5A2dGRq72NaY4FwF9Rdm1xGeA9DV',
        collectionName: 'Underworld',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679312173275_underworld.jpg',
        collectionFloor: 4208100000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '6hnUT3ckB5yFqjpQ2TrSj2HYB1K4wn5vfsSibZzxuZHE',
        collectionName: 'Utility Ape',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679312197944_utilityApe.jpg',
        collectionFloor: 91260000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '7hVGKBwdHtgjQ9NgWQPQ1QVs4brrcPgZtbNCA3h5fFz2',
        collectionName: 'VTOPIANS',
        collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/vtopian_pfp_1694275807711.png',
        collectionFloor: 0,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '3X18Cen2gqMRtMYpmisuagnC9EHEWs8MuoLZRYJyna26',
        collectionName: 'Vibe Knights',
        collectionImage:
          'https://nftstorage.link/ipfs/bafybeihjssblkjyfyo5unvr75h4th5jjonbmbrkdd475hghxfnzwo47pxe/820.png',
        collectionFloor: 468600000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'CgCQPXyzBkVEYard34eEUiwAJP1aqt9kEc8PLrHuY5rr',
        collectionName: 'Wise Whales',
        collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/wise_whales_pfp_1672177486455.png',
        collectionFloor: 1904559999,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '2s6ViByZ6GN76xTG3ppnzS87HfCAjWfJ9mm8h6Az4jcg',
        collectionName: 'Wolf Capital',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679312213493_wolfCapital.jpg',
        collectionFloor: 740209860,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'E2tASHzvDReZGF2LpZJEJ1pwpfg3LZSy2EuJCPfU3A4R',
        collectionName: 'Zero Monke Biz',
        collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/zmb_0735_pfp_1675737312377.jpeg',
        collectionFloor: 5516160000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '75CeUwwHH2XjQh18Sz3UjA8tuUmQ4cGuzQvH5xtF9ChV',
        collectionName: 'oogy',
        collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/oogy_pfp_1680223880799.png',
        collectionFloor: 4224000000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '79EvjMGFuYjBFL3iDK9PMfSHrUSsDRQbA3SueJVFbYQs',
        collectionName: 'oogy pods',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679312212100_oogy.jpg',
        collectionFloor: 6325440000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'BE6vUHoFxdCRLmQQYWHe4W4XQ8JbXWgmDLUoxQFAc98t',
        collectionName: 'ooze',
        collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/ooze_pfp_1679341922341.png',
        collectionFloor: 141960000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: 'J5hQApC9jGBoPPbhk5oNfjgE7VGs7Qp9S8Enbsr9U1EG',
        collectionName: 'sharx by sharky.fi',
        collectionImage: 'https://storage.googleapis.com/feliz-crypto/project_photos/sharx.png',
        collectionFloor: 8308678350,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
      {
        marketPubkey: '7YYJtRh32QNvxan1ZagW2RJGWo4Nyhhyao2TrRFafToX',
        collectionName: 'y00ts',
        collectionImage: 'https://api.frakt.xyz/image/400x400/1679309943282_y00Ts.jpg',
        collectionFloor: 134830000000,
        offerTvl: 0,
        activeOfferAmount: 0,
        bestOffer: 0,
        bestLtv: 0,
        activeBondsAmount: 0,
        loansTvl: 0,
        marketApr: 10400,
      },
    ],
    meta: { skip: 0, limit: 10, totalCount: 180 },
  };
  const whitelistOld = [
    {
      marketPubkey: 'ATVSb8uCKvWmP2Pm2QgzMieQje5J1qmnJTymQXHZgHBi',
      collectionName: 'ABC',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679309901155_abc.jpg',
      collectionFloor: 12163760000,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '75.287',
      activeOfferAmount: 8,
      bestOffer: 9495858191.68,
      bestLTV: 79.66,
      bestBorrowerLTV: 78.067,
      activeBondsAmount: 1,
      fee: 0.24127231527839998,
      bestDuration: 7,
      loansTVL: 10395193200,
    },
    {
      marketPubkey: 'H4Pf8GYEDSGAKEB86c164xiUZTi2yzcahXErPNCxycR6',
      collectionName: 'AGE of SAM',
      collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/aos_pfp_1669992364632.gif',
      collectionFloor: 1050501999,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: '7famMQFxi82BuPqDUkd8ZTJCkKceXAFTVX75DHwnqJmJ',
      collectionName: 'AlphaBlock',
      collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/alphablock_pfp_1658081956725.gif',
      collectionFloor: 1895250000,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '3.982',
      activeOfferAmount: 81,
      bestOffer: 1225476231,
      bestLTV: 65.98,
      bestBorrowerLTV: 64.66,
      activeBondsAmount: 420,
      fee: 0.031137100154999993,
      bestDuration: 7,
      loansTVL: 685766779600,
    },
    {
      marketPubkey: 'Fx4fmYw7R1y4FPvFLAv19AE7sfBTGWS7dtqLWNnBJTno',
      collectionName: 'Alpha Pharaohs',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679312158405_alphaPharaohs.jpg',
      collectionFloor: 6017250000,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '21.278',
      activeOfferAmount: 5,
      bestOffer: 4698064213.500001,
      bestLTV: 79.67,
      bestBorrowerLTV: 78.077,
      activeBondsAmount: 2,
      fee: 0.11936918256750001,
      bestDuration: 7,
      loansTVL: 10252829100,
    },
    {
      marketPubkey: '3V2CGed1EDptPruwk5yxWx18Kgg4SBaCYk42dh4EJq9B',
      collectionName: 'Anon Evolved',
      collectionImage: 'https://arweave.net/B-7jXbspeekQipTnk1TmyRqCXNu3UOvV25cXJ-Ta7Hk',
      collectionFloor: 3217550000,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '0.050',
      activeOfferAmount: 1,
      bestOffer: 48874584.5,
      bestLTV: 1.55,
      bestBorrowerLTV: 1.519,
      activeBondsAmount: 0,
      fee: 0.0012418134225,
      bestDuration: 7,
      loansTVL: 0,
    },
    {
      marketPubkey: 'AXKAQ7ecmUPxVXiTpPyuzxZ1Ao4KFK5db24vrbrEDSDi',
      collectionName: 'Anons',
      collectionImage: 'https://bafkreihmob4prxg4gpjh57xe35yzj2lnceu3jtke2eqmrtq67wtb7djhwe.ipfs.nftstorage.link/',
      collectionFloor: 1693350000,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '15.355',
      activeOfferAmount: 5,
      bestOffer: 587954826.9,
      bestLTV: 35.43,
      bestBorrowerLTV: 34.721,
      activeBondsAmount: 2,
      fee: 0.0149388522345,
      bestDuration: 7,
      loansTVL: 1001728673,
    },
    {
      marketPubkey: '5nTysvQ4Dg5embuwiXbZwfrjzdTHFvVjNi5TaRCR1Tyu',
      collectionName: 'Anybodies',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679312080529_anybodies.jpg',
      collectionFloor: 5857393500,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: 'F6E59KQir51LNY9F7NHsVrN5bj3TwewGbSgdUL7xjaLF',
      collectionName: 'AssetDash Vanta',
      collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/assetdash_vanta_pfp_1684801128108.gif',
      collectionFloor: 7902300000,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '105.355',
      activeOfferAmount: 113,
      bestOffer: 5997150297.6,
      bestLTV: 77.44,
      bestBorrowerLTV: 75.891,
      activeBondsAmount: 10,
      fee: 0.152376573888,
      bestDuration: 7,
      loansTVL: 71689636200,
    },
    {
      marketPubkey: '78KxLzSGNu3H3cXw7dxpvfoi3HQwCDiQkvTrzX4i5fTd',
      collectionName: 'ATOZ',
      collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/atoz_pfp_1680969333393.png',
      collectionFloor: 7384160000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: 'AjBCRjBhzVNGk2sgFDjaLZmS8NM41xsMYSAMhnv1Gtrn',
      collectionName: 'Aurory',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679310022353_aurory.jpeg',
      collectionFloor: 16240000000,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '74.993',
      activeOfferAmount: 8,
      bestOffer: 13045689440,
      bestLTV: 81.97,
      bestBorrowerLTV: 80.331,
      activeBondsAmount: 4,
      fee: 0.3314670072,
      bestDuration: 7,
      loansTVL: 50895467000,
    },
    {
      marketPubkey: 'DRFLEcG8PGatbyQUEFAJmoZBgGnmRibq6H3yfkumcWbn',
      collectionName: 'Banx',
      collectionImage:
        'https://prod-tensor-creators-s3.s3.us-east-1.amazonaws.com/image-33c03f28-6ab7-4481-9fa6-0127b7db1621',
      collectionFloor: 8531987730,
      apy: 52.14,
      duration: [7],
      offerTVL: '1761.441',
      activeOfferAmount: 681,
      bestOffer: 6840111627.116461,
      bestLTV: 80.97999999999999,
      bestBorrowerLTV: 80.17,
      activeBondsAmount: 1435,
      fee: 0.10294713458993461,
      bestDuration: 7,
      loansTVL: 9858870770291,
    },
    {
      marketPubkey: '9vpu9nuTki6ByqkydowoRt9bJbDVqnSBK8shejbfbwo6',
      collectionName: 'Beans by Raposa',
      collectionImage: 'https://bafkreies37lv4bntrirxbqxbeklaijace7mze36ifhuj7ur5hcncgqf6di.ipfs.nftstorage.link/',
      collectionFloor: 3716850000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: '24Gjdmzzj1XGtzds82TDeZdng4pHDhQqWsg9RjKKF27U',
      collectionName: 'Bear Drop #1: Founders Coins',
      collectionImage: 'https://bafybeihk5ci2yoltqduesihfggh7bbaah7djicne62hztsl5jrhmnh64yi.ipfs.nftstorage.link/',
      collectionFloor: 1267500000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: '48C8rxAo8wEKBjuFhUMRUXRyg1HufSdCbh7zrbzgVonA',
      collectionName: 'Best Buds',
      collectionImage:
        'https://bafybeifqa5uu7om66ldyuemlpo22zacjiproqn2tqsx3qo4rqtnvn5pqj4.ipfs.dweb.link/503.png?ext=png',
      collectionFloor: 3183960000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: 'G17AoLKEcGpH9NsTvCvKXWVT79cKcXcVQS66pAwapCiF',
      collectionName: 'Blockasset Legends',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679311942440_blockassetLegends.jpg',
      collectionFloor: 4340000000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: '8MpvgxmbEunJjLCPw3mUmjtsVCBaCqDqmGy4TznvpXw1',
      collectionName: 'Bodoggos',
      collectionImage: 'https://ipfs.io/ipfs/QmcQYWF1Kmpz5GuKqPHCMRbUCRAVC4gCq8nkA5RPDsB7pK',
      collectionFloor: 1996896000,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '0.000',
      activeOfferAmount: 9,
      bestOffer: 44800,
      bestLTV: 100,
      bestBorrowerLTV: 0.002,
      activeBondsAmount: 0,
      fee: 0.0000011382857142857142,
      bestDuration: 7,
      loansTVL: 0,
    },
    {
      marketPubkey: 'EyAGE3PmEErxbrnJWhGPMLtoXvKP9No4C9CoVDfB4wMz',
      collectionName: 'BONKz',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679310146322_bonkz.png',
      collectionFloor: 669900000,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '0.050',
      activeOfferAmount: 1,
      bestOffer: 49993800,
      bestLTV: 7.68,
      bestBorrowerLTV: 7.463,
      activeBondsAmount: 0,
      fee: 0.0012702506326530613,
      bestDuration: 7,
      loansTVL: 0,
    },
    {
      marketPubkey: '2dEKbNnsA3tdVsgMR4x1KBiZxbchmwo7Q7HfEzCGg3h2',
      collectionName: 'Bored Ape Solana Club',
      collectionImage: 'https://bafkreihmrwipluc6ro6uzl5ue2mkknexkkxw34df5icy4pzoh54lieexcq.ipfs.nftstorage.link/',
      collectionFloor: 12034050000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: '5oWULbD8hpEKXcvrzcUqUUPsrdVJ26ZKQCZAruh29CHC',
      collectionName: 'Boryoku Dragonz',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679309345491_boryokuDragonz.jpg',
      collectionFloor: 14036700000,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '100.000',
      activeOfferAmount: 1,
      bestOffer: 12655488720,
      bestLTV: 92,
      bestBorrowerLTV: 90.16,
      activeBondsAmount: 0,
      fee: 0.3215527236,
      bestDuration: 7,
      loansTVL: 0,
    },
    {
      marketPubkey: 'CSqWbRYhgcamUfXDAmSM36nXFJsB1rTQ9N99uivK5Tz7',
      collectionName: 'Bozo Collective',
      collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/bozo_collective_pfp_1696263152018.png',
      collectionFloor: 1624100000,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '5.000',
      activeOfferAmount: 1,
      bestOffer: 556907138.1999999,
      bestLTV: 34.99,
      bestBorrowerLTV: 34.29,
      activeBondsAmount: 17,
      fee: 0.014149987491,
      bestDuration: 7,
      loansTVL: 19586525000,
    },
    {
      marketPubkey: 'wVHFAbr9yhwHg76h68SNk8hebE9Um7v4jAp4ep29QA7',
      collectionName: 'BR1: Ape Operatives',
      collectionImage: 'https://storage.googleapis.com/feliz-crypto/project_photos/br1.png',
      collectionFloor: 2682030000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: 'BEJFueVanwjDjm7vZSiK1xAW7MUboEcCVKo7grtJHo6m',
      collectionName: 'BR1: Droid Operatives',
      collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/br1_droid_operatives_pfp_1685046708497.png',
      collectionFloor: 422240000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: 'HM64iaXojk4LPSKwwNBBKBEyoS98PpcMJCYSoQ9WnabX',
      collectionName: 'Brohalla',
      collectionImage:
        'https://prod-image-cdn.tensor.trade/images/400x400/freeze=false/https://prod-tensor-creators-s3.s3.us-east-1.amazonaws.com/image-be423bdb-275c-4fa2-8ad4-0733919ecace',
      collectionFloor: 3357178200,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: 'Fbm1YMpAmc36xe7fegN6LkMifmXfRLQBZtgJhGicE8sw',
      collectionName: 'BVDCATs',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679312024181_bvdcaTs.jpg',
      collectionFloor: 553235550,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '1.453',
      activeOfferAmount: 1,
      bestOffer: 352139959.9305,
      bestLTV: 64.95,
      bestBorrowerLTV: 63.651,
      activeBondsAmount: 0,
      fee: 0.008947229594152499,
      bestDuration: 7,
      loansTVL: 0,
    },
    {
      marketPubkey: '5eMTHwkv5RJRpgaPnUNpvvXEeVcyGgia8G6FLskJ49qb',
      collectionName: 'Cardboard Citizens',
      collectionImage: 'https://upcdn.io/FW25avLUwiHGMAGKQrDbaNL',
      collectionFloor: 2439182400,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: '973K7L7phJa9kPnZnVYGNv6xY2nhTKerLnd6NQ2D1EvH',
      collectionName: 'Caveworld',
      collectionImage: 'https://bafkreievxcbi4onhj3goelqfi77w2jibfeanbbohunop3ncexm2jugvv54.ipfs.nftstorage.link/',
      collectionFloor: 1935450000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: 'BfA4JH4k55SXJqQ27VKn9acqyxxXfGatw87YDbCTifGU',
      collectionName: 'Cets On Creck',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679309316920_cetsOnCreck.jpg',
      collectionFloor: 4142850000,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '10.121',
      activeOfferAmount: 10,
      bestOffer: 3044182751.3999996,
      bestLTV: 74.98,
      bestBorrowerLTV: 73.48,
      activeBondsAmount: 3,
      fee: 0.07734709235699999,
      bestDuration: 7,
      loansTVL: 8377867888,
    },
    {
      marketPubkey: '2aMTNJT5EpskYXodaXzuBU35gC3mHCEppnos8v92Yo8J',
      collectionName: 'Chads',
      collectionImage: 'https://shdw-drive.genesysgo.net/DULc8DgYywybLKKosZXbT5HBYHZiUbkkwNYy7QbirUc2/chads.png',
      collectionFloor: 659235000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: 'FVSBScE2ZXQhoCrKL3QrgVnTzGCQ35s66zK1VVm78sW6',
      collectionName: 'Claynosaurz',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679309967323_claynosaurz.jpg',
      collectionFloor: 31600800000,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '226.303',
      activeOfferAmount: 27,
      bestOffer: 27537442732.8,
      bestLTV: 88.92,
      bestBorrowerLTV: 87.142,
      activeBondsAmount: 12,
      fee: 0.699675840864,
      bestDuration: 7,
      loansTVL: 340231235400,
    },
    {
      marketPubkey: '9JexYHPS3UXKRwvGgBd9tefUNnNumE9scapVNs9oJzvj',
      collectionName: 'Claynosaurz: Clay',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679312208360_claynosaurzClay.jpg',
      collectionFloor: 1000160000,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '2.400',
      activeOfferAmount: 3,
      bestOffer: 587996064.32,
      bestLTV: 59.99,
      bestBorrowerLTV: 58.79,
      activeBondsAmount: 6,
      fee: 0.0149399000016,
      bestDuration: 7,
      loansTVL: 2948604400,
    },
    {
      marketPubkey: '3a3ydkbiuuV25og9sECmiw7s4FG9pSjC31z9YrJg6Fqe',
      collectionName: 'Claynosaurz: Claymaker',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679312102487_claynosaurzClaymaker.jpg',
      collectionFloor: 1959600000,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '4.763',
      activeOfferAmount: 1,
      bestOffer: 1285521115.2,
      bestLTV: 66.94,
      bestBorrowerLTV: 65.601,
      activeBondsAmount: 2,
      fee: 0.032662730376,
      bestDuration: 7,
      loansTVL: 2529105600,
    },
    {
      marketPubkey: '5swfVgmGP3CxcQd1dsFoY7q53jyG1BcN34Th1dvR8qDR',
      collectionName: 'Claynosaurz: Croissants',
      collectionImage: 'https://arweave.net/3FrLQ8fvl6usHpYi9wFvC9BoyJgmkLGXaGsT6b8pCY8',
      collectionFloor: 20554500000,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '38.505',
      activeOfferAmount: 3,
      bestOffer: 13675361048.999998,
      bestLTV: 67.89,
      bestBorrowerLTV: 66.532,
      activeBondsAmount: 0,
      fee: 0.34746580624499995,
      bestDuration: 7,
      loansTVL: 0,
    },
    {
      marketPubkey: 'FeQ2aApjwVPd4T3jMVkb1mFb9JQMpQB51pXjtnMyBpUM',
      collectionName: 'Claynosaurz: Sardinhas',
      collectionImage: 'https://bafybeia6ljoo6x7iku2xa24ls2m72xhp3hjqqeqmroxpn73k7ulreb4vyq.ipfs.nftstorage.link/',
      collectionFloor: 419796000000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: '3SQ6rXyhyfKmt6rU8PtTtD4s1VPa2KSK5iUG9h9g2mEK',
      collectionName: 'Claynosaurz: The Call of Saga',
      collectionImage: 'https://bafkreifirgaxlprdb7xtumjeewnllapjuodgxyofwulspxwjqrb6q2rqhi.ipfs.nftstorage.link/',
      collectionFloor: 18136950000,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '69.536',
      activeOfferAmount: 11,
      bestOffer: 14480649701.699999,
      bestLTV: 81.47,
      bestBorrowerLTV: 79.841,
      activeBondsAmount: 2,
      fee: 0.3679267118085,
      bestDuration: 7,
      loansTVL: 29168367200,
    },
    {
      marketPubkey: 'BmQrctC7C7sBd5yf9EcnMSs3VxatpcK6VuUqGtyStTyP',
      collectionName: 'CrashOut',
      collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/dustcrashcoinflip_pfp_1679000560023.png',
      collectionFloor: 1313470000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: '6gcNTVd8ebA9QbQDbkNTU4xZVdH5DFQfgmZZWVMY9cgY',
      collectionName: 'Crashfaces',
      collectionImage: 'https://bafkreihqw63zx6mb36dx7rv4wf4vxwabjsazeyfsqgmgf5sslbrd24qi6e.ipfs.nftstorage.link/',
      collectionFloor: 3924180000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: 'DTk7qZHDR6HUJNVQjhmBTYAqLvF7n1e7Namrbu7uNqAi',
      collectionName: 'Critters Cult',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679312035702_crittersCult.jpg',
      collectionFloor: 2362692600,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '9.030',
      activeOfferAmount: 2,
      bestOffer: 1759270360.7303998,
      bestLTV: 75.98,
      bestBorrowerLTV: 74.46,
      activeBondsAmount: 14,
      fee: 0.044699828553252,
      bestDuration: 7,
      loansTVL: 21178917200,
    },
    {
      marketPubkey: '4Lt4o8H8BADYHuhxmPZoH1nLPj8hq3z4iPwx7Nn3yzUi',
      collectionName: 'Cyber Frogs',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679312029055_cyberFrogs.jpg',
      collectionFloor: 9405760000,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '0.004',
      activeOfferAmount: 1,
      bestOffer: 3958600,
      bestLTV: 92.17,
      bestBorrowerLTV: 0.042,
      activeBondsAmount: 0,
      fee: 0.00010058075510204082,
      bestDuration: 7,
      loansTVL: 0,
    },
    {
      marketPubkey: '3pxSpmaV5reBJcqCSsxSWfxrZALaVtUtrVnT66Kd77ai',
      collectionName: 'Cyber Samurai',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679309951936_cyberSamurai.jpg',
      collectionFloor: 1015000000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: '3nwVgQERK9sAHRDx3Ujtk15XqrhGZhkxbqFH8Fi8hhQA',
      collectionName: 'Dandies',
      collectionImage:
        'https://kuvv4harom3hiqjmfaw5cgaw5k3n23eumynhx4bvh32ohqnzm2fq.arweave.net/VSteHBFzNnRBLCgt0RgW6rbdbJRmGnvwNT7048G5Zos?ext=png',
      collectionFloor: 1219318500,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '5.238',
      activeOfferAmount: 3,
      bestOffer: 835377052.083,
      bestLTV: 69.91000000000001,
      bestBorrowerLTV: 68.512,
      activeBondsAmount: 4,
      fee: 0.021225396527414998,
      bestDuration: 7,
      loansTVL: 5159376600,
    },
    {
      marketPubkey: 'J5pMxXYmnAgdHmXiwACScDHGm8YmxZ86BNpin8FSmHTC',
      collectionName: 'DCF Microshares',
      collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/dcf_microshares_pfp_1649354979364.gif',
      collectionFloor: 3751800000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: '73bVLJwz68TvFYoVSGQyCo6BK7Aq8yuEVtYnrSz1oRTS',
      collectionName: 'DeFi Degenerates',
      collectionImage: 'https://nftstorage.link/ipfs/bafybeic3vwsex2zuph4hidrzpr72l5ir4rcciscxnsuxo4rz3mbzwthdfi/7.jpg',
      collectionFloor: 2256150000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: '9XoGKTj18BcjeRay1kz4wyoVmJ858bryxbTGsGxZJbmS',
      collectionName: 'DeGods',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679309326244_deGods.jpg',
      collectionFloor: 417872700000,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '0.020',
      activeOfferAmount: 2,
      bestOffer: 19998000,
      bestLTV: 100,
      bestBorrowerLTV: 0.005,
      activeBondsAmount: 0,
      fee: 0.0005081124489795918,
      bestDuration: 7,
      loansTVL: 0,
    },
    {
      marketPubkey: 'FjfmtCnmGt5PhTrjWvnjZJc2GR7iVLz25egzmj5VZRHa',
      collectionName: 'Degen Crash WTF',
      collectionImage: 'https://nftstorage.link/ipfs/bafybeibqru2xmb6wgw4e47oiwtq5wdlhl4hlknvzwpo35nspluwtbq6ht4/0.gif',
      collectionFloor: 0,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: null,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: '9n9z83jBXzcmv1Hy5348qpbWRsAnwXwP1sW1mWFuvfYG',
      collectionName: 'Degen Fat Cats',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679309896550_degenFatCats.jpg',
      collectionFloor: 7710600000,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '64.817',
      activeOfferAmount: 67,
      bestOffer: 6697226684.399998,
      bestLTV: 88.63,
      bestBorrowerLTV: 86.857,
      activeBondsAmount: 23,
      fee: 0.17016422902199999,
      bestDuration: 7,
      loansTVL: 156585674000,
    },
    {
      marketPubkey: 'AAhFoFvrzkdrotMUviWmv8mFn31ttUg3hYFXg9DFHQSw',
      collectionName: 'Degenerate Ape Academy',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679309318888_degenerateApeAcademy.jpg',
      collectionFloor: 30450000000,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '54.914',
      activeOfferAmount: 3,
      bestOffer: 25958685899.999996,
      bestLTV: 86.99,
      bestBorrowerLTV: 85.25,
      activeBondsAmount: 1,
      fee: 0.6595625294999999,
      bestDuration: 7,
      loansTVL: 28413108750,
    },
    {
      marketPubkey: 'HgbJJezsPUDCyTYRWEdL4QiPBetYqnH2w4iZ8AZ49rkx',
      collectionName: 'Degenerate Drop Bears',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679311875565_degenerateEgg.jpg',
      collectionFloor: 24757054000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: '9CfSkiTVoEsCdDMkNHwtoKgKAF2JhfNRR3KCrruVo3Pv',
      collectionName: 'Degenerate Trash Pandas',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679309978539_degenerateTrashPandas.jpg',
      collectionFloor: 1591520000,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '16.444',
      activeOfferAmount: 1,
      bestOffer: 1513990694.72,
      bestLTV: 97.07000000000001,
      bestBorrowerLTV: 95.129,
      activeBondsAmount: 0,
      fee: 0.038467722753600005,
      bestDuration: 7,
      loansTVL: 0,
    },
    {
      marketPubkey: '4U4k641gvz6M81EbNiq8Lb4DUWMbCQ2HFP8bA1HwwRb3',
      collectionName: 'Degens',
      collectionImage: 'https://arweave.net/pDnqZ0Py8a41C3DYcBCIQ0CW5FnCxiWO1Pjp5m901-M',
      collectionFloor: 1893255000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: '63sQA6byMpKUde9pRqvLyspnMHJppA1uaQYhctSBJKfk',
      collectionName: 'DexterLab OG',
      collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/dexterlab_og_pfp_1670416678382.png',
      collectionFloor: 5054700000,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '0.003',
      activeOfferAmount: 2,
      bestOffer: 2563000,
      bestLTV: 51.65,
      bestBorrowerLTV: 0.051,
      activeBondsAmount: 0,
      fee: 0.00006512112244897959,
      bestDuration: 7,
      loansTVL: 0,
    },
    {
      marketPubkey: '79YdkErXh7HQ6aLvyUy6vwa5qmjLzxWGSk8MzENHRHVV',
      collectionName: 'Divvy House Pass',
      collectionImage:
        'https://nftstorage.link/ipfs/bafybeifwpelhziuolvdim6q7pey5it4kzwvw2i6zoeb2obsmi4po6kvn7a/gold.png',
      collectionFloor: 1889916000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: '3Wdj9S7vVo9u9wxFHWbMEmw5nuZmxvzWT7GVxgJsJEvQ',
      collectionName: 'Doge Capital',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679309953709_dogeCapital.jpg',
      collectionFloor: 1303260000,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '4.096',
      activeOfferAmount: 1,
      bestOffer: 983184557.0400001,
      bestLTV: 76.98,
      bestBorrowerLTV: 75.44,
      activeBondsAmount: 4,
      fee: 0.0249809137452,
      bestDuration: 7,
      loansTVL: 4272682400,
    },
    {
      marketPubkey: '2hRq9bqAhQJvRhDjdTphixLHTnxNzZ7eXkdpzNm3Db8N',
      collectionName: 'Doubloons',
      collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/doubloons_pfp_1676338349906.png',
      collectionFloor: 3599700000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: '68hfpK8XtqRPwG2rnSBeLGyheuZpgkZN9XUPiNxYUzeM',
      collectionName: 'Drip The Faceless',
      collectionImage:
        'https://prod-image-cdn.tensor.trade/images/400x400/freeze=false/https%3A%2F%2Fi6z5zem6ofbyazty7mmrhz4xohr6lynyrfufwklttgjuytivjgqq.arweave.net%2FR7PckZ5xQ4BmePsZE-eXcePl4biJaFspc5mTTE0VSaE%3Fext%3Dgif',
      collectionFloor: 26111999,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '0.140',
      activeOfferAmount: 2,
      bestOffer: 19599196.433418,
      bestLTV: 76.59,
      bestBorrowerLTV: 75.058,
      activeBondsAmount: 13,
      fee: 0.00049797958284909,
      bestDuration: 7,
      loansTVL: 203674400,
    },
    {
      marketPubkey: '5xXXKJYq2sD3R6V22CGpJh3LZbUmJ1LNiQSZpohPVrC7',
      collectionName: 'Droid Capital',
      collectionImage:
        'https://prod-image-cdn.tensor.trade/images/400x400/freeze=false/https://bafybeigg33rs7ummf5mkwttlyg6qtu63glbtbj3fija3zifvh5gsanmv2i.ipfs.nftstorage.link/',
      collectionFloor: 3173819999,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: 'GkQDA5wzC6gXsvTVfwm4Db7pkpPFGsfEWSTsFLWYAQY8',
      collectionName: 'DucksVegas',
      collectionImage: 'https://bafkreicqhklhkzbdpynmyg7knpg32z6shyh3jkbhtzylcooe2ox3tl4cwm.ipfs.nftstorage.link/',
      collectionFloor: 811199999,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: 'Due9hfGdG4DRx7BbKptjeB14LxvpSZ8LJRdM4q7n2Kw5',
      collectionName: 'DUELBOTS',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679310006324_duelbots.jpg',
      collectionFloor: 10000000000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: 'AGqe3X86KydVkYLW5V5LvQN8sbxUdzGhY9uz6nNZccRE',
      collectionName: 'Duelwhales',
      collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/duelwhales_pfp_1679796083785.png',
      collectionFloor: 1262330851,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: '7YGMFruLordmucyiPQjgpnr9R1F652KSNKqgfcBWXzZK',
      collectionName: 'Dust City',
      collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/dustcity_pfp_1679791463277.png',
      collectionFloor: 0,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: null,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: '3kjMLDST5xqsCK2RmQPr7WKYbcmsd9adPiSpuVLS23Rb',
      collectionName: 'Dworfz',
      collectionImage:
        'https://nftstorage.link/ipfs/bafybeihbbhiztt7pomu6szwqr56uaffksjq476p2djq6vactydcbqabcg4/5121.png',
      collectionFloor: 393943500,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '0.000',
      activeOfferAmount: 3,
      bestOffer: 22000,
      bestLTV: 100,
      bestBorrowerLTV: 0.006,
      activeBondsAmount: 0,
      fee: 5.589795918367348e-7,
      bestDuration: 7,
      loansTVL: 0,
    },
    {
      marketPubkey: 'DjTiDCi76vJ41ujJfuKc1RRxfeS7coca7bQ3EqLAztjg',
      collectionName: 'Ember Shards',
      collectionImage:
        'https://prod-image-cdn.tensor.trade/images/slug=05c52d84-2e49-4ed9-a473-b43cab41e130/400x400/freeze=true/https://prod-tensor-creators-s3.s3.us-east-1.amazonaws.com/drop-metadata/0f580c3a-cbcd-4243-841c-984d96ebd3b5/images/ember.gif',
      collectionFloor: 0,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '0.010',
      activeOfferAmount: 3,
      bestOffer: 0,
      bestLTV: 100,
      bestBorrowerLTV: null,
      activeBondsAmount: 2,
      fee: 0.0002642448979591837,
      bestDuration: 7,
      loansTVL: 3558419200,
    },
    {
      marketPubkey: '6eGGQwPfZPtcEsCtbwhWR63WCigcJqeovABjVg1M25KZ',
      collectionName: 'Enigma Ventures',
      collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/enigmaventures_pfp_1647983957961.png',
      collectionFloor: 0,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: null,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: 'Brpimy2ChYoKorNcX9DJLsyZGoxB7zdy1PtxJkdawbqd',
      collectionName: 'Entreprenerdz',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679312166155_entreprenerdz.jpg',
      collectionFloor: 1170000001,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '27.955',
      activeOfferAmount: 9,
      bestOffer: 656543160.5611479,
      bestLTV: 57.26,
      bestBorrowerLTV: 56.115,
      activeBondsAmount: 38,
      fee: 0.016681555814257735,
      bestDuration: 7,
      loansTVL: 14189165200,
    },
    {
      marketPubkey: 'ASyyisEcW4CLZsDXnw2FuHYWt1MmvpWju6iCCp8GVryG',
      collectionName: 'Fake Alpha',
      collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/fakealpha_pfp_1678197229637.jpeg',
      collectionFloor: 292320000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: '9R2LeLV13xPheCDhDmRHsjDVf1EgonVEZrKg4wsdNrnD',
      collectionName: 'Famous Fox Federation',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679309349677_famousFoxFederation.jpg',
      collectionFloor: 36020000000,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '35.000',
      activeOfferAmount: 1,
      bestOffer: 27526628080,
      bestLTV: 77.98,
      bestBorrowerLTV: 76.42,
      activeBondsAmount: 0,
      fee: 0.6994010603999999,
      bestDuration: 7,
      loansTVL: 0,
    },
    {
      marketPubkey: '558Lz1JB6QR72hRQTDPZm6dpz6oHvMNjhaTPES9CxJ87',
      collectionName: 'FatCats Capital',
      collectionImage: 'https://bafkreiaartlxirpnqhxgrpcm3hxb4ew4qybzerljuuhhderp4o6rsmhuya.ipfs.nftstorage.link/',
      collectionFloor: 441119000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: 'Fi8j7pFQCmviaqxH1xMUhZux77MsADvxuaGRWBdD7CjP',
      collectionName: 'Fearless Bulls',
      collectionImage: 'https://arweave.net/j8OMCbxMavgD6bdALM8XSbmQeBOgu2eOhLL4LYRLUfo',
      collectionFloor: 959944500,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '5.100',
      activeOfferAmount: 1,
      bestOffer: 509790046.0590001,
      bestLTV: 54.190000000000005,
      bestBorrowerLTV: 53.106,
      activeBondsAmount: 0,
      fee: 0.012952828721295002,
      bestDuration: 7,
      loansTVL: 0,
    },
    {
      marketPubkey: 'DfctdqNJ3NhNdXz7tgpZKDQxqp2cbMwpLXrsSpsaxPuM',
      collectionName: 'Fidelion',
      collectionImage: 'https://bafkreifyltop4h2htwiojt3vhm3ir3jjmqddjvjhn2fhm5t6itvaccqrfy.ipfs.nftstorage.link/',
      collectionFloor: 12939739350,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '24.006',
      activeOfferAmount: 3,
      bestOffer: 9508172233.3374,
      bestLTV: 74.98,
      bestBorrowerLTV: 73.48,
      activeBondsAmount: 1,
      fee: 0.24158519245928703,
      bestDuration: 7,
      loansTVL: 13194181000,
    },
    {
      marketPubkey: 'vUsXrcMC6Xw8PAU2xQKvQ4SVBv5yj4cKhr5UTxvdexc',
      collectionName: 'FRAKT',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679311909782_frakt.jpg',
      collectionFloor: 8406060000,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '0.000',
      activeOfferAmount: 2,
      bestOffer: 0,
      bestLTV: 10,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: 'Cvu8XrBHHERGikeYCP82BeC4LNmZsxJNkJkhAnJ4z95o',
      collectionName: 'Frankie 500',
      collectionImage:
        'https://bafybeierrblkx6fusnyfpqavc37v23dipqg42pgz3j55txssyivtw3i6xi.ipfs.nftstorage.link/16.gif',
      collectionFloor: 2419800000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: 'A9r7kYy4gCoXqyQTVvXSkATJQ3tvu2n64uc7Hdwq5qye',
      collectionName: 'Future Traders',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679312125934_futureTraders.jpg',
      collectionFloor: 505345000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: 'CZckitH7SmiRvbR1LtMgCH8xjojhPFhKEE3MjNNsM5dt',
      collectionName: 'Galactic Geckos',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679309903856_galacticGeckos.jpg',
      collectionFloor: 35905000000,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '96.560',
      activeOfferAmount: 5,
      bestOffer: 24989736380.000004,
      bestLTV: 71.02000000000001,
      bestBorrowerLTV: 69.6,
      activeBondsAmount: 2,
      fee: 0.6349433019,
      bestDuration: 7,
      loansTVL: 51519531000,
    },
    {
      marketPubkey: 'GivS4NvgykcPEtXVkv92M1HjWgKSqQcVg7Bd85aCMTjo',
      collectionName: 'Ghost Kid DAO',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679309941722_ghostKidDao.jpg',
      collectionFloor: 5982105000,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '0.002',
      activeOfferAmount: 2,
      bestOffer: 1692599.9999999998,
      bestLTV: 63.94,
      bestBorrowerLTV: 0.028,
      activeBondsAmount: 0,
      fee: 0.00004300585714285714,
      bestDuration: 7,
      loansTVL: 0,
    },
    {
      marketPubkey: '7k8bwoRHo7QKFbdcM8RwfFbb9H4TtsakVatCfGnkGiw9',
      collectionName: 'GigaDAO Loot Box',
      collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/gigadao_pfp_1658388776098.png',
      collectionFloor: 11154000000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: 'FZTrV1p1dkBoCAa2yTDFrecyQZ547UZ6NAQg55j3dGnf',
      collectionName: 'Gods',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679310009712_gods.jpg',
      collectionFloor: 7448000000,
      apy: 52.14,
      duration: [14, 7],
      offerTVL: '194.358',
      activeOfferAmount: 2,
      bestOffer: 5996891264.000001,
      bestLTV: 82.16,
      bestBorrowerLTV: 80.517,
      activeBondsAmount: 9,
      fee: 0.15236999232000004,
      bestDuration: 14,
      loansTVL: 58184422800,
    },
    {
      marketPubkey: 'BsrCj5qpERz8Fyx8QbedFhNWVcu8HA19EYhMHca1ESDY',
      collectionName: 'Helions',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679309987039_helions.jpg',
      collectionFloor: 1439160000,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '4.079',
      activeOfferAmount: 10,
      bestOffer: 1099811828.64,
      bestLTV: 77.98,
      bestBorrowerLTV: 76.42,
      activeBondsAmount: 2,
      fee: 0.027944198503200002,
      bestDuration: 7,
      loansTVL: 2483325108,
    },
    {
      marketPubkey: '21VQYsde7jSdQ15yUsyw1SgrjDPXSuunjuW1M81iM9NL',
      collectionName: 'Honey Genesis Bee',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679311853814_honeyGenesisBee.jpg',
      collectionFloor: 905075500,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '0.010',
      activeOfferAmount: 5,
      bestOffer: 10066399,
      bestLTV: 92.41,
      bestBorrowerLTV: 1.112,
      activeBondsAmount: 0,
      fee: 0.00025576870928571433,
      bestDuration: 7,
      loansTVL: 0,
    },
    {
      marketPubkey: 'FqMGquAB5rUR4Maq7QYbQhkkPNbeTMHtzYxy7bdonjB2',
      collectionName: 'Honeyland Genesis Bees',
      collectionImage:
        'https://creator-hub-prod.s3.us-east-2.amazonaws.com/honeyland_genesis_bees_pfp_1669056750194.png',
      collectionFloor: 6078930000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: '7RzMjqemZCawufv2ye1P73FajGdJT3whZN1bq9CqsE61',
      collectionName: 'Honeyland Land',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679312061218_honeylandLand.jpg',
      collectionFloor: 9389639999,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: 'Az3suWfvSp9YxGyofrHxnn6rrk37BAhbb4qj6oneUwRh',
      collectionName: 'Immortals',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679312119354_immortals.jpg',
      collectionFloor: 1004958000,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '0.000',
      activeOfferAmount: 1,
      bestOffer: 2400,
      bestLTV: 100,
      bestBorrowerLTV: 0,
      activeBondsAmount: 1,
      fee: 6.097959183673469e-8,
      bestDuration: 7,
      loansTVL: 0,
    },
    {
      marketPubkey: '561pky9HywytYsY4AZ5WwgUscULSpACLDQF7pC7mgqXf',
      collectionName: 'Infected Mob',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679312000015_infectedMob.jpg',
      collectionFloor: 1895201000,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '0.050',
      activeOfferAmount: 1,
      bestOffer: 49997000,
      bestLTV: 10,
      bestBorrowerLTV: 2.638,
      activeBondsAmount: 0,
      fee: 0.00127033193877551,
      bestDuration: 7,
      loansTVL: 0,
    },
    {
      marketPubkey: '5waNdSzxaUw7HNa6urWg3NQU5zXCQJ5uGz3Bu5b9QDUf',
      collectionName: 'Jelly Rascals',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679311819423_jellyRascals.jpg',
      collectionFloor: 24088960000,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '23.645',
      activeOfferAmount: 5,
      bestOffer: 19348445383.679996,
      bestLTV: 81.96,
      bestBorrowerLTV: 80.321,
      activeBondsAmount: 1,
      fee: 0.49160845923839996,
      bestDuration: 7,
      loansTVL: 27828619000,
    },
    {
      marketPubkey: 'Dq61JHchaRitb4YVhnUnEc4h4DJmTenpQooCP6KwF5yq',
      collectionName: 'Jikan Studios',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679311900889_jikanStudios.jpg',
      collectionFloor: 381270000,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '0.000',
      activeOfferAmount: 1,
      bestOffer: 6000,
      bestLTV: 91.99000000000001,
      bestBorrowerLTV: 0.002,
      activeBondsAmount: 7,
      fee: 1.5244897959183674e-7,
      bestDuration: 7,
      loansTVL: 26553060800,
    },
    {
      marketPubkey: 'CEKGS2Ez83EP2E5QRYj6457euRAZwVxozRGkZvZNPUHR',
      collectionName: 'Knittables',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679312111691_knittables.jpg',
      collectionFloor: 786822000,
      apy: 104.28999999999999,
      duration: [14, 7],
      offerTVL: '13.231',
      activeOfferAmount: 2,
      bestOffer: 578159952.888,
      bestLTV: 74.98,
      bestBorrowerLTV: 73.48,
      activeBondsAmount: 1,
      fee: 0.01468998247644,
      bestDuration: 7,
      loansTVL: 578307800,
    },
    {
      marketPubkey: '7wW6Qj5eVZXVqU2uQWN75JkTHwn7EA7knyjijva3c7Yw',
      collectionName: 'Lazy Alpha',
      collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/lazy_alpha_pfp_1652953834699.gif',
      collectionFloor: 11266500000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: 'HqSce5pZut2vnn8PnLXQNr4czp7AvqzQRnziKHth4467',
      collectionName: 'Liberty Square: The Hallowed',
      collectionImage:
        'https://bafybeicg2dislxyztyix6efaatdke3ll76goy3qiqtdnj5bszxhmpu3rki.ipfs.nftstorage.link/TheHallowed_ME_Profile.png',
      collectionFloor: 469532700,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: 'C9ByGV3f3qgmoz4mjJWo9DmCPke14f7c2eDeKkvgraRf',
      collectionName: 'Liberty Square: The Sinister Squirrel Syndicate',
      collectionImage:
        'https://api.frakt.xyz/image/400x400/1679312188138_libertySquareTheSinisterSquirrelSyndicate.jpg',
      collectionFloor: 2759754000,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '8.633',
      activeOfferAmount: 2,
      bestOffer: 1892650332.2159998,
      bestLTV: 69.98,
      bestBorrowerLTV: 68.58,
      activeBondsAmount: 15,
      fee: 0.04808876864507999,
      bestDuration: 7,
      loansTVL: 89021856600,
    },
    {
      marketPubkey: 'FZiADwowP6E5zhufcYPPbaG5cRC8dCW99ZGVfBUmMZAy',
      collectionName: 'Lifinity Flares',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679309341175_lifinityFlares.jpg',
      collectionFloor: 6546750000,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '7.000',
      activeOfferAmount: 2,
      bestOffer: 5773591918.5,
      bestLTV: 89.99000000000001,
      bestBorrowerLTV: 88.19,
      activeBondsAmount: 0,
      fee: 0.1466963660925,
      bestDuration: 7,
      loansTVL: 0,
    },
    {
      marketPubkey: 'dDmZW4dmRfFAY5sULXkc8SdyCKJqijDQfp2woiXcrTV',
      collectionName: "Liko's Banana",
      collectionImage:
        'https://k7q2qemwuv5n2vrp6qhkuscl2dqumz7ltrq4pog56qahdbwfpqwq.arweave.net/V-GoEZalet1WL_QOqkhL0OFGZ-ucYce43fQAcYbFfC0?ext=png',
      collectionFloor: 4107705000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: '3MQwPHXshhZhyfavxynoATZVs5dR9mVVBvYu9wW3SVBa',
      collectionName: 'LILY',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679309973226_lily.jpg',
      collectionFloor: 2210929350,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '14.954',
      activeOfferAmount: 8,
      bestOffer: 1699134580.3445997,
      bestLTV: 78.42,
      bestBorrowerLTV: 76.852,
      activeBondsAmount: 0,
      fee: 0.043171888827122994,
      bestDuration: 7,
      loansTVL: 0,
    },
    {
      marketPubkey: '3gPyxMsneAbRkEQ1vvYtbX5MqPZpAzdyGA8R3CMgfUac',
      collectionName: 'Looties',
      collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/looties_pfp_1653388120539.png',
      collectionFloor: 28868580000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: 'Gg1VoesWTNwkTgGEevsK2eEdmfVNz5Tx8Vq2iNYU35tS',
      collectionName: 'Lotus Gang',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679309976572_lotusGang.jpg',
      collectionFloor: 1907185000,
      apy: 52.14,
      duration: [14],
      offerTVL: '76.389',
      activeOfferAmount: 1,
      bestOffer: 1682137170,
      bestLTV: 90,
      bestBorrowerLTV: 88.2,
      activeBondsAmount: 0,
      fee: 0.04274001585,
      bestDuration: 14,
      loansTVL: 0,
    },
    {
      marketPubkey: 'e5n1SxyxhJuWEXNSBxz3jFWjkZmfy7WRQiGsKHnoMFJ',
      collectionName: 'Mad Lads',
      collectionImage: 'https://madlads-collection.s3.us-west-2.amazonaws.com/_collection.png',
      collectionFloor: 67687382400,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '513.442',
      activeOfferAmount: 35,
      bestOffer: 58871100842.4,
      bestLTV: 88.75,
      bestBorrowerLTV: 86.975,
      activeBondsAmount: 7,
      fee: 1.495806541812,
      bestDuration: 7,
      loansTVL: 411794647600,
    },
    {
      marketPubkey: 'AjC1t8rbhNj8z2BCb2qqWrVmkS4rhZgfQC2kifG5zR3j',
      collectionName: 'Magic Ticket',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679311802180_magicTicket.jpg',
      collectionFloor: 1217898500,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: '7GPcPpDWU6GP7JmYA2UYD2h9YfcWMyuyNthbiGrrfAEf',
      collectionName: 'MARA',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679312117575_mara.jpg',
      collectionFloor: 113955000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: 'CPBrAp73rb8xaVfoZXDggHj6fM7QZYwxbpPDWwufgY6v',
      collectionName: 'Matrica Labs: Pixels',
      collectionImage:
        'https://xlanocctkcrws5ujfbyirg7r2yln7b3nxnsxalukcs2qmqf5wamq.arweave.net/usDXCFNQo2l2iShwiJvx1hbfh227ZXAuihS1BkC9sBk?ext=png',
      collectionFloor: 4809706199,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '0.000',
      activeOfferAmount: 1,
      bestOffer: 9400,
      bestLTV: 100,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 2.3883673469387753e-7,
      bestDuration: 7,
      loansTVL: 0,
    },
    {
      marketPubkey: 'H3bfdphjhgcVTXYSJx7tFwW6DuhXVJvPqRK4xTZQMEWi',
      collectionName: 'Meegos',
      collectionImage:
        'https://img-cdn.magiceden.dev/rs:fill:400:400:0:0/plain/https://creator-hub-prod.s3.us-east-2.amazonaws.com/meegos_pfp_1692443263785.png',
      collectionFloor: 3049250400,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '4.059',
      activeOfferAmount: 10,
      bestOffer: 2091188121.3216,
      bestLTV: 69.98,
      bestBorrowerLTV: 68.58,
      activeBondsAmount: 3,
      fee: 0.053133249205008,
      bestDuration: 7,
      loansTVL: 14993862800,
    },
    {
      marketPubkey: 'CmLzmZDecZQRyHDBHKKrn8jiJ1sB9z1nn6mB9k7R9PSC',
      collectionName: 'Monkey Baby Business',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679311789183_monkeyBabyBusiness.jpg',
      collectionFloor: 20370000000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: 'ACXhD3TjrSiZz5ua6ZZDHiVhF8jvEKbKSdtUFZsrsuQJ',
      collectionName: 'Monkey Gods',
      collectionImage: 'https://nftstorage.link/ipfs/bafybeieth5qpqmz5wt3fbbstccl7kls6wclestscsjkpzt6fm6uqrkuxaa/2.png',
      collectionFloor: 3985019999,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '0.276',
      activeOfferAmount: 15,
      bestOffer: 275560400,
      bestLTV: 87.82,
      bestBorrowerLTV: 6.915,
      activeBondsAmount: 143,
      fee: 0.00700148363265306,
      bestDuration: 7,
      loansTVL: 432784424800,
    },
    {
      marketPubkey: '2vdGDtnnR9UKUowmr7tHzW71PLCt2ogtLNWRnymNZ7TS',
      collectionName: 'Nekkro',
      collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/nekkro_pfp_1686997107265.png',
      collectionFloor: 3606960000,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '32.807',
      activeOfferAmount: 19,
      bestOffer: 2721105051.84,
      bestLTV: 76.98,
      bestBorrowerLTV: 75.44,
      activeBondsAmount: 0,
      fee: 0.0691382814192,
      bestDuration: 7,
      loansTVL: 0,
    },
    {
      marketPubkey: 'MxQ43YXCSjp3hdPwzGo1RqznLi1QELYX5s3ihDgiLvS',
      collectionName: 'Nekozuma',
      collectionImage: 'https://arweave.net/2uyILOKasKWt7yKB4sASXUMrvuFj0biwoa0N3oGGRqM',
      collectionFloor: 1984700000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: '5oXLuwEdF5EHks8ToLJwTA2Bdwgm9vfXj2tSXJ8699yT',
      collectionName: 'Netrunner',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679310001331_netrunner.jpg',
      collectionFloor: 516635000,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '0.000',
      activeOfferAmount: 2,
      bestOffer: 8600,
      bestLTV: 88.84,
      bestBorrowerLTV: 0.002,
      activeBondsAmount: 0,
      fee: 2.1851020408163266e-7,
      bestDuration: 7,
      loansTVL: 0,
    },
    {
      marketPubkey: '2pPV6EKTYJd1J7nzvBDjJCSjQ1GtUaKNZWErz9wUVbZK',
      collectionName: 'Nuked Apes',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679311833977_nukedApes.jpg',
      collectionFloor: 2872800000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: 'CBhC9cuKnEYAd2bYNeFsNccAQL5zr6b2uAzLKJLbkv8u',
      collectionName: 'Oak Paradise',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679312026295_oakParadise.jpg',
      collectionFloor: 1866585000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: 'DUu5eLvztb1M2VyVjT67ruFgBDgo2Muidp7mkLk8KTR4',
      collectionName: 'Obsidian Shards',
      collectionImage:
        'https://prod-image-cdn.tensor.trade/images/slug=05c52d84-2e49-4ed9-a473-b43cab41e130/400x400/freeze=true/https://prod-tensor-creators-s3.s3.us-east-1.amazonaws.com/drop-metadata/ce630426-de91-4b0c-98bf-881bbc854c0d/images/obsidian.gif',
      collectionFloor: 0,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '0.000',
      activeOfferAmount: 1,
      bestOffer: 0,
      bestLTV: 100,
      bestBorrowerLTV: null,
      activeBondsAmount: 0,
      fee: 0.000004807224489795919,
      bestDuration: 7,
      loansTVL: 0,
    },
    {
      marketPubkey: 'GYx6H2qUDw2qS5Yxbjr3S5Ldegs2Nf8UDwJB45RwLyjv',
      collectionName: 'Okay Bears',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679309335964_okayBears.jpg',
      collectionFloor: 23621700000,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '110.506',
      activeOfferAmount: 21,
      bestOffer: 19674561173.4,
      bestLTV: 84.99,
      bestBorrowerLTV: 83.29,
      activeBondsAmount: 2,
      fee: 0.49989446246700003,
      bestDuration: 7,
      loansTVL: 32984379400,
    },
    {
      marketPubkey: 'bJu2b22ppRQSjBtGzhak1nrgnKSNgLZxe4z7eAYP66Z',
      collectionName: 'oogy',
      collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/oogy_pfp_1680223880799.png',
      collectionFloor: 4224000000,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '0.002',
      activeOfferAmount: 14,
      bestOffer: 1515000,
      bestLTV: 78.48,
      bestBorrowerLTV: 0.036,
      activeBondsAmount: 0,
      fee: 0.000038493367346938776,
      bestDuration: 7,
      loansTVL: 0,
    },
    {
      marketPubkey: '22kMkmeSB3c2KQoNkg6CavmMkbno6pRYsG6kiVYyEzUc',
      collectionName: 'oogy pods',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679312212100_oogy.jpg',
      collectionFloor: 6325440000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: 'DxAdLTb3bAMdrgLc6HLSs8pCDTDB3oRFWDh4bv7ZgBPt',
      collectionName: 'ooze',
      collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/ooze_pfp_1679341922341.png',
      collectionFloor: 141960000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: '3QEF7j5v6L2EVTi2ASvoCy5dSGaDB7uM3JT71Bnc9JhQ',
      collectionName: 'Orbital',
      collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/orbital_pfp_1677850265308.gif',
      collectionFloor: 1653960000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: 'DLyHadRdyj7FmDaMrc8zKvz8vUFuTZTFyseUiiKyedjU',
      collectionName: 'Ovols',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679309991805_ovols.jpg',
      collectionFloor: 2257595200,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: '2dAQ6HDwEYdVAS31pbgJbpktfGbCGmyTYgXtr6FawKGw',
      collectionName: 'Parlay',
      collectionImage: 'https://storage.googleapis.com/feliz-crypto/project_photos/parlay.png',
      collectionFloor: 11672500000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: 'AUnj4vmhekw3T7gzKmQgwga48wqQzRogRLDvtdgwWoSq',
      collectionName: 'Pawnshop Gnomies',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679309924442_pawnshopGnomies.jpg',
      collectionFloor: 11966850000,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '88.604',
      activeOfferAmount: 6,
      bestOffer: 11488271734.8,
      bestLTV: 97.96000000000001,
      bestBorrowerLTV: 96.001,
      activeBondsAmount: 0,
      fee: 0.29189588387399995,
      bestDuration: 7,
      loansTVL: 0,
    },
    {
      marketPubkey: '3hvtytMrWmDM56U39TyuTWBtkgDJZsnAu7b9QBzGGTtC',
      collectionName: 'Pen Frens',
      collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/penfrens_pfp_1646407666353.gif',
      collectionFloor: 3218600000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: 'DnMWHXg79z16ofSwWib3WmjTB3Tdi3sLxWCiAXmpnij1',
      collectionName: 'Pesky Penguins',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679309339507_peskyPenguins.jpg',
      collectionFloor: 2019120000,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '0.003',
      activeOfferAmount: 11,
      bestOffer: 2748200,
      bestLTV: 83.35000000000001,
      bestBorrowerLTV: 0.136,
      activeBondsAmount: 1,
      fee: 0.00006982671428571428,
      bestDuration: 7,
      loansTVL: 1460606853,
    },
    {
      marketPubkey: 'AdCmPA7DtdWSpTme72WvMuUnZ65iqFircN2U1tPRqgzs',
      collectionName: 'Photo Finish PFP Collection',
      collectionImage: 'https://assets.thirdtimegames.com/pfl-pfp/7714.png',
      collectionFloor: 23430000000,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '23.000',
      activeOfferAmount: 1,
      bestOffer: 17216457720,
      bestLTV: 74.98,
      bestBorrowerLTV: 73.48,
      activeBondsAmount: 0,
      fee: 0.43743856859999997,
      bestDuration: 7,
      loansTVL: 0,
    },
    {
      marketPubkey: '2EK6FU2q346j8xT4StdkjJ2GRLvbu2YqEkHfhukMbwMo',
      collectionName: 'Taiyo Pilots',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679309993826_pilots.jpg',
      collectionFloor: 6527000000,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '42.525',
      activeOfferAmount: 4,
      bestOffer: 5115249062,
      bestLTV: 79.97,
      bestBorrowerLTV: 78.371,
      activeBondsAmount: 0,
      fee: 0.12996908331,
      bestDuration: 7,
      loansTVL: 0,
    },
    {
      marketPubkey: '3kEzhy64qo1xNavt3aCdXy6z31vvGZHD73d2nxWJG76o',
      collectionName: 'Pixel Panda Crew',
      collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/pixelpandacreew_pfp_1646684986619.png',
      collectionFloor: 76125000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: 'RfFYW38xVCzLpvFDNSETMFvjxQbGsgYNumxEQu4deUk',
      collectionName: 'Pixel Puffs',
      collectionImage: 'https://arweave.net/sB6zYPoThxGXR87mNyF5CI-z_ZK7LR6GaEpwdlH54_w',
      collectionFloor: 4816500000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: '5r2vmM3HqPiKuqSTSJ1KmQspYTsvRs25t3cpQhaT7MRD',
      collectionName: 'POP!',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679312139716_pop.jpg',
      collectionFloor: 399821892,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: 'B8nqsuhQdgje8f7KF9ZGD9TCmjiwPcbP2NcWbVP2i8qU',
      collectionName: 'Portals',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679309337739_portals.jpg',
      collectionFloor: 11169720000,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '35.611',
      activeOfferAmount: 1,
      bestOffer: 4377435607.44,
      bestLTV: 39.989999999999995,
      bestBorrowerLTV: 39.19,
      activeBondsAmount: 0,
      fee: 0.11122259859719999,
      bestDuration: 7,
      loansTVL: 0,
    },
    {
      marketPubkey: '5zUzn48ojNDRfpSBXVsF6BRMTUiqn9kXiQVhEb4VUsQt',
      collectionName: 'Primates',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679309917929_primates.jpg',
      collectionFloor: 4121550000,
      apy: 52.14,
      duration: [14],
      offerTVL: '26.648',
      activeOfferAmount: 1,
      bestOffer: 2998641945.6,
      bestLTV: 74.24,
      bestBorrowerLTV: 72.755,
      activeBondsAmount: 5,
      fee: 0.07618998412799999,
      bestDuration: 14,
      loansTVL: 18021788400,
    },
    {
      marketPubkey: '6ZNJkUfqHFUbpZAVE1M3jF5zLuQFdw48vVF7M6mhv6cE',
      collectionName: 'Raccs',
      collectionImage: 'https://nftstorage.link/ipfs/bafkreiedtknmjb5ocik5yy2v7bgwz7tr7qqxzknpssb7uoh4pobi4fxqwa',
      collectionFloor: 1002250000,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '2.085',
      activeOfferAmount: 2,
      bestOffer: 637942147.5,
      bestLTV: 64.95,
      bestBorrowerLTV: 63.651,
      activeBondsAmount: 0,
      fee: 0.016208938237499998,
      bestDuration: 7,
      loansTVL: 0,
    },
    {
      marketPubkey: 'BwFCLgbkqBZFKciVyPjRgs7B8BHDLk8PiqUQh3PUo2xL',
      collectionName: 'Reavers',
      collectionImage: 'https://storage.googleapis.com/reavers-56900.appspot.com/reaversNftsProd/983.png',
      collectionFloor: 10222935000,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '230.505',
      activeOfferAmount: 4,
      bestOffer: 7812407818.740001,
      bestLTV: 77.98,
      bestBorrowerLTV: 76.42,
      activeBondsAmount: 1,
      fee: 0.1984989333537,
      bestDuration: 7,
      loansTVL: 5843044200,
    },
    {
      marketPubkey: '8QiaBvvGN8snzNvGxgkjiDUf3fwxXsXhjoRrGdohy8qj',
      collectionName: 'Scalp Empire Nestor Edition',
      collectionImage:
        'https://creator-hub-prod.s3.us-east-2.amazonaws.com/scalp_empire_nestor_edition_pfp_1646464613353.png',
      collectionFloor: 2750650000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: 'DAj1CV4gYSsdQCybufMu1DG4K9eWXUxy1F5yqBjXHido',
      collectionName: 'Secret Skellies Society',
      collectionImage:
        'https://beta.api.solanalysis.com/images/400x400/filters:frames(,0)/https://v5.airtableusercontent.com/v1/13/13/1671472800000/SltGnzxN68oU0zS-FVO7AA/TmdLd9tCeUFXufiE2hw37jzMEENcDq0eMJ3EOQG9sRRF0osX7giaoYqfA4LJhdpF5pvuzrroqB-n3Ti6daHVNA/-PRbkl4IeX2vvAsTU5aNjgXbnpQLTrO2J6rDbSuNE4Y',
      collectionFloor: 392703500,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '0.000',
      activeOfferAmount: 1,
      bestOffer: 2740,
      bestLTV: 90,
      bestBorrowerLTV: 0.001,
      activeBondsAmount: 7,
      fee: 6.961836734693878e-8,
      bestDuration: 7,
      loansTVL: 7483866640,
    },
    {
      marketPubkey: 'xmqnLBZFDfUc6KVkW5oXrdJBPki1jkARaQYtcw73fKP',
      collectionName: 'Sentries',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679312181685_sentries.jpg',
      collectionFloor: 609000000,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '3.566',
      activeOfferAmount: 3,
      bestOffer: 447435954.00000006,
      bestLTV: 74.97,
      bestBorrowerLTV: 73.471,
      activeBondsAmount: 8,
      fee: 0.01136852577,
      bestDuration: 7,
      loansTVL: 3743756800,
    },
    {
      marketPubkey: '25FS1smq1unhmDExgTAvF3nq34AWyvMyTaJfSfdQGFbt',
      collectionName: 'sharx by sharky.fi',
      collectionImage: 'https://storage.googleapis.com/feliz-crypto/project_photos/sharx.png',
      collectionFloor: 8308678350,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '7.772',
      activeOfferAmount: 3,
      bestOffer: 2279087088.7616997,
      bestLTV: 27.99,
      bestBorrowerLTV: 27.43,
      activeBondsAmount: 0,
      fee: 0.0579074168471085,
      bestDuration: 7,
      loansTVL: 0,
    },
    {
      marketPubkey: 'F4JkYNvq7SPwBUD5jPo27BCQ6LuKv1J9JQKCdygc7cZK',
      collectionName: 'Silicon Shards',
      collectionImage:
        'https://prod-image-cdn.tensor.trade/images/slug=05c52d84-2e49-4ed9-a473-b43cab41e130/400x400/freeze=true/https://prod-tensor-creators-s3.s3.us-east-1.amazonaws.com/drop-metadata/74c71c16-8cbb-4440-805e-a040f34a4c84/images/silicon.gif',
      collectionFloor: 0,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '0.003',
      activeOfferAmount: 13,
      bestOffer: 0,
      bestLTV: 100,
      bestBorrowerLTV: null,
      activeBondsAmount: 2,
      fee: 0.00008295257142857144,
      bestDuration: 7,
      loansTVL: 2435155285,
    },
    {
      marketPubkey: '6qjRo69y8NLKiMFL7ebQB8ikGEsaavUeVPN9E5bVdZGo',
      collectionName: 'Smart Sea Society',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679312007608_smartSeaSociety.jpg',
      collectionFloor: 77210000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: '4oEA4jBmBbZmrzAxnConZP93LQuwh9bV5T1y7NLFwtMk',
      collectionName: 'SMB Barrels',
      collectionImage: 'https://nftstorage.link/ipfs/bafkreihka22rqdxvqy7fj4cgeslfdunt44fexwx6tij6hqdryet2v45qvu',
      collectionFloor: 9157924350,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '16.634',
      activeOfferAmount: 2,
      bestOffer: 6908774761.3374,
      bestLTV: 76.98,
      bestBorrowerLTV: 75.44,
      activeBondsAmount: 2,
      fee: 0.175539277099287,
      bestDuration: 7,
      loansTVL: 14278737200,
    },
    {
      marketPubkey: '3cRUTCjAWmaywnjM3uxghmrLSq9rZemDDfFJzsJJAcRU',
      collectionName: 'SMB Gen2',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679309324097_solanaMonkeyBusiness.jpg',
      collectionFloor: 84056000000,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '534.494',
      activeOfferAmount: 28,
      bestOffer: 70010410512.00002,
      bestLTV: 84.99,
      bestBorrowerLTV: 83.29,
      activeBondsAmount: 12,
      fee: 1.7788359405600003,
      bestDuration: 7,
      loansTVL: 842663809400,
    },
    {
      marketPubkey: 'HUkt7ioGJ7kaM5NjLEn6mRkEr3iKHcu6yfCrYsJ5vouy',
      collectionName: 'SMB Gen3',
      collectionImage: 'https://bafkreibtf35tniaqma43kvn5upi2e4qlroid56jxfm3nqtwjldrzaxrgtu.ipfs.nftstorage.link/',
      collectionFloor: 6176989350,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '65.268',
      activeOfferAmount: 117,
      bestOffer: 4897846041.423299,
      bestLTV: 80.91000000000001,
      bestBorrowerLTV: 79.292,
      activeBondsAmount: 15,
      fee: 0.12444527186881649,
      bestDuration: 7,
      loansTVL: 70385263900,
    },
    {
      marketPubkey: '43ECyksooqLyt4GmMrjQcuW25ReXC9wmHpC5wdx2rcRa',
      collectionName: 'Smyths',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679309333698_smyths.jpg',
      collectionFloor: 0,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '0.015',
      activeOfferAmount: 3,
      bestOffer: 0,
      bestLTV: 100,
      bestBorrowerLTV: null,
      activeBondsAmount: 0,
      fee: 0.00037200091836734695,
      bestDuration: 7,
      loansTVL: 0,
    },
    {
      marketPubkey: '2zH2MUtuwpXLNQKa2iPDjhD6MPuWwqqKef3jDVf2aLor',
      collectionName: 'Soblins',
      collectionImage:
        'https://zvo5wkj2qmqgppsrrudca2ipidczxao5amehm43xvmcdx5as67sa.arweave.net/zV3bKTqDIGe-UY0GIGkPQMWbgd0DCHZzd6sEO_QS9-Q',
      collectionFloor: 162600000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: '51xY23SNsWLyS9deV6KBT66Q2V8LG6wKD2mFvdmuhyro',
      collectionName: 'SolRarity - Rarikeys',
      collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/rarikeys_pfp_1648514569411.png',
      collectionFloor: 3378989100,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: '7igcCypi5vAN6wXrBjmBmCmUWybSGqDwAemnk8qho14b',
      collectionName: 'BonkeDAO',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679312145338_solanaBonkBusiness.jpg',
      collectionFloor: 172448500,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '0.030',
      activeOfferAmount: 9,
      bestOffer: 30216199,
      bestLTV: 98.58,
      bestBorrowerLTV: 17.522,
      activeBondsAmount: 1,
      fee: 0.0007677381174489796,
      bestDuration: 7,
      loansTVL: 170085500,
    },
    {
      marketPubkey: 'GAiBdpRBZsmxAwQpDRdx6dvAMzCqEWAmz6AML6hoxXJF',
      collectionName: 'Solcasino',
      collectionImage:
        'https://img-cdn.magiceden.dev/rs:fill:400:400:0:0/plain/https://bafybeidd6mu775yyagyr4vgo6y2ayb5dc7vylv5arnd3mupbscek5zveya.ipfs.nftstorage.link/',
      collectionFloor: 60087573000,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '298.000',
      activeOfferAmount: 5,
      bestOffer: 48975337774.81799,
      bestLTV: 83.17,
      bestBorrowerLTV: 81.507,
      activeBondsAmount: 0,
      fee: 1.24437337815609,
      bestDuration: 7,
      loansTVL: 0,
    },
    {
      marketPubkey: 'AFGvPt5iLNU12LY2mi1Ps3Jkb5jmrZDWZzDTjDMewGpC',
      collectionName: 'Solpunks',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679311662511_solpunks.jpg',
      collectionFloor: 3035865000,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '0.010',
      activeOfferAmount: 2,
      bestOffer: 470400,
      bestLTV: 0.32,
      bestBorrowerLTV: 0.015,
      activeBondsAmount: 0,
      fee: 0.000011952,
      bestDuration: 7,
      loansTVL: 0,
    },
    {
      marketPubkey: '7TA1w39Kz7FVkA8LuEspErwS5c56W264biCTnq2ntAae',
      collectionName: 'Solsteads Surreal Estate',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679311795811_solsteadsSurrealEstate.jpg',
      collectionFloor: 3661470000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: '8B6K5phx9c2ZnYHX7WRP6qQYgSoW3QFTtPfHt3pjKVo2',
      collectionName: 'Sorcies',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679312053872_sorcies.jpg',
      collectionFloor: 19183500,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '0.016',
      activeOfferAmount: 1,
      bestOffer: 16493400,
      bestLTV: 100,
      bestBorrowerLTV: 85.977,
      activeBondsAmount: 0,
      fee: 0.000419067,
      bestDuration: 7,
      loansTVL: 0,
    },
    {
      marketPubkey: 'HGQKWjjrsmrB4Ytw1SZjQC4ZxcY4aAbSnWHKBgpzWWKN',
      collectionName: 'Stoned Ape Crew',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679309321580_stonedApeCrew.jpg',
      collectionFloor: 15388078500,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '0.000',
      activeOfferAmount: 1,
      bestOffer: 2800,
      bestLTV: 93,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 7.114285714285714e-8,
      bestDuration: 7,
      loansTVL: 0,
    },
    {
      marketPubkey: 'ALshHVZugQLgfivYsBBHzA9So3Ybprbzd3oBhfyFWeB9',
      collectionName: 'Subber K3Y',
      collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/subber_k3y_pfp_1671058143838.gif',
      collectionFloor: 737694600,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: '2szoc4ExtrhnN1Ewq429YZx4JQVg1FwQZdBNmWctCKyX',
      collectionName: 'Taiyo Infants/Incubators',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679311964476_taiyoInfantsIncubators.jpg',
      collectionFloor: 22354500000,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '0.108',
      activeOfferAmount: 2,
      bestOffer: 108015400.00000001,
      bestLTV: 67.10000000000001,
      bestBorrowerLTV: 0.483,
      activeBondsAmount: 0,
      fee: 0.002744472918367347,
      bestDuration: 7,
      loansTVL: 0,
    },
    {
      marketPubkey: '4Zt8LuQ3Emb76ThBr4fntfs5Hy5KQ1XprMpUnKbznRdB',
      collectionName: 'Taiyo Oil',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679311979543_taiyoOil.jpg',
      collectionFloor: 4271200000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: 'Fi7ALUiHWVW7gcG8cpQaHs9W1KwR9KkJCDxtEPEPYYqr',
      collectionName: 'Taiyo Robotics',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679309331127_taiyoRobotics.jpg',
      collectionFloor: 68995500000,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '0.100',
      activeOfferAmount: 1,
      bestOffer: 100000000.00000001,
      bestLTV: 72.46000000000001,
      bestBorrowerLTV: 0.145,
      activeBondsAmount: 0,
      fee: 0.0025408163265306124,
      bestDuration: 7,
      loansTVL: 0,
    },
    {
      marketPubkey: 'DdaCFFRqFG5ALWdjjbMUc6jvFmcGJRbFZDDCj8m5DR7Z',
      collectionName: 'Tensorians',
      collectionImage:
        'https://prod-image-cdn.tensor.trade/images/400x400/freeze=false/https://public-cdn.tensor.trade/collection_splash/t2.gif',
      collectionFloor: 14062680000,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '491.987',
      activeOfferAmount: 513,
      bestOffer: 12126277089.359987,
      bestLTV: 87.99,
      bestBorrowerLTV: 86.23,
      activeBondsAmount: 92,
      fee: 0.30810642808679967,
      bestDuration: 7,
      loansTVL: 1122167195650,
    },
    {
      marketPubkey: '88JgZgphTPttvyw4JqV5nopTAHFugEwQQF59pgAJLPLa',
      collectionName: 'Terra Shards',
      collectionImage:
        'https://prod-image-cdn.tensor.trade/images/slug=05c52d84-2e49-4ed9-a473-b43cab41e130/400x400/freeze=true/https://prod-tensor-creators-s3.s3.us-east-1.amazonaws.com/drop-metadata/85c928a2-4871-4eef-a5e0-ebe511c53c0d/images/terra.gif',
      collectionFloor: 0,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '0.037',
      activeOfferAmount: 4,
      bestOffer: 0,
      bestLTV: 100,
      bestBorrowerLTV: null,
      activeBondsAmount: 0,
      fee: 0.0009485070612244898,
      bestDuration: 7,
      loansTVL: 0,
    },
    {
      marketPubkey: 'HYfHAWf1Petpe5A8EZeHqWFGXyhqaKWMoXvryasqzS52',
      collectionName: 'The Anon Club',
      collectionImage: 'https://storage.googleapis.com/feliz-crypto/project_photos/888anonclub.png',
      collectionFloor: 0,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '0.000',
      activeOfferAmount: 1,
      bestOffer: 0,
      bestLTV: 100,
      bestBorrowerLTV: null,
      activeBondsAmount: 1,
      fee: 2.058061224489796e-7,
      bestDuration: 7,
      loansTVL: 24999986200,
    },
    {
      marketPubkey: 'H8piBdaDk29HZiDShmPnKnEeChcCbCHKY2vLvRhX8mu2',
      collectionName: 'The Bastards',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679312210469_theBastards.jpg',
      collectionFloor: 1361813600,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '1.576',
      activeOfferAmount: 1,
      bestOffer: 907512583.0400002,
      bestLTV: 68,
      bestBorrowerLTV: 66.64,
      activeBondsAmount: 1,
      fee: 0.023058227875200003,
      bestDuration: 7,
      loansTVL: 1179655736,
    },
    {
      marketPubkey: 'FdjS2WKkH81hbXY4dLHrMrZKVUQHmLyTJcCxg2mN6wgR',
      collectionName: 'The Box by The Hoopas',
      collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/hoopas_the_box_pfp_1683797448911.png',
      collectionFloor: 1468320000,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '0.000',
      activeOfferAmount: 6,
      bestOffer: 46700,
      bestLTV: 35.07,
      bestBorrowerLTV: 0.003,
      activeBondsAmount: 0,
      fee: 0.0000011865612244897961,
      bestDuration: 7,
      loansTVL: 0,
    },
    {
      marketPubkey: 'CJttTmQMiCrkqPuCLmfi7ExR1T5w8cvLWVbGkCUKUfFt',
      collectionName: 'The Bridged',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679311804429_theBridged.jpg',
      collectionFloor: 1015162399,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: 'EhWPxHSWgNte3XLTonAAZjxHxTzoGLMoUFHVigbpFB9p',
      collectionName: 'The Catalina Whale Mixer',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679309907678_theCatalinaWhaleMixer.jpg',
      collectionFloor: 11502000000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: 'G44xDWSegAgFjruMe4oS2iSsz39GGWPNCgnGmUyuyf3U',
      collectionName: 'The Decod3rs',
      collectionImage: 'https://nftstorage.link/ipfs/bafybeifoqdg6mpsm7dp44eil37zw5rxyxrzqkwak65zxixbj5gentgbok4',
      collectionFloor: 1331125000,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '4.003',
      activeOfferAmount: 1,
      bestOffer: 999509815.5,
      bestLTV: 76.62,
      bestBorrowerLTV: 75.088,
      activeBondsAmount: 4,
      fee: 0.025395708577500002,
      bestDuration: 7,
      loansTVL: 3997890400,
    },
    {
      marketPubkey: '8FhmzAKRV3YWVH8whGU7cvvvFu55CwHz1q8ECbrqEnbu',
      collectionName: 'The Fox Club',
      collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/thefoxclub_pfp_1673434678154.jpeg',
      collectionFloor: 2166125000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 1,
      fee: 0,
      bestDuration: null,
      loansTVL: 5547280200,
    },
    {
      marketPubkey: 'HPHyNgMdth6ETCG3obn3t4buG3V23bj3hb46JZ94pHnf',
      collectionName: 'The Greyhound Cannabis Club',
      collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/gcc_pfp_1682706145932.jpeg',
      collectionFloor: 86000000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: '8uAQLhAezq6tioW3VQVAWPCkhggtPMC3muxoZ4WpXbJh',
      collectionName: 'The Heist',
      collectionImage: 'https://bafybeigch4m7rbec2l255powwbjmacnyj5n5o54qcboiwfgs2nnw6thimq.ipfs.nftstorage.link/',
      collectionFloor: 12704160000,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '11.905',
      activeOfferAmount: 9,
      bestOffer: 8712563744.64,
      bestLTV: 69.98,
      bestBorrowerLTV: 68.58,
      activeBondsAmount: 6,
      fee: 0.2213702420832,
      bestDuration: 7,
      loansTVL: 62190986200,
    },
    {
      marketPubkey: 'EGF444f6QP7VgL8ipGJN1qLXoSjwZ9ix4ZXctY7SNniL',
      collectionName: 'The Heist: Orangutans',
      collectionImage: 'https://bafybeig7u2mevivictt5j4hyuwio7x4tcfg544dy3dcdzssvazia77fmmu.ipfs.nftstorage.link/',
      collectionFloor: 0,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '0.064',
      activeOfferAmount: 5,
      bestOffer: 0,
      bestLTV: 100,
      bestBorrowerLTV: null,
      activeBondsAmount: 0,
      fee: 0.0016284803265306123,
      bestDuration: 7,
      loansTVL: 0,
    },
    {
      marketPubkey: '6PqhY2PmE3h8q89kLiYSojRcHGmDhbe9NKuewNvPtmoz',
      collectionName: 'The Lowlifes [0.G]',
      collectionImage: 'https://bafybeico7frgy6fbqlcyoefzz5pjmv35ciljhe4amx2wsrlivirfs7liee.ipfs.nftstorage.link/',
      collectionFloor: 15832320000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: 'DkLe2bgyvpXfCrDz3GUdXzKoqNKzbtpjx1SqvqxR9UPD',
      collectionName: 'The Remnants',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679311830438_theRemnants.jpg',
      collectionFloor: 2024925000,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '76.049',
      activeOfferAmount: 3,
      bestOffer: 1984426500,
      bestLTV: 100,
      bestBorrowerLTV: 98,
      activeBondsAmount: 14,
      fee: 0.0504206325,
      bestDuration: 7,
      loansTVL: 27862870000,
    },
    {
      marketPubkey: 'AuLr3MbtEeUJFxzyMZRoBWeJyWP9GVofKb45528u633m',
      collectionName: 'The Stoned Frogs',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679311827787_theStonedFrogs.jpg',
      collectionFloor: 517538000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: '5tPpHN8cczmvYAgKcaTQLCVDh2XpHp2j39iBfgFxAX7',
      collectionName: 'The Suites',
      collectionImage: 'https://bafkreifqopva2uobrl7yurl7p677krfq57senk22qufl4jpnt4d4vz6k2u.ipfs.nftstorage.link/',
      collectionFloor: 2182635000,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '5.000',
      activeOfferAmount: 1,
      bestOffer: 1069277251.77,
      bestLTV: 49.99,
      bestBorrowerLTV: 48.99,
      activeBondsAmount: 0,
      fee: 0.02716837098885,
      bestDuration: 7,
      loansTVL: 0,
    },
    {
      marketPubkey: '8wVbPDRRb3nHE4WLSZu5CP957FkjwAuov13nhhTabPa5',
      collectionName: 'Thesmophoria',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679312177588_thesmophoria.jpg',
      collectionFloor: 855445001,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '0.001',
      activeOfferAmount: 1,
      bestOffer: 697200,
      bestLTV: 83.46000000000001,
      bestBorrowerLTV: 0.082,
      activeBondsAmount: 0,
      fee: 0.000017714571428571426,
      bestDuration: 7,
      loansTVL: 0,
    },
    {
      marketPubkey: '8qckdAXUUhJusXC8hNCgE57CeWGUypxAWMD4GkbyzP4U',
      collectionName: 'Thugbirdz',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679309905788_thugbirdz.jpg',
      collectionFloor: 5054700000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: '9ASDrfm9ZRWsjBvDVfvFWqcmXuym4mG24Zi6Yrc6ftdB',
      collectionName: 'Toonies',
      collectionImage: 'https://nftstorage.link/ipfs/bafybeifpqubqsrpfnxyqe6bypiclue5umn2qdtptlxeqifdsi4455zdy7e',
      collectionFloor: 5070000000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: '3UazNaB1dh3taKhY3Huxh1md5sbtNJikTfzMEjFa7pBD',
      collectionName: 'Transdimensional Fox Federation',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679311912412_transdimensionalFoxFederation.jpg',
      collectionFloor: 9295000000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: 'FSVkpUAi5qoQWKJAGd9KD6iCXKhmq5QBFfjQLVrUsyrh',
      collectionName: "Trippin' Apes",
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679309920193_trippinApes.jpg',
      collectionFloor: 1341900000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: '4Vt2bo1tZkM7hUbhMiNEHrDosr9AdRbPFVpSB481rUFW',
      collectionName: 'Turtles Classic',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679309898791_turtles.jpg',
      collectionFloor: 812000000,
      apy: 52.14,
      duration: [14],
      offerTVL: '85.589',
      activeOfferAmount: 1,
      bestOffer: 676396000,
      bestLTV: 85,
      bestBorrowerLTV: 83.3,
      activeBondsAmount: 0,
      fee: 0.01718598,
      bestDuration: 14,
      loansTVL: 0,
    },
    {
      marketPubkey: 'G1J559w7phA1JKDc9Xh1unKL3cHmvbDEVCdVXfpfZnsi',
      collectionName: 'Ubik',
      collectionImage: 'https://storage.googleapis.com/feliz-crypto/project_photos/ubik.png',
      collectionFloor: 421244160,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: 'FXRU8E3RFgnohzksFAzb8onguajzBaGgUjLKqzEFbxyA',
      collectionName: 'Undead Genesis',
      collectionImage: 'https://bafybeidpmbpy635k3o26egygasbrp4nv5fnocozzclp63k4dsd635bmkpi.ipfs.nftstorage.link/0.gif',
      collectionFloor: 336040000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: 'Bo2QUnfCoZnQkb5mb4dEexbKkVC9xHNsDjsiDGMQPfR6',
      collectionName: 'Underground DAO',
      collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/udao_pfp_1651855541352.png',
      collectionFloor: 7736819999,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: 'A5X9hACjzH6oPLLNB83gYbY6Qn1faFwk2n4eBnczWMbd',
      collectionName: 'Underground Society',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679312130398_undergroundSociety.jpg',
      collectionFloor: 355250000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: '4Dmy1a8QxZ58KrXBwia6sn9nnMztwzLHHHc5TbG9AVzf',
      collectionName: 'Underworld',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679312173275_underworld.jpg',
      collectionFloor: 4208100000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: 'GkzgujuvXoGpXksafNWosb9jihMC9pR1xMTLgmJF5F12',
      collectionName: 'Utility Ape',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679312197944_utilityApe.jpg',
      collectionFloor: 91260000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: '2HJYhfjbdkRNHY6GhjYZvwURWuLrLcy7V6aSLzEhDBKd',
      collectionName: 'Vibe Knights',
      collectionImage:
        'https://nftstorage.link/ipfs/bafybeihjssblkjyfyo5unvr75h4th5jjonbmbrkdd475hghxfnzwo47pxe/820.png',
      collectionFloor: 468600000,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '0.000',
      activeOfferAmount: 1,
      bestOffer: 6399.999999999999,
      bestLTV: 71.65,
      bestBorrowerLTV: 0.001,
      activeBondsAmount: 0,
      fee: 1.6261224489795915e-7,
      bestDuration: 7,
      loansTVL: 0,
    },
    {
      marketPubkey: 'AF3K3DGj7h5huZAWQsFE6KFN8rJhQjke2WDRf51RV7Su',
      collectionName: 'VTOPIANS',
      collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/vtopian_pfp_1694275807711.png',
      collectionFloor: 0,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '2.500',
      activeOfferAmount: 1,
      bestOffer: 0,
      bestLTV: 100,
      bestBorrowerLTV: null,
      activeBondsAmount: 0,
      fee: 0.0635204081632653,
      bestDuration: 7,
      loansTVL: 0,
    },
    {
      marketPubkey: '6E8yehq6AtNYuwVEMcWenM1wESDe2x4pzKidj46TZg7a',
      collectionName: 'Wise Whales',
      collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/wise_whales_pfp_1672177486455.png',
      collectionFloor: 1904559999,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '5.744',
      activeOfferAmount: 2,
      bestOffer: 1399478305.505196,
      bestLTV: 74.98,
      bestBorrowerLTV: 73.48,
      activeBondsAmount: 13,
      fee: 0.03555817327252998,
      bestDuration: 7,
      loansTVL: 18102217000,
    },
    {
      marketPubkey: 'FS8itQWwFJAWhQAzX7BMKocM1XNqqb5LJfzr7KKmNFb7',
      collectionName: 'Wolf Capital',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679312213493_wolfCapital.jpg',
      collectionFloor: 740209860,
      apy: 104.28999999999999,
      duration: [7],
      offerTVL: '11.801',
      activeOfferAmount: 5,
      bestOffer: 594832643.4959999,
      bestLTV: 82,
      bestBorrowerLTV: 80.36,
      activeBondsAmount: 2,
      fee: 0.015113604921479997,
      bestDuration: 7,
      loansTVL: 1417066850,
    },
    {
      marketPubkey: 'CLMwrZohLm5UozmAGACPYSHnKHChAMWk1u4AeuFtk2nS',
      collectionName: 'y00ts',
      collectionImage: 'https://api.frakt.xyz/image/400x400/1679309943282_y00Ts.jpg',
      collectionFloor: 134830000000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
    {
      marketPubkey: 'GMb3RfJKKZ5zEXfQRVvhtUGFGtn2atLERuywRhaovc31',
      collectionName: 'Zero Monke Biz',
      collectionImage: 'https://creator-hub-prod.s3.us-east-2.amazonaws.com/zmb_0735_pfp_1675737312377.jpeg',
      collectionFloor: 5516160000,
      apy: 0,
      duration: [],
      offerTVL: '0.000',
      activeOfferAmount: 0,
      bestOffer: 0,
      bestLTV: 0,
      bestBorrowerLTV: 0,
      activeBondsAmount: 0,
      fee: 0,
      bestDuration: null,
      loansTVL: 0,
    },
  ];

  const notWhitelisted = whitelistOld.filter(
    (oldwl) => !whitelistsNew.data.find((newWhitelist) => oldwl.collectionName == newWhitelist.collectionName),
  );

  console.log('whitelistedNew: ', whitelistsNew.data.length);
  console.log('whitelistOld: ', whitelistOld.length);

  console.log('notWhitelisted: ', notWhitelisted);
};
