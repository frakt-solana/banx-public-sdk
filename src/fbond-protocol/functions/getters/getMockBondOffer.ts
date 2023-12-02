import { web3 } from '@project-serum/anchor';
import { anchorRawBNsAndPubkeysToNumsAndStrings } from '../../helpers';
import { returnAnchorProgram } from '../../helpers';
import { BondFeatures, BondOfferV2, BondingCurveType, PairState } from '../../types';
// import { anchorRawBNsAndPubkeysToNumsAndStrings, returnAnchorProgram } from '../../helpers';

export const getMockBondOffer = (
): BondOfferV2 => {
  
    return  {
        hadoMarket: '9mCw8UDAV1w3UcrASDisGF4y3QZxAQXMRtYCJVQNiTsn',
        pairState: PairState.PerpetualOnMarket,
        bondingCurve: { delta: 0, bondingType: BondingCurveType.Linear },
        baseSpotPrice: 1000000000,
        mathCounter: 0,
        currentSpotPrice: 500000000,
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
      }
};


//   {
//       hadoMarket: '9mCw8UDAV1w3UcrASDisGF4y3QZxAQXMRtYCJVQNiTsn',
//       pairState: PairState.PerpetualOnMarket,
//       bondingCurve: { delta: 0, bondingType: BondingCurveType.Linear },
//       baseSpotPrice: 1000000000,
//       mathCounter: 0,
//       currentSpotPrice: 500000000,
//       concentrationIndex: 0,
//       bidCap: 100000000000000,
//       bidSettlement: -99999000000000,
//       edgeSettlement: 1000000000,
//       fundsSolOrTokenBalance: 3000000000,
//       buyOrdersQuantity: 1,
//       lastTransactedAt: 1692149055,
//       assetReceiver: '6CnQUFVk2d8TRvQa2Lr7KDvx9zK12Q4jkA7mmDtzj71e',
//       validation: {
//         loanToValueFilter: 0,
//         durationFilter: 604800,
//         maxReturnAmountFilter: 0,
//         bondFeatures: BondFeatures.AutoReceiveAndReceiveNft,
//       },
//       publicKey: '5mxSZxG9JSwWG9bf3rVG2jC4GyDqemdF9gKQM4AKSpGw',
//     },

