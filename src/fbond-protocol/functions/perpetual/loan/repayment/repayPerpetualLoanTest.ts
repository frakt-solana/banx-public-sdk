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
  BOND_OFFER_VAULT_PREFIX,
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
import {
  BondAndTransactionOptimistic,
  calculateCurrentInterestSolPure,
  nowInSeconds,
  optimisticRepayBondTradeTransaction,
  optimisticRepayFraktBond,
  optimisticRepayUpdateBondingBondOffer,
} from '../../offer';
import { RepayAccounts } from './repayPerpetualLoan';
import { BondOfferV2, FraktBond, BondTradeTransactionV2 } from '../../../../types';

type RepayPerpetualLoan = (params: {
  programId: web3.PublicKey;
  connection: web3.Connection;

  args: {
    repayAccounts: RepayAccounts[];
  };
  addComputeUnits?: boolean;

  accounts: {
    userPubkey: web3.PublicKey;
    protocolFeeReceiver: web3.PublicKey;
    oldBondOffer: web3.PublicKey;
  };

  sendTxn: (transaction: web3.Transaction, signers: web3.Signer[]) => Promise<void>;
}) => Promise<{
  account: web3.PublicKey | null;
  instructions: web3.TransactionInstruction[];
  signers: web3.Signer[];
  addressesForLookupTable: web3.PublicKey[];
  optimisticResults: {
    oldBondOffer?: BondOfferV2;
    fraktBond: FraktBond;
    bondTradeTransaction: BondTradeTransactionV2;
  }[];
}>;

export const repayPerpetualLoanTest: RepayPerpetualLoan = async ({
  programId,
  connection,
  args,
  accounts,
  addComputeUnits,
  sendTxn,
}) => {
  const program = returnAnchorProgram(programId, connection);
  const instructions: web3.TransactionInstruction[] = [];

  const [mutualBondTradeTxnVault] = await web3.PublicKey.findProgramAddress(
    [ENCODER.encode(MUTUAL_BOND_TRADE_TXN_VAULT)],
    program.programId,
  );

  const [oldBondOfferVault, oldBondOfferVaultBump] = await web3.PublicKey.findProgramAddress(
    [
      ENCODER.encode(BOND_OFFER_VAULT_PREFIX),
      accounts.oldBondOffer.toBuffer(),
    ],
    program.programId,
  );

  const repayRemainingAccounts = (
    await Promise.all(
      args.repayAccounts.map(async (repayAccount) => {

          return [
          {
            pubkey: repayAccount.bondTradeTransaction,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: repayAccount.lender,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: repayAccount.fbond,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: accounts.protocolFeeReceiver,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: accounts.oldBondOffer,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: oldBondOfferVault,
            isSigner: false,
            isWritable: true,
          },
        ];
      }),
    )
  ).flat();

  const modifyComputeUnits = web3.ComputeBudgetProgram.setComputeUnitLimit({
    units: Math.round(800000 + Math.ceil(Math.random() * 10000)),
  });
  const requestHeap = web3.ComputeBudgetProgram.requestHeapFrame({ bytes: 1024 * 250 });
  instructions.push(requestHeap);

  if (!!addComputeUnits) instructions.push(modifyComputeUnits);

  instructions.push(
    await program.methods
      .repayPerpetualLoanTest()
      .accountsStrict({
        mutualBondTradeTxnVault: mutualBondTradeTxnVault,

        user: accounts.userPubkey,

        systemProgram: web3.SystemProgram.programId,
        rent: web3.SYSVAR_RENT_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .remainingAccounts([...repayRemainingAccounts])
      .instruction(),
  );

  const transaction = new web3.Transaction();
  for (let instruction of instructions) transaction.add(instruction);
  const remainingAccounts = [
    ...repayRemainingAccounts.map((sellBondRemainingAccount) => sellBondRemainingAccount.pubkey),
  ];

  const addressesForLookupTable = [...remainingAccounts];
  const signers = [];
  await sendTxn(transaction, signers);

  const optimisticResults: {
    oldBondOffer?: BondOfferV2;
    fraktBond: FraktBond;
    bondTradeTransaction: BondTradeTransactionV2;
  }[] = args.repayAccounts.map((repayParams) => {
    const fullLoanBody =
      repayParams.optimistic.bondTradeTransaction.solAmount + repayParams.optimistic.bondTradeTransaction.feeAmount;
    const now = nowInSeconds();
    const interestSol = calculateCurrentInterestSolPure({
      loanValue: fullLoanBody,
      startTime: repayParams.optimistic.bondTradeTransaction.soldAt,

      currentTime: now,
      rateBasePoints: repayParams.optimistic.bondTradeTransaction.amountOfBonds,
    });
    const amountToReturn = fullLoanBody + interestSol;
    const updatedBond = optimisticRepayFraktBond(repayParams.optimistic.fraktBond, amountToReturn);
    const updatedBondTradeTransaction = optimisticRepayBondTradeTransaction(
      repayParams.optimistic.bondTradeTransaction,
      false,
    )
    const updatedOldBondOffer = repayParams.optimistic.oldBondOffer ? optimisticRepayUpdateBondingBondOffer(repayParams.optimistic.oldBondOffer, fullLoanBody, interestSol, false) : repayParams.optimistic.oldBondOffer

    return { fraktBond: updatedBond, bondTradeTransaction: updatedBondTradeTransaction, oldBondOffer: updatedOldBondOffer };
  });
  return { account: null, instructions, signers, addressesForLookupTable, optimisticResults };
};
