import {
  BOND_OFFER_VAULT_PREFIX,
  BUBBLEGUM_PROGRAM_ID,
  ENCODER,
  REPAY_FEE_APR,
  SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
  SPL_NOOP_PROGRAM_ID,
} from '../../../../constants';
import { MUTUAL_BOND_TRADE_TXN_VAULT } from '../../../../constants';
import { BondOfferV2, BondTradeTransactionV2, FraktBond } from '../../../../types';
import { CnftParams } from '../../../bond/creation/createBondAndSellToOffersCnft';
import {
  BondAndTransactionOptimistic,
  calculateCurrentInterestSolPure,
  nowInSeconds,
  optimisticRepayBondTradeTransaction,
  optimisticRepayFraktBond,
  optimisticRepayUpdateBondingBondOffer,
} from '../../offer';
import { decode, mapProof, returnAnchorProgram } from './../../../../helpers';
import { BN, web3 } from '@project-serum/anchor';

type RepayCnftPerpetualLoan = (params: {
  programId: web3.PublicKey;
  connection: web3.Connection;

  args: {
    cnftParams: CnftParams;
    proof: any;

    optimistic: {
      oldBondOffer?: BondOfferV2;
       fraktBond: FraktBond;
       bondTradeTransaction: BondTradeTransactionV2;
     };
  };
  addComputeUnits?: boolean;

  accounts: {
    lender: web3.PublicKey;
    bondTradeTransactionV2: web3.PublicKey;
    oldBondOffer: web3.PublicKey;

    fbond: web3.PublicKey;
    protocolFeeReceiver: web3.PublicKey;

    userPubkey: web3.PublicKey;

    tree: web3.PublicKey;
  };

  sendTxn: (transaction: web3.Transaction, signers: web3.Signer[]) => Promise<void>;
}) => Promise<{
  // fbond: web3.PublicKey;
  instructions: web3.TransactionInstruction[];
  signers: web3.Signer[];
  optimisticResults:  {
    oldBondOffer?: BondOfferV2;
     fraktBond: FraktBond;
     bondTradeTransaction: BondTradeTransactionV2;
   }[];
}>;

export const repayCnftPerpetualLoan: RepayCnftPerpetualLoan = async ({
  programId,
  connection,
  args,
  addComputeUnits,
  accounts,
  sendTxn,
}) => {
  const program = returnAnchorProgram(programId, connection);
  const instructions: web3.TransactionInstruction[] = [];

  const [mutualBondTradeTxnVault] = await web3.PublicKey.findProgramAddress(
    [ENCODER.encode(MUTUAL_BOND_TRADE_TXN_VAULT)],
    program.programId,
  );

  const remainingAccounts = [
    {
      pubkey: accounts.bondTradeTransactionV2,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: accounts.lender,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: accounts.fbond,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: accounts.protocolFeeReceiver,
      isSigner: false,
      isWritable: true,
    },
  ];

  const modifyComputeUnits = web3.ComputeBudgetProgram.setComputeUnitLimit({
    units: Math.round(800000 + Math.ceil(Math.random() * 10000)),
  });
  const requestHeap = web3.ComputeBudgetProgram.requestHeapFrame({ bytes: 1024 * 250 });
  instructions.push(requestHeap);

  if (!!addComputeUnits) instructions.push(modifyComputeUnits);

  // const accountsIntoInstruction = {
  //   user: accounts.userPubkey,

  //   mutualBondTradeTxnVault: mutualBondTradeTxnVault,

  //   protocolFeeReceiver: accounts.protocolFeeReceiver,

  //   instructions: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
  //   authorizationRulesProgram: AUTHORIZATION_RULES_PROGRAM,

  //   tokenProgram: TOKEN_PROGRAM_ID,
  //   associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
  //   systemProgram: web3.SystemProgram.programId,
  //   rent: web3.SYSVAR_RENT_PUBKEY,
  //   metadataProgram: METADATA_PROGRAM_PUBKEY,
  // };

  const [treeAuthority, _bump2] = web3.PublicKey.findProgramAddressSync(
    [accounts.tree.toBuffer()],
    BUBBLEGUM_PROGRAM_ID,
  );

  const [oldBondOfferVault, oldBondOfferVaultBump] = await web3.PublicKey.findProgramAddress(
    [
      ENCODER.encode(BOND_OFFER_VAULT_PREFIX),
      accounts.oldBondOffer.toBuffer(),
    ],
    program.programId,
  );

  const proofPathAsAccounts = mapProof(args.proof);

  const root = decode(args.proof.root);
  const dataHash = decode(args.cnftParams.dataHash);
  const creatorHash = decode(args.cnftParams.creatorHash);
  const nonce = new BN(args.cnftParams.leafId);
  const index = args.cnftParams.leafId;
  instructions.push(
    await program.methods
      .repayCnftPerpetualLoan(root, dataHash, creatorHash, nonce, index, proofPathAsAccounts.length)
      .accountsStrict({
        user: accounts.userPubkey,

        mutualBondTradeTxnVault: mutualBondTradeTxnVault,

        systemProgram: web3.SystemProgram.programId,
        rent: web3.SYSVAR_RENT_PUBKEY,

        merkleTree: accounts.tree,
        treeAuthority: treeAuthority,
        bubblegumProgram: BUBBLEGUM_PROGRAM_ID,
        compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
        logWrapper: SPL_NOOP_PROGRAM_ID,
        uninitializedBondOfferV2: accounts.oldBondOffer,
        bondOfferVault: oldBondOfferVault
      })
      .remainingAccounts([...remainingAccounts, ...proofPathAsAccounts])
      .instruction(),
  );

  const transaction = new web3.Transaction();
  for (let instruction of instructions) transaction.add(instruction);

  const signers = [];
  await sendTxn(transaction, signers);

  const fullLoanBody = args.optimistic.bondTradeTransaction.solAmount + args.optimistic.bondTradeTransaction.feeAmount;
  const now = nowInSeconds();
  const interestSol = calculateCurrentInterestSolPure({
    loanValue: fullLoanBody,
    startTime: args.optimistic.bondTradeTransaction.soldAt,

    currentTime: now,
    rateBasePoints: args.optimistic.bondTradeTransaction.amountOfBonds,
  });
  const repayFeeSol = calculateCurrentInterestSolPure({
    loanValue: fullLoanBody,
    startTime: args.optimistic.bondTradeTransaction.soldAt,

    currentTime: now,
    rateBasePoints: REPAY_FEE_APR,
  });
  const amountToReturn = fullLoanBody + interestSol + repayFeeSol;
  const updatedBond = optimisticRepayFraktBond(args.optimistic.fraktBond, amountToReturn);
  const updatedBondTradeTransaction = optimisticRepayBondTradeTransaction(args.optimistic.bondTradeTransaction, false);
  const updatedOldBondOffer = args.optimistic.oldBondOffer ? optimisticRepayUpdateBondingBondOffer(args.optimistic.oldBondOffer, fullLoanBody, interestSol, false) : args.optimistic.oldBondOffer

  const optimisticResult = { fraktBond: updatedBond, bondTradeTransaction: updatedBondTradeTransaction, oldBondOffer: updatedOldBondOffer };

  return {
    instructions,
    signers,
    optimisticResults: [optimisticResult],
  };
};
