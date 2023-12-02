import { BN, web3 } from '@project-serum/anchor';
import {
  BUBBLEGUM_PROGRAM_ID,
  ENCODER,
  SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
  SPL_NOOP_PROGRAM_ID,
} from '../../../constants';
import {
  MUTUAL_BOND_TRADE_TXN_VAULT,
} from '../../../constants';

import {
  returnAnchorProgram,
  decode,
  mapProof,
  getAssetProof,
} from './../../../helpers';
import { CnftParams } from '../creation/createBondAndSellToOffersCnft';

type ClaimNftByLenderCnft = (params: {
  programId: web3.PublicKey;
  connection: web3.Connection;

  addComputeUnits?: boolean;

  args: {
    cnftParams: CnftParams,
  };
  accounts: {
    userPubkey: web3.PublicKey;
    fbond: web3.PublicKey;
    collateralBox: web3.PublicKey;
    bondTradeTransactionV2: web3.PublicKey;
    tree: web3.PublicKey;
    nftMint: web3.PublicKey;
  };

  sendTxn: (transaction: web3.Transaction, signers: web3.Signer[]) => Promise<void>;
}) => Promise<{
  instructions: web3.TransactionInstruction[];
  signers: web3.Signer[];
}>;

export const claimNftByLenderCnft: ClaimNftByLenderCnft = async ({
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

  const [treeAuthority, _bump2] = web3.PublicKey.findProgramAddressSync(
    [accounts.tree.toBuffer()],
    BUBBLEGUM_PROGRAM_ID,
  );

  const proof = await getAssetProof(
    accounts.nftMint,
    connection.rpcEndpoint,
  );
  const proofPathAsAccounts = mapProof(proof);

  const root = decode(proof.root);
  const dataHash = decode(args.cnftParams.dataHash);
  const creatorHash = decode(args.cnftParams.creatorHash);
  const nonce = new BN(args.cnftParams.leafId);
  const index = args.cnftParams.leafId;

  instructions.push(
    await program.methods
      .claimNftByLenderCnft(
        root,
        dataHash,
        creatorHash,
        nonce,
        index,
      )
      .accountsStrict({
        fbond: accounts.fbond,
        user: accounts.userPubkey,
        mutualBondTradeTxnVault: mutualBondTradeTxnVault,
        bondTradeTransactionV2: accounts.bondTradeTransactionV2,
        collateralBox: accounts.collateralBox,

        systemProgram: web3.SystemProgram.programId,
        rent: web3.SYSVAR_RENT_PUBKEY,

        merkleTree: accounts.tree,
        treeAuthority: treeAuthority,
        bubblegumProgram: BUBBLEGUM_PROGRAM_ID,
        compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
        logWrapper: SPL_NOOP_PROGRAM_ID,
      })
      .remainingAccounts(proofPathAsAccounts)
      .instruction(),
  );

  const transaction = new web3.Transaction();
  for (let instruction of instructions) transaction.add(instruction);

  const signers = [];
  await sendTxn(transaction, signers);
  return { instructions, signers };
};
