import { BN, web3 } from '@project-serum/anchor';

import { enumToAnchorEnum, returnAnchorProgram } from '../../../helpers';
import { ENCODER, BOND_OFFER_PREFIX, CONSTANT_BID_CAP, MUTUAL_BOND_TRADE_TXN_VAULT, BOND_OFFER_VAULT_PREFIX } from '../../../constants';
import { BondFeatures, BondOfferV2, BondingCurveType, PairState, PairType } from '../../../types';
import { now } from 'lodash';
import { BondOfferOptimistic, optimisticInitializeBondOfferBonding, optimisticUpdateBondOfferBonding } from '.';
import { nowInSeconds, optimisticDepositToBondOffer, optimisticInitializeBondOffer } from './helpers';

type MigrateOldToBondingOffer = (params: {
  programId: web3.PublicKey;
  connection: web3.Connection;

  accounts: {
    oldBondOffer: web3.PublicKey;
    userPubkey: web3.PublicKey;
  };

  optimistic: {
    oldBondOffer: BondOfferV2;
  }

  

  sendTxn: (transaction: web3.Transaction, signers: web3.Signer[]) => Promise<void>;
}) => Promise<{
  bondOfferV2: web3.PublicKey;
  instructions: web3.TransactionInstruction[];
  signers: web3.Signer[];
  optimisticResult: BondOfferOptimistic;
}>;

export const migrateOldToBondingOffer: MigrateOldToBondingOffer = async ({
  programId,
  connection,
  accounts,
  optimistic,
  sendTxn,
}) => {
  const program = returnAnchorProgram(programId, connection);
  const instructions: web3.TransactionInstruction[] = [];
  // const bondOfferV2 = web3.Keypair.generate();

  const bondOfferSeed = Math.ceil(Math.random() * 1000000);
  const [bondOfferV2] = await web3.PublicKey.findProgramAddress(
    [ENCODER.encode(BOND_OFFER_PREFIX), accounts.userPubkey.toBuffer(), ENCODER.encode(bondOfferSeed.toString())],
    program.programId,
  );

  const [bondOfferVault, bondOfferVaultBump] = await web3.PublicKey.findProgramAddress(
    [
      ENCODER.encode(BOND_OFFER_VAULT_PREFIX),
      bondOfferV2.toBuffer(),
    ],
    program.programId,
  );

  const [mutualBondTradeTxnVault] = await web3.PublicKey.findProgramAddress(
    [ENCODER.encode(MUTUAL_BOND_TRADE_TXN_VAULT)],
    program.programId,
  );

  instructions.push(
    await program.methods
      .migrateOldToBondingOffer(new BN(bondOfferSeed))
      .accountsStrict({
          bondOfferV2: bondOfferV2,
          oldBondOfferV2: accounts.oldBondOffer,

          user: accounts.userPubkey,
          bondOfferVault,

          systemProgram: web3.SystemProgram.programId,
          rent: web3.SYSVAR_RENT_PUBKEY,
          mutualBondTradeTxnVault: mutualBondTradeTxnVault
      })
      .instruction(),
  );

  const transaction = new web3.Transaction();
  for (let instruction of instructions) transaction.add(instruction);

  const signers = [];
  await sendTxn(transaction, signers);

  const newDelta = 0;
  const newBuyOrdersQuan = Math.floor(optimistic.oldBondOffer.fundsSolOrTokenBalance / optimistic.oldBondOffer.currentSpotPrice) ;
  const newReserv = optimistic.oldBondOffer.fundsSolOrTokenBalance % optimistic.oldBondOffer.currentSpotPrice;

  const bondOfferV2OPtimistic = optimisticInitializeBondOfferBonding({
    bondingType: BondingCurveType.Linear,
    hadoMarket: optimistic.oldBondOffer.hadoMarket,
    assetReceiver: optimistic.oldBondOffer.assetReceiver,
    bondOffer: bondOfferV2.toBase58(),
  });
  return {
    bondOfferV2: bondOfferV2,
    instructions,
    signers,
    optimisticResult: {
      bondOffer: {
        ...bondOfferV2OPtimistic,
        baseSpotPrice: optimistic.oldBondOffer.currentSpotPrice,
        currentSpotPrice: optimistic.oldBondOffer.currentSpotPrice,
        mathCounter: 0,
        buyOrdersQuantity: newBuyOrdersQuan,
        concentrationIndex: optimistic.oldBondOffer.concentrationIndex,
        bidCap: optimistic.oldBondOffer.bidCap,
        bidSettlement: newReserv,
        edgeSettlement: 0,
        assetReceiver: optimistic.oldBondOffer.assetReceiver,
        fundsSolOrTokenBalance: optimistic.oldBondOffer.fundsSolOrTokenBalance,
        validation: {
          bondFeatures: optimistic.oldBondOffer.validation.bondFeatures,
          durationFilter: optimistic.oldBondOffer.validation.durationFilter,
          maxReturnAmountFilter: optimistic.oldBondOffer.validation.maxReturnAmountFilter,
          loanToValueFilter: optimistic.oldBondOffer.currentSpotPrice,
        }
      }
    },
  };
};
