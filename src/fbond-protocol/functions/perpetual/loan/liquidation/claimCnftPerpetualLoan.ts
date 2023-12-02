import {
  BUBBLEGUM_PROGRAM_ID,
  ENCODER,
  SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
  SPL_NOOP_PROGRAM_ID,
} from '../../../../constants';
import { MUTUAL_BOND_TRADE_TXN_VAULT } from '../../../../constants';
import { BondTradeTransactionV2State, FraktBondState, RedeemResult } from '../../../../types';
import { CnftParams } from '../../../bond/creation/createBondAndSellToOffersCnft';
import { BondAndTransactionOptimistic, nowInSeconds } from '../../offer';
import { decode, mapProof, returnAnchorProgram } from './../../../../helpers';
import { BN, web3 } from '@project-serum/anchor';

type ClaimCnftPerpetualLoan = (params: {
  programId: web3.PublicKey;
  connection: web3.Connection;

  args: {
    cnftParams: CnftParams;
    proof: any;

    optimistic: BondAndTransactionOptimistic;
  };
  addComputeUnits?: boolean;

  accounts: {
    bondTradeTransactionV2: web3.PublicKey;
    fbond: web3.PublicKey;

    bondOffer: web3.PublicKey;

    userPubkey: web3.PublicKey;

    tree: web3.PublicKey;
  };

  sendTxn: (transaction: web3.Transaction, signers: web3.Signer[]) => Promise<void>;
}) => Promise<{
  // fbond: web3.PublicKey;
  instructions: web3.TransactionInstruction[];
  signers: web3.Signer[];
  optimisticResult: BondAndTransactionOptimistic;
}>;

export const claimCnftPerpetualLoan: ClaimCnftPerpetualLoan = async ({
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

  const proofPathAsAccounts = mapProof(args.proof);

  const root = decode(args.proof.root);
  const dataHash = decode(args.cnftParams.dataHash);
  const creatorHash = decode(args.cnftParams.creatorHash);
  const nonce = new BN(args.cnftParams.leafId);
  const index = args.cnftParams.leafId;
  instructions.push(
    await program.methods
      .claimCnftPerpetualLoan(root, dataHash, creatorHash, nonce, index, proofPathAsAccounts.length)
      .accountsStrict({
        bondTradeTransactionV2: accounts.bondTradeTransactionV2,
        fbond: accounts.fbond,
        user: accounts.userPubkey,

        mutualBondTradeTxnVault: mutualBondTradeTxnVault,

        systemProgram: web3.SystemProgram.programId,
        rent: web3.SYSVAR_RENT_PUBKEY,

        merkleTree: accounts.tree,
        treeAuthority: treeAuthority,
        bubblegumProgram: BUBBLEGUM_PROGRAM_ID,
        compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
        logWrapper: SPL_NOOP_PROGRAM_ID,
        uninitializedOldBondOfferV2: accounts.bondOffer,
      })
      .remainingAccounts(proofPathAsAccounts)
      .instruction(),
  );

  const transaction = new web3.Transaction();
  for (let instruction of instructions) transaction.add(instruction);

  const signers = [];
  await sendTxn(transaction, signers);

  const optimisticResult: BondAndTransactionOptimistic = {
    bondTradeTransaction: {
      ...args.optimistic.bondTradeTransaction,
      bondTradeTransactionState: BondTradeTransactionV2State.PerpetualLiquidatedByClaim,
      redeemResult: RedeemResult.Nft,
      redeemedAt: nowInSeconds(),
    },
    fraktBond: {
      ...args.optimistic.fraktBond,
      fraktBondState: FraktBondState.PerpetualLiquidatedByClaim,
      repaidOrLiquidatedAt: nowInSeconds(),
      lastTransactedAt: nowInSeconds(),
    },
  };
  return {
    instructions,
    signers,
    optimisticResult,
  };
};
