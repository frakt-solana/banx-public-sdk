import { BN, web3 } from '@project-serum/anchor';

import { enumToAnchorEnum, returnAnchorProgram } from '../../../helpers';
import { ENCODER, BOND_OFFER_PREFIX, CONSTANT_BID_CAP, MUTUAL_BOND_TRADE_TXN_VAULT, BOND_OFFER_VAULT_PREFIX } from '../../../constants';
import { BondFeatures, BondOfferV2, BondingCurveType, PairState, PairType } from '../../../types';
import { now } from 'lodash';
import { BondOfferOptimistic, optimisticInitializeBondOfferBonding, optimisticUpdateBondOfferBonding } from '.';
import { nowInSeconds, optimisticDepositToBondOffer, optimisticInitializeBondOffer } from './helpers';

type CreatePerpetualBondOfferBonding = (params: {
  programId: web3.PublicKey;
  connection: web3.Connection;

  args: {
    loanValue: number;
    quantityOfLoans: number;
    delta: number;
    bondingCurveType: BondingCurveType;

  };

  accounts: {
    hadoMarket: web3.PublicKey;
    userPubkey: web3.PublicKey;
  };

  sendTxn: (transaction: web3.Transaction, signers: web3.Signer[]) => Promise<void>;
}) => Promise<{
  bondOfferV2: web3.PublicKey;
  instructions: web3.TransactionInstruction[];
  signers: web3.Signer[];
  optimisticResult: BondOfferOptimistic;
}>;

export const createPerpetualBondOfferBonding: CreatePerpetualBondOfferBonding = async ({
  programId,
  connection,
  args,
  accounts,
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

  

  instructions.push(
    await program.methods
      .createPerpetualBondOfferBonding(new BN(bondOfferSeed), new BN(args.loanValue), new BN(args.quantityOfLoans), enumToAnchorEnum(args.bondingCurveType), new BN(args.delta))
      .accountsStrict({
        bondOfferV2: bondOfferV2,
        hadoMarket: accounts.hadoMarket,

        user: accounts.userPubkey,
        bondOfferVault,

        systemProgram: web3.SystemProgram.programId,
        rent: web3.SYSVAR_RENT_PUBKEY,
      })
      .instruction(),
  );

  const transaction = new web3.Transaction();
  for (let instruction of instructions) transaction.add(instruction);

  const signers = [];
  await sendTxn(transaction, signers);

  // const edgeSettlement = args.amountOfSolToDeposit;

  const initializedOffer = optimisticInitializeBondOfferBonding({
    bondingType: args.bondingCurveType,
    hadoMarket: accounts.hadoMarket.toBase58(),
    assetReceiver: accounts.userPubkey.toBase58(),
    bondOffer: bondOfferV2.toBase58(),
  });
  const optimisticBondOffer: BondOfferV2 = optimisticUpdateBondOfferBonding(
    { 
      bondOffer: initializedOffer,
      newLoanValue: args.loanValue ,
      newQuantityOfLoans: args.quantityOfLoans,
      newDelta: args.delta
    }
  );
  return {
    bondOfferV2: bondOfferV2,
    instructions,
    signers,
    optimisticResult: {
      bondOffer: optimisticBondOffer,
    },
  };
};
