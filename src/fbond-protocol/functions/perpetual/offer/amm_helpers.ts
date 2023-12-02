import { CONSTANT_BID_CAP } from '../../../constants';
import { getSumOfOrdersSeries } from '../../../helpers';
// import { getSumOfOrdersSeries } from "../../../helpers";
import { BondFeatures, BondOfferV2, BondingCurveType, OrderType, PairState } from '../../../types';
import { nowInSeconds } from './helpers';

export const calculateNextSpotPrice = ({
  spotPrice,
  delta,
  bondingCurveType,
  counter,
}: {
  spotPrice: number;
  delta: number;
  bondingCurveType: BondingCurveType;
  counter: number;
}): number => {
  if (bondingCurveType === BondingCurveType.Linear) {
    let current_price = spotPrice; // 1
    const targetCounter = counter + -1;
    if (targetCounter >= 0) {
      // 0
      for (let i = 0; i < Math.abs(targetCounter); i++) {
        current_price += delta;
      }
    } else {
      for (let i = 0; i < Math.abs(targetCounter); i++) {
        current_price -= delta;
      }
    }
    return current_price;
  } else if (bondingCurveType === BondingCurveType.Exponential) {
    const newCounter = counter - 1;
    let newDelta = newCounter > 0 ? (delta + 1e4) / 1e4 : 1 / ((delta + 1e4) / 1e4);

    return spotPrice * Math.pow(newDelta, Math.abs(newCounter));
  } else {
    return 0;
  }
};

export const optimisticUpdateBondOfferBonding = ({
  bondOffer,
  newLoanValue,
  newQuantityOfLoans,
  newDelta,
}: {
  bondOffer: BondOfferV2;
  newLoanValue: number;
  newQuantityOfLoans: number;
  newDelta: number;
}): BondOfferV2 => {
  const newBaseSpotPrice = calculateNextSpotPrice({
    spotPrice: newLoanValue,
    delta: newDelta,

    bondingCurveType: bondOffer.bondingCurve.bondingType,
    counter: bondOffer.mathCounter * -1 + 1,
  });

  const newBuyOrdersSize = getSumOfOrdersSeries({
    amountOfOrders: newQuantityOfLoans,
    delta: newDelta,
    bondingCurveType: bondOffer.bondingCurve.bondingType,
    spotPrice: newBaseSpotPrice,
    counter: bondOffer.mathCounter,
    orderType: OrderType.Sell,
  });

  return {
    ...bondOffer,
    fundsSolOrTokenBalance: newBuyOrdersSize,
    baseSpotPrice: newBaseSpotPrice,
    bondingCurve: { delta: newDelta, bondingType: bondOffer.bondingCurve.bondingType },
    currentSpotPrice: newLoanValue,
    buyOrdersQuantity: newQuantityOfLoans,
    bidSettlement: 0,
    bidCap: CONSTANT_BID_CAP,
    validation: {
      ...bondOffer.validation,
      loanToValueFilter: newLoanValue,
    },
    lastTransactedAt: nowInSeconds(),
  };
};

export const optimisticInitializeBondOfferBonding = (args: {
  hadoMarket: string;
  assetReceiver: string;
  bondOffer: string;
  bondingType: BondingCurveType;
}): BondOfferV2 => ({
  hadoMarket: args.hadoMarket,
  pairState: PairState.PerpetualBondingCurveOnMarket,
  bondingCurve: { delta: 0, bondingType: args.bondingType },
  baseSpotPrice: 0,
  mathCounter: 0,
  currentSpotPrice: 0,
  concentrationIndex: 0,
  bidCap: CONSTANT_BID_CAP,
  bidSettlement: 0,
  edgeSettlement: 0,
  fundsSolOrTokenBalance: 0,
  buyOrdersQuantity: 1,
  lastTransactedAt: nowInSeconds(),
  assetReceiver: args.assetReceiver,
  validation: {
    loanToValueFilter: 0,
    durationFilter: 604800,
    maxReturnAmountFilter: 0,
    bondFeatures: BondFeatures.AutoReceiveAndReceiveNft,
  },
  publicKey: args.bondOffer,
});

export const optimisticBorrowUpdateBondingBondOffer = (
  bondOffer: BondOfferV2,
  amountOfSolToWithdraw: number,
): BondOfferV2 => {
  const amountToSendIntoReserves = bondOffer.currentSpotPrice - amountOfSolToWithdraw;
  let offerAmount = bondOffer.currentSpotPrice;
  let nextSpotPrice = calculateNextSpotPrice({
    bondingCurveType: bondOffer.bondingCurve.bondingType,
    delta: bondOffer.bondingCurve.delta,
    spotPrice: bondOffer.baseSpotPrice,
    counter: bondOffer.mathCounter,
  });

  const newFundsSolOrTokenBalance = bondOffer.fundsSolOrTokenBalance - offerAmount;
  return {
    ...bondOffer,
    mathCounter: bondOffer.mathCounter - 1,
    currentSpotPrice: nextSpotPrice,
    buyOrdersQuantity: bondOffer.buyOrdersQuantity - 1,
    fundsSolOrTokenBalance: newFundsSolOrTokenBalance,
    bidSettlement: bondOffer.bidSettlement + amountToSendIntoReserves,
    validation: { ...bondOffer.validation, maxReturnAmountFilter: bondOffer.validation.maxReturnAmountFilter + 1 },
    edgeSettlement: bondOffer.edgeSettlement + amountOfSolToWithdraw,
    lastTransactedAt: nowInSeconds(),
  };
};

