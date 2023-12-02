import { BN, web3 } from '@project-serum/anchor';
import { ASSOCIATED_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@project-serum/anchor/dist/cjs/utils/token';
import { findAssociatedTokenAddress } from '../../../../../common';
import {
  ENCODER,
  METADATA_PROGRAM_PUBKEY,
  HADOMARKET_REGISTRY_PREFIX,
  AUTHORIZATION_RULES_PROGRAM,
  BOND_PROOGRAM_AUTHORITY_PREFIX,
  EMPTY_PUBKEY,
  COLLATERAL_BOX_PREFIX,
  MUTUAL_BOND_TRADE_TXN_VAULT,
} from '../../../../constants';

import {
  anchorRawBNsAndPubkeysToNumsAndStrings,
  findTokenRecordPda,
  getMetaplexEditionPda,
  getMetaplexMetadata,
  getMetaplexMetadataPda,
  returnAnchorProgram,
} from '../../../../helpers';
import { Metadata } from '@metaplex-foundation/mpl-token-metadata';

import { RepayAccounts } from '../repayment';
import { BondAndTransactionOptimistic, nowInSeconds } from '../../offer';
import { BondTradeTransactionV2State, FraktBondState, RedeemResult } from '../../../../types';

type ClaimPerpetualLoan = (params: {
  programId: web3.PublicKey;
  connection: web3.Connection;

  addComputeUnits?: boolean;

  accounts: {
    fbond: web3.PublicKey;
    bondTradeTransaction: web3.PublicKey;
    userPubkey: web3.PublicKey;
    bondOffer: web3.PublicKey;

  };

  optimistic: BondAndTransactionOptimistic;

  sendTxn: (transaction: web3.Transaction, signers: web3.Signer[]) => Promise<void>;
}) => Promise<{
  account: web3.PublicKey | null;
  instructions: web3.TransactionInstruction[];
  signers: web3.Signer[];
  optimisticResult: BondAndTransactionOptimistic;
}>;

export const claimPerpetualLoanTest: ClaimPerpetualLoan = async ({
  programId,
  connection,
  accounts,
  addComputeUnits,
  optimistic,
  sendTxn,
}) => {
  const program = returnAnchorProgram(programId, connection);
  const instructions: web3.TransactionInstruction[] = [];
  const modifyComputeUnits = web3.ComputeBudgetProgram.setComputeUnitLimit({
    units: Math.round(800000 + Math.ceil(Math.random() * 10000)),
  });
  const requestHeap = web3.ComputeBudgetProgram.requestHeapFrame({ bytes: 1024 * 250 });
  instructions.push(requestHeap);

  if (!!addComputeUnits) instructions.push(modifyComputeUnits);

  instructions.push(
    await program.methods
      .claimPerpetualLoanTest()
      .accountsStrict({
        bondTradeTransactionV2: accounts.bondTradeTransaction,
        fbond: accounts.fbond,
        user: accounts.userPubkey,
        systemProgram: web3.SystemProgram.programId,
        rent: web3.SYSVAR_RENT_PUBKEY,
        uninitializedOldBondOfferV2: accounts.bondOffer
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
      bondTradeTransactionState: BondTradeTransactionV2State.PerpetualLiquidatedByClaim,
      redeemResult: RedeemResult.Nft,
      redeemedAt: nowInSeconds(),
    },
    fraktBond: {
      ...optimistic.fraktBond,
      fraktBondState: FraktBondState.PerpetualLiquidatedByClaim,
      repaidOrLiquidatedAt: nowInSeconds(),
      lastTransactedAt: nowInSeconds(),
    },
  };
  return { account: null, instructions, signers, optimisticResult };
};
