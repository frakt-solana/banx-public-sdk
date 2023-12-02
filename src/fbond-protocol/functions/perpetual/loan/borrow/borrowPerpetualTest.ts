import { BN, web3 } from '@project-serum/anchor';
import { ASSOCIATED_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@project-serum/anchor/dist/cjs/utils/token';
import { findAssociatedTokenAddress } from '../../../../../common';
import {
  AUTHORIZATION_RULES_PROGRAM,
  BANX_63_POINTS_HADOMARKET_PRIVATE,
  BANX_63_POINTS_HADOMARKET_PUBLIC,
  BANX_POINTS_MAP_PREFIX,
  BASE_POINTS,
  BOND_OFFER_VAULT_PREFIX,
  ENCODER,
  FRAKT_BOND_PREFIX,
  METADATA_PROGRAM_PUBKEY,
  PROTOCOL_FEE,
} from '../../../../constants';
import {
  BOND_PROOGRAM_AUTHORITY_PREFIX,
  RETURN_FUNDS_OWNER_PREFIX,
  COLLATERAL_BOX_PREFIX,
  MUTUAL_BOND_TRADE_TXN_VAULT,
  HADOMARKET_REGISTRY_PREFIX,
  AUTOCOMPOUND_DEPOSIT_PREFIX,
} from '../../../../constants';
import { Metadata, TokenRecord, TokenStandard } from '@metaplex-foundation/mpl-token-metadata';

import {
  anchorRawBNsAndPubkeysToNumsAndStrings,
  findTokenRecordPda,
  getMetaplexEditionPda,
  getMetaplexMetadata,
  getMetaplexMetadataPda,
  returnAnchorProgram,
} from '../../../../helpers';
import {
  BondAndTransactionAndOfferOptimistic,
  HadoMarketAndOfferOptimistic,
  nowInSeconds,
  optimisticBorrowPerpetual,
  optimisticInitializeBondTradeTransaction,
  optimisticWithdrawFromBondOffer,
} from '../../offer';
import {
  BondOfferV2,
  BondTradeTransactionV2State,
  BondTradeTransactionV2Type,
  FraktBondState,
  RedeemResult,
} from '../../../../types'; 
import { borrowPerpetualParamsAndAccounts } from './borrowPerpetual';

type BorrowPerpetual = (params: {
  programId: web3.PublicKey;
  connection: web3.Connection;

  args: {
    perpetualBorrowParamsAndAccounts: borrowPerpetualParamsAndAccounts[];
  };
  addComputeUnits?: boolean;

  accounts: {
    userPubkey: web3.PublicKey;
    protocolFeeReceiver: web3.PublicKey;
  };

  sendTxn: (transaction: web3.Transaction, signers: web3.Signer[]) => Promise<void>;
}) => Promise<{
  // fbond: web3.PublicKey;
  instructions: web3.TransactionInstruction[];
  signers: web3.Signer[];
  optimisticResults: BondAndTransactionAndOfferOptimistic[];
}>;

export const borrowPerpetualTest: BorrowPerpetual = async ({
  programId,
  connection,
  args,
  addComputeUnits,
  accounts,
  sendTxn,
}) => {
  const program = returnAnchorProgram(programId, connection);
  const instructions: web3.TransactionInstruction[] = [];

  const [mutualBondTradeTxnVault] = web3.PublicKey.findProgramAddressSync(
    [ENCODER.encode(MUTUAL_BOND_TRADE_TXN_VAULT)],
    program.programId,
  );

  const perpetualBorrowParamsAndAccountsWithSeeds = args.perpetualBorrowParamsAndAccounts.map((param) => ({
    ...param,
    minAmountToGet: Math.floor(Math.random() * 10000),
  }));
  const perpetualBorrowParams = await Promise.all(
    perpetualBorrowParamsAndAccountsWithSeeds.map(async (perpetualBorrowParamsAndAccount) => {
      const [fbond, fraktBondBump] = web3.PublicKey.findProgramAddressSync(
        [
          ENCODER.encode(FRAKT_BOND_PREFIX),
          perpetualBorrowParamsAndAccount.tokenMint.toBuffer(),
          perpetualBorrowParamsAndAccount.bondOfferV2.toBuffer(),
          ENCODER.encode(perpetualBorrowParamsAndAccount.minAmountToGet.toString()),
          ENCODER.encode(perpetualBorrowParamsAndAccount.amountOfSolToGet.toString()),
        ],
        program.programId,
      );
      const [, bondTradeTransactionV2Bump] = web3.PublicKey.findProgramAddressSync(
        [
          ENCODER.encode(AUTOCOMPOUND_DEPOSIT_PREFIX),
          fbond.toBuffer(),
          perpetualBorrowParamsAndAccount.bondOfferV2.toBuffer(),
          ENCODER.encode(perpetualBorrowParamsAndAccount.minAmountToGet.toString()),
          ENCODER.encode(perpetualBorrowParamsAndAccount.amountOfSolToGet.toString()),
        ],
        program.programId,
      );
      
      const [bondOfferVault, bondOfferVaultBump] = await web3.PublicKey.findProgramAddress(
        [
          ENCODER.encode(BOND_OFFER_VAULT_PREFIX),
          perpetualBorrowParamsAndAccount.bondOfferV2.toBuffer(),
        ],
        program.programId,
      );

      return {
        minAmountToGet: new BN(perpetualBorrowParamsAndAccount.minAmountToGet),
        amountOfSolToGet: new BN(perpetualBorrowParamsAndAccount.amountOfSolToGet),
        bondTradeTransactionV2Bump: bondTradeTransactionV2Bump,
        fraktBondBump: fraktBondBump,
        bondOfferVaultBump: bondOfferVaultBump
      };
    }),
  );

  const sellBondRemainingAccounts = (
    await Promise.all(
      perpetualBorrowParamsAndAccountsWithSeeds.map(async (perpetualBorrowParamsAndAccount) => {
        const [fbond] = web3.PublicKey.findProgramAddressSync(
          [
            ENCODER.encode(FRAKT_BOND_PREFIX),
            perpetualBorrowParamsAndAccount.tokenMint.toBuffer(),
            perpetualBorrowParamsAndAccount.bondOfferV2.toBuffer(),
            ENCODER.encode(perpetualBorrowParamsAndAccount.minAmountToGet.toString()),
            ENCODER.encode(perpetualBorrowParamsAndAccount.amountOfSolToGet.toString()),
          ],
          program.programId,
        );
        const [bondTradeTransactionV2] = web3.PublicKey.findProgramAddressSync(
          [
            ENCODER.encode(AUTOCOMPOUND_DEPOSIT_PREFIX),
            fbond.toBuffer(),
            perpetualBorrowParamsAndAccount.bondOfferV2.toBuffer(),
            ENCODER.encode(perpetualBorrowParamsAndAccount.minAmountToGet.toString()),
            ENCODER.encode(perpetualBorrowParamsAndAccount.amountOfSolToGet.toString()),
          ],
          program.programId,
        );

        const [bondOfferVault, bondOfferVaultBump] = await web3.PublicKey.findProgramAddress(
          [
            ENCODER.encode(BOND_OFFER_VAULT_PREFIX),
            perpetualBorrowParamsAndAccount.bondOfferV2.toBuffer(),
          ],
          program.programId,
        );

        const subRemainingAccounts = [
          
          {
            pubkey: perpetualBorrowParamsAndAccount.tokenMint,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: perpetualBorrowParamsAndAccount.hadoMarket,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: perpetualBorrowParamsAndAccount.bondOfferV2,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: bondOfferVault,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: bondTradeTransactionV2,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: fbond,
            isSigner: false,
            isWritable: true,
          },
        ];

        if (perpetualBorrowParamsAndAccount.hadoMarket.toString() == BANX_63_POINTS_HADOMARKET_PUBLIC
        || perpetualBorrowParamsAndAccount.hadoMarket.toString() == BANX_63_POINTS_HADOMARKET_PRIVATE) {
          const [banxPointsMap] = await web3.PublicKey.findProgramAddress(
            [ENCODER.encode(BANX_POINTS_MAP_PREFIX), perpetualBorrowParamsAndAccount.tokenMint.toBuffer()],
            program.programId,
          );
      
          subRemainingAccounts.push(
          {
            pubkey: banxPointsMap,
            isSigner: false,
            isWritable: true,
          }
          );
        }

        return subRemainingAccounts;
      }),
    )
  ).flat();

  const modifyComputeUnits = web3.ComputeBudgetProgram.setComputeUnitLimit({
    units: Math.round(800000 + Math.ceil(Math.random() * 10000)),
  });
  const requestHeap = web3.ComputeBudgetProgram.requestHeapFrame({ bytes: 1024 * 250 });
  instructions.push(requestHeap);

  if (!!addComputeUnits) instructions.push(modifyComputeUnits);

  const accountsIntoInstruction = {
    user: accounts.userPubkey,

    mutualBondTradeTxnVault: mutualBondTradeTxnVault,

    protocolFeeReceiver: accounts.protocolFeeReceiver,

    instructions: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
    authorizationRulesProgram: AUTHORIZATION_RULES_PROGRAM,

    tokenProgram: TOKEN_PROGRAM_ID,
    associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
    systemProgram: web3.SystemProgram.programId,
    rent: web3.SYSVAR_RENT_PUBKEY,
    metadataProgram: METADATA_PROGRAM_PUBKEY,
  };

  const createAndSellBondRemainingAccounts = [...sellBondRemainingAccounts];

  instructions.push(
    await program.methods
      .borrowPerpetualTest(perpetualBorrowParams)
      .accountsStrict(accountsIntoInstruction)
      .remainingAccounts(createAndSellBondRemainingAccounts)
      .instruction(),
  );

  const transaction = new web3.Transaction();
  for (let instruction of instructions) transaction.add(instruction);

  const signers = [];
  await sendTxn(transaction, signers);

  const optimisticResults: BondAndTransactionAndOfferOptimistic[] = await Promise.all(
    perpetualBorrowParamsAndAccountsWithSeeds.map(async (borrowParam) => {
      const [fbond] = web3.PublicKey.findProgramAddressSync(
        [
          ENCODER.encode(FRAKT_BOND_PREFIX),
          borrowParam.tokenMint.toBuffer(),
          borrowParam.bondOfferV2.toBuffer(),
          ENCODER.encode(borrowParam.minAmountToGet.toString()),
          ENCODER.encode(borrowParam.amountOfSolToGet.toString()),
        ],
        program.programId,
      );
      const [bondTradeTransactionV2] = web3.PublicKey.findProgramAddressSync(
        [
          ENCODER.encode(AUTOCOMPOUND_DEPOSIT_PREFIX),
          fbond.toBuffer(),
          borrowParam.bondOfferV2.toBuffer(),
          ENCODER.encode(borrowParam.minAmountToGet.toString()),
          ENCODER.encode(borrowParam.amountOfSolToGet.toString()),
        ],
        program.programId,
      );

      const protocolFeeAmount = (borrowParam.amountOfSolToGet * PROTOCOL_FEE) / BASE_POINTS;

      const borrowedAmountWithoutFee = borrowParam.amountOfSolToGet - protocolFeeAmount;
      const newBond = {
        fraktBondState: FraktBondState.PerpetualActive,
        bondTradeTransactionsCounter: 0,
        borrowedAmount: borrowedAmountWithoutFee,
        banxStake: '11111111111111111111111111111111',
        fraktMarket: borrowParam.optimistic.fraktMarket,
        amountToReturn: 0,
        actualReturnedAmount: 0,
        terminatedCounter: 0,
        fbondTokenMint: borrowParam.tokenMint.toBase58(),
        fbondTokenSupply: 0,
        activatedAt: nowInSeconds(),
        liquidatingAt: 0,
        fbondIssuer: accounts.userPubkey.toBase58(),
        repaidOrLiquidatedAt: 0,
        currentPerpetualBorrowed: borrowParam.amountOfSolToGet,
        lastTransactedAt: nowInSeconds(),
        refinanceAuctionStartedAt: 0,
        hadoMarket: borrowParam.hadoMarket.toBase58(),
        publicKey: fbond.toBase58(),
      };

      return optimisticBorrowPerpetual({
        fraktBond: newBond,
        bondTradeTransactionV2: bondTradeTransactionV2.toBase58(),

        bondOffer: borrowParam.optimistic.bondOffer,

        userPubkey: accounts.userPubkey.toBase58(),

        amountOfSolToGet: borrowParam.amountOfSolToGet,
        minMarketFee: borrowParam.optimistic.minMarketFee,
        inputFee: true,
        isRefinance: false,
        isBorrower: true
      });
    }),
  );
  return {
    instructions,
    signers,
    optimisticResults,
  };
};
