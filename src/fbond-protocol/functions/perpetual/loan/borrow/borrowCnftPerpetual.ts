import {
  AUTHORIZATION_RULES_PROGRAM,
  BANX_63_POINTS_HADOMARKET_PUBLIC,
  BANX_POINTS_MAP_PREFIX,
  BASE_POINTS,
  BOND_OFFER_VAULT_PREFIX,
  BUBBLEGUM_PROGRAM_ID,
  ENCODER,
  FRAKT_BOND_PREFIX,
  PERPETUAL_SPONSOR_VAULT,
  PROTOCOL_FEE,
  SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
  SPL_NOOP_PROGRAM_ID,
} from '../../../../constants';
import { AUTOCOMPOUND_DEPOSIT_PREFIX, MUTUAL_BOND_TRADE_TXN_VAULT } from '../../../../constants';
import { BondOfferV2, FraktBondState } from '../../../../types';
import { CnftParams } from '../../../bond/creation/createBondAndSellToOffersCnft';
import {
  BondAndTransactionAndOfferOptimistic,
  checkIsHadomarketSponsored,
  nowInSeconds,
  optimisticBorrowPerpetual,
} from '../../offer';
import { decode, mapProof, returnAnchorProgram } from './../../../../helpers';
import { BN, web3 } from '@project-serum/anchor';
import { hadoMarket } from '../../..';

type BorrowCnftPerpetual = (params: {
  programId: web3.PublicKey;
  connection: web3.Connection;

  args: {
    amountOfSolToGet: number;

    cnftParams: CnftParams;
    proof: any;

    optimistic: {
      fraktMarket: string;
      minMarketFee: number;
      bondOffer: BondOfferV2;
    };
  };
  addComputeUnits?: boolean;

  accounts: {
    bondOfferV2: web3.PublicKey;

    hadoMarket: web3.PublicKey;
    userPubkey: web3.PublicKey;
    protocolFeeReceiver: web3.PublicKey;
    whitelistEntry: web3.PublicKey;

    tree: web3.PublicKey;
    nftMint: web3.PublicKey;
  };

  sendTxn: (transaction: web3.Transaction, signers: web3.Signer[]) => Promise<void>;
}) => Promise<{
  // fbond: web3.PublicKey;
  instructions: web3.TransactionInstruction[];
  signers: web3.Signer[];
  optimisticResults: BondAndTransactionAndOfferOptimistic[];
}>;

export const borrowCnftPerpetual: BorrowCnftPerpetual = async ({
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
  const randomSeedForAccounts = Math.floor(Math.random() * 10000);
  const [fbond, fraktBondBump] = await web3.PublicKey.findProgramAddress(
    [
      ENCODER.encode(FRAKT_BOND_PREFIX),
      accounts.nftMint.toBuffer(),
      accounts.bondOfferV2.toBuffer(),
      ENCODER.encode(randomSeedForAccounts.toString()),
      ENCODER.encode(args.amountOfSolToGet.toString()),
    ],
    program.programId,
  );
  const [bondTradeTransactionV2, bondTradeTransactionV2Bump] = await web3.PublicKey.findProgramAddress(
    [
      ENCODER.encode(AUTOCOMPOUND_DEPOSIT_PREFIX),
      fbond.toBuffer(),
      accounts.bondOfferV2.toBuffer(),
      ENCODER.encode(randomSeedForAccounts.toString()),
      ENCODER.encode(args.amountOfSolToGet.toString()),
    ],
    program.programId,
  );

  const [bondOfferVault, bondOfferVaultBump] = await web3.PublicKey.findProgramAddress(
    [
      ENCODER.encode(BOND_OFFER_VAULT_PREFIX),
      accounts.bondOfferV2.toBuffer(),
    ],
    program.programId,
  );

  const remainingAccounts = [
    {
      pubkey: accounts.hadoMarket,
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

  const [sponsorVault, sponsorVaultBump] = await web3.PublicKey.findProgramAddress(
    [ENCODER.encode(PERPETUAL_SPONSOR_VAULT)],
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
      .borrowCnftPerpetual(
        {
          minAmountToGet: new BN(randomSeedForAccounts),
          amountOfSolToGet: new BN(args.amountOfSolToGet),
          bondTradeTransactionV2Bump: bondTradeTransactionV2Bump,
          fraktBondBump: fraktBondBump,
          bondOfferVaultBump: bondOfferVaultBump
        },
        root,
        dataHash,
        creatorHash,
        nonce,
        index,
        proofPathAsAccounts.length,
      )
      .accountsStrict({
        user: accounts.userPubkey,

        mutualBondTradeTxnVault: mutualBondTradeTxnVault,

        protocolFeeReceiver: accounts.protocolFeeReceiver,

        systemProgram: web3.SystemProgram.programId,
        rent: web3.SYSVAR_RENT_PUBKEY,

        whitelistEntry: accounts.whitelistEntry,
        merkleTree: accounts.tree,
        treeAuthority: treeAuthority,
        bubblegumProgram: BUBBLEGUM_PROGRAM_ID,
        compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
        logWrapper: SPL_NOOP_PROGRAM_ID,
        nftMint: accounts.nftMint,
        sponsorVault: sponsorVault,
        // bondOfferVault: bondOfferVault, //doesnt fit yet
        bondOffer: accounts.bondOfferV2
      })
      .remainingAccounts([...remainingAccounts, ...proofPathAsAccounts])
      .instruction(),
  );

  const transaction = new web3.Transaction();
  for (let instruction of instructions) transaction.add(instruction);

  const signers = [];
  await sendTxn(transaction, signers);

  let inputFee = checkIsHadomarketSponsored(accounts.hadoMarket.toBase58()) ? false : true;

  const protocolFeeAmount = inputFee ? (args.amountOfSolToGet * PROTOCOL_FEE) / BASE_POINTS : 0;

  const borrowedAmountWithoutFee = args.amountOfSolToGet - protocolFeeAmount;
  const newBond = {
    fraktBondState: FraktBondState.PerpetualActive,
    bondTradeTransactionsCounter: 0,
    borrowedAmount: borrowedAmountWithoutFee,
    banxStake: '11111111111111111111111111111111',
    fraktMarket: args.optimistic.fraktMarket,
    amountToReturn: 0,
    actualReturnedAmount: 0,
    terminatedCounter: 0,
    fbondTokenMint: accounts.nftMint.toBase58(),
    fbondTokenSupply: 0,
    activatedAt: nowInSeconds(),
    liquidatingAt: 0,
    fbondIssuer: accounts.userPubkey.toBase58(),
    repaidOrLiquidatedAt: 0,
    currentPerpetualBorrowed: args.amountOfSolToGet,
    lastTransactedAt: nowInSeconds(),
    refinanceAuctionStartedAt: 0,
    hadoMarket: accounts.hadoMarket.toBase58(),

    publicKey: fbond.toBase58(),
  };

  const optimisticResult = optimisticBorrowPerpetual({
    fraktBond: newBond,
    bondTradeTransactionV2: bondTradeTransactionV2.toBase58(),

    bondOffer: args.optimistic.bondOffer,

    userPubkey: accounts.userPubkey.toBase58(),

    amountOfSolToGet: args.amountOfSolToGet,
    minMarketFee: args.optimistic.minMarketFee,
    inputFee,
    isRefinance: false,
    isBorrower: true,
  });

  return {
    instructions,
    signers,
    optimisticResults: [optimisticResult],
  };
};