export const optimisticRepayUpdateBondingBondOffer = (
  bondOffer: BondOfferV2,
  fullLoanBody: number,
  solInterest: number,
  isPartial: boolean,
): BondOfferV2 => {
  const index = 1;

  if (bondOffer.pairState === PairState.PerpetualBondingCurveOnMarket) {
    let nextSpotPrice = calculateNextSpotPrice({
      bondingCurveType: bondOffer.bondingCurve.bondingType,
      delta: bondOffer.bondingCurve.delta,
      spotPrice: bondOffer.baseSpotPrice,
      counter: bondOffer.mathCounter + 2,
    });

    const totalReserves = fullLoanBody + bondOffer.bidSettlement;

    if (
      (bondOffer.currentSpotPrice >= bondOffer.validation.loanToValueFilter && bondOffer.bondingCurve.delta > 0) ||
      totalReserves < nextSpotPrice
    ) {
      return {
        ...bondOffer,

        bidSettlement: totalReserves,
        lastTransactedAt: nowInSeconds(),
        concentrationIndex: bondOffer.concentrationIndex + solInterest,
        validation: {
          ...bondOffer.validation,
          maxReturnAmountFilter: isPartial
            ? bondOffer.validation.maxReturnAmountFilter
            : bondOffer.validation.maxReturnAmountFilter - 1,
        },
        edgeSettlement: bondOffer.edgeSettlement - fullLoanBody,
      };
    } else {
      const amountLeftInReserves = totalReserves - nextSpotPrice;

      return {
        ...bondOffer,

        bidSettlement: amountLeftInReserves,
        lastTransactedAt: nowInSeconds(),
        concentrationIndex: bondOffer.concentrationIndex + solInterest,

        mathCounter: bondOffer.mathCounter + index,
        currentSpotPrice: nextSpotPrice,
        buyOrdersQuantity: bondOffer.buyOrdersQuantity + index,
        fundsSolOrTokenBalance: bondOffer.fundsSolOrTokenBalance + nextSpotPrice,
        validation: {
          ...bondOffer.validation,
          maxReturnAmountFilter: isPartial
            ? bondOffer.validation.maxReturnAmountFilter
            : bondOffer.validation.maxReturnAmountFilter - 1,
        },
        edgeSettlement: bondOffer.edgeSettlement - fullLoanBody,
      };
    }
  }

  return { ...bondOffer };
};

//   pub fn process_manage_bonding_repayment<'info>(
//     user: &mut Signer<'info>,
//     system_program: &Program<'info, System>,
//     lender: &AccountInfo<'info>,

//     bond_offer: &mut Account<'info, BondOfferV2>,

//     mutual_bond_trade_txn_vault: &AccountInfo<'info>,

//     full_loan_body: u64,
//     sol_interest: u64,
// ) -> Result<u64> {
//     let amount_of_sol_to_get = full_loan_body.checked_add(sol_interest).unwrap();
//     if bond_offer.pair_state == PairState::PerpetualOnMarket {
//         // Transfered
//         create_transfer(user, lender, system_program, amount_of_sol_to_get)?;
//     } else if bond_offer.pair_state == PairState::PerpetualBondingCurveOnMarket {
//         let next_spot_price: u64 = calculate_next_spot_price(
//             bond_offer.bonding_curve.bonding_type,
//             bond_offer.bonding_curve.delta,
//             bond_offer.base_spot_price,
//             bond_offer.math_counter.checked_add(1 as i64).unwrap(),
//         );
//         let total_reserves = full_loan_body
//             .checked_add(bond_offer.bid_settlement as u64)
//             .unwrap();

//         if bond_offer.current_spot_price >= bond_offer.validation.loan_to_value_filter
//             || total_reserves < next_spot_price
//         {
//             bond_offer.bid_settlement = total_reserves as i64;
//         } else {
//             let amount_left_in_reserves = total_reserves.checked_sub(next_spot_price).unwrap();

//             bond_offer.bid_settlement = amount_left_in_reserves as i64;

//             update_repay_perpetual_offer_amm(bond_offer)?;
//         }
//         bond_offer.concentration_index = bond_offer
//             .concentration_index
//             .checked_add(sol_interest)
//             .unwrap(); // accounting fee
//         create_transfer(
//             user,
//             mutual_bond_trade_txn_vault,
//             system_program,
//             amount_of_sol_to_get,
//         )?;
//     } else {
//         return Err(ErrorCodes::InstructionIsNotSupported.into());
//     }

//     Ok(amount_of_sol_to_get)
// }
