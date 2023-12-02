import { BN, web3 } from '@project-serum/anchor';
import {
  BUBBLEGUM_PROGRAM_ID,
  ENCODER,
  MUTUAL_BOND_TRADE_TXN_VAULT,
  SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
  SPL_NOOP_PROGRAM_ID,
} from '../../../constants';

import { decode, getAssetProof, mapProof, returnAnchorProgram } from './../../../helpers';
import { RepayAccounts } from '../repayment';
import { CnftParams } from '../creation/createBondAndSellToOffersCnft';

type LiquidateBondOnAuctionCnft = (params: {
  programId: web3.PublicKey;
  connection: web3.Connection;

  addComputeUnits?: boolean;

  args: {
    cnftParams: CnftParams;
  };

  accounts: {
    userPubkey: web3.PublicKey;
    fbond: web3.PublicKey;
    collateralBox: web3.PublicKey;
    fraktMarket: web3.PublicKey;
    oracleFloor: web3.PublicKey;
    whitelistEntry: web3.PublicKey;
    admin: web3.PublicKey;
    tree: web3.PublicKey;
    nftMint: web3.PublicKey;

    repayAccounts: RepayAccounts[];
  };

  sendTxn: (transaction: web3.Transaction, signers: web3.Signer[]) => Promise<void>;
}) => Promise<{
  instructions: web3.TransactionInstruction[];
  signers: web3.Signer[];
  addressesForLookupTable: web3.PublicKey[];
}>;

export const liquidateBondOnAuctionCnft: LiquidateBondOnAuctionCnft = async ({
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

  const modifyComputeUnits = web3.ComputeBudgetProgram.setComputeUnitLimit({
    units: Math.round(800000 + Math.ceil(Math.random() * 10000)),
  });
  if (!!addComputeUnits) instructions.push(modifyComputeUnits);

  const repayRemainingAccounts = accounts.repayAccounts
    .map((repayAccount) => {
      return [
        {
          pubkey: repayAccount.bondTradeTransaction,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: repayAccount.user,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: repayAccount.bondOffer,
          isSigner: false,
          isWritable: true,
        },
      ];
    })
    .flat();

  const [treeAuthority, _bump2] = web3.PublicKey.findProgramAddressSync(
    [accounts.tree.toBuffer()],
    BUBBLEGUM_PROGRAM_ID,
  );

  const proof = await getAssetProof(accounts.nftMint, connection.rpcEndpoint);

  const proofPathAsAccounts = mapProof(proof);

  const root = decode(proof.root);
  const dataHash = decode(args.cnftParams.dataHash);
  const creatorHash = decode(args.cnftParams.creatorHash);
  const nonce = new BN(args.cnftParams.leafId);
  const index = args.cnftParams.leafId;

  const liquidateRemainingAccounts = [...repayRemainingAccounts, ...proofPathAsAccounts];

  const accountsIntoInstruction = {
    fbond: accounts.fbond,
    mutualBondTradeTxnVault: mutualBondTradeTxnVault,

    user: accounts.userPubkey,
    collateralBox: accounts.collateralBox,

    fraktMarket: accounts.fraktMarket,
    oracleFloor: accounts.oracleFloor,
    whitelistEntry: accounts.whitelistEntry,

    admin: accounts.admin,

    systemProgram: web3.SystemProgram.programId,
    rent: web3.SYSVAR_RENT_PUBKEY,

    merkleTree: accounts.tree,
    treeAuthority: treeAuthority,
    bubblegumProgram: BUBBLEGUM_PROGRAM_ID,
    compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
    logWrapper: SPL_NOOP_PROGRAM_ID,
  };

  instructions.push(
    await program.methods
      .liquidateBondOnAuctionCnft(new BN(repayRemainingAccounts.length), root, dataHash, creatorHash, nonce, index)
      .accountsStrict(accountsIntoInstruction)
      .remainingAccounts(liquidateRemainingAccounts)
      .instruction(),
  );

  const transaction = new web3.Transaction();
  for (let instruction of instructions) transaction.add(instruction);
  const addressesForLookupTable = [
    ...Object.values(accountsIntoInstruction),
    ...liquidateRemainingAccounts.map((remAccount) => remAccount.pubkey),
  ];

  const signers = [];
  await sendTxn(transaction, signers);
  return { instructions, signers, addressesForLookupTable };
};
