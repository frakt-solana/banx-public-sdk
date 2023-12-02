import { findAssociatedTokenAddress } from '../../../../../common';
import {
  AUTHORIZATION_RULES_PROGRAM,
  BOND_OFFER_VAULT_PREFIX,
  ENCODER,
  METADATA_PROGRAM_PUBKEY,
  MUTUAL_BOND_TRADE_TXN_VAULT,
  REPAY_FEE_APR,
} from '../../../../constants';
import {
  findTokenRecordPda,
  getMetaplexEditionPda,
  getMetaplexMetadata,
  returnAnchorProgram,
} from '../../../../helpers';
import {
  BondAndTransactionOptimistic,
  calculateCurrentInterestSolPure,
  nowInSeconds,
  optimisticRepayBondTradeTransaction,
  optimisticRepayFraktBond,
  optimisticRepayUpdateBondingBondOffer,
} from '../../offer';
import { web3 } from '@project-serum/anchor';
import { ASSOCIATED_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@project-serum/anchor/dist/cjs/utils/token';
import { BondOfferV2, BondTradeTransactionV2, FraktBond } from '../../../../types';

export interface RepayAccounts {
  bondTradeTransaction: web3.PublicKey;
  lender: web3.PublicKey;

  fbond: web3.PublicKey;

  ruleSet?: web3.PublicKey;

  collateralTokenMint: web3.PublicKey;

  optimistic: {
    oldBondOffer?: BondOfferV2;
    fraktBond: FraktBond;
    bondTradeTransaction: BondTradeTransactionV2;
  };
}

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

export const repayPerpetualLoan: RepayPerpetualLoan = async ({
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

  // let uninitialized_token_mint: &AccountInfo = remaining_repay_accounts.next().unwrap();

  // let edition_info: &AccountInfo = remaining_repay_accounts.next().unwrap();
  // let nft_metadata: &AccountInfo = remaining_repay_accounts.next().unwrap();

  // let dest_token_record: &AccountInfo = remaining_repay_accounts.next().unwrap();

  // let auth_rules: Option<&AccountInfo<'_>> = remaining_repay_accounts.next();

  // let uninitialized_user_token_account: &AccountInfo =
  //     remaining_repay_accounts.next().unwrap();
  // let uninitialized_bond_trade_transaction_v2: &AccountInfo =
  //     remaining_repay_accounts.next().unwrap();
  // let uninitialized_lender: &AccountInfo = remaining_repay_accounts.next().unwrap();

  // let uninitialized_frakt_bond: &AccountInfo = remaining_repay_accounts.next().unwrap();
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
        const userTokenAccount = await findAssociatedTokenAddress(
          accounts.userPubkey,
          repayAccount.collateralTokenMint,
        );
        // const collateralTokenAccount = await findAssociatedTokenAddress(bondProgramAuthority, accounts.collateralTokenMint);
        const editionInfo = getMetaplexEditionPda(repayAccount.collateralTokenMint);
        const nftMetadata = getMetaplexMetadata(repayAccount.collateralTokenMint);
        // const ownerTokenRecord = findTokenRecordPda(
        //   repayAccount.collateralTokenMint,
        //   repayAccount.collateralTokenAccount,
        // );
        const destTokenRecord = findTokenRecordPda(repayAccount.collateralTokenMint, userTokenAccount);
        const ruleSet = repayAccount.ruleSet;

        return [
          {
            pubkey: repayAccount.collateralTokenMint,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: editionInfo,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: nftMetadata,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: destTokenRecord,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: ruleSet || destTokenRecord,
            isSigner: false,
            isWritable: true,
          },

          {
            pubkey: userTokenAccount,
            isSigner: false,
            isWritable: true,
          },
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
      .repayPerpetualLoan()
      .accountsStrict({
        mutualBondTradeTxnVault: mutualBondTradeTxnVault,

        user: accounts.userPubkey,

        systemProgram: web3.SystemProgram.programId,
        rent: web3.SYSVAR_RENT_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_PROGRAM_ID,

        metadataProgram: METADATA_PROGRAM_PUBKEY,
        instructions: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
        authorizationRulesProgram: AUTHORIZATION_RULES_PROGRAM,
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
    const repayFeeSol = calculateCurrentInterestSolPure({
      loanValue: fullLoanBody,
      startTime: repayParams.optimistic.bondTradeTransaction.soldAt,
  
      currentTime: now,
      rateBasePoints: REPAY_FEE_APR
    });
    const amountToReturn = fullLoanBody + interestSol + repayFeeSol;
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
