import { BN, web3 } from '@project-serum/anchor';
import {
  ENCODER,
  COLLATERAL_BOX_PREFIX,
  MUTUAL_BOND_TRADE_TXN_VAULT,
  BUBBLEGUM_PROGRAM_ID,
  SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
  SPL_NOOP_PROGRAM_ID,
} from '../../../constants';
import { mapProof, decode, getAssetProof } from '../../../helpers';
import { returnAnchorProgram } from '../../../helpers';
import { RepayAccounts } from './repayFbondToTradeTransactions';
import { CnftParams } from '../creation/createBondAndSellToOffersCnft';

type RepayFbondToTradeTransactionsCnft = (params: {
  programId: web3.PublicKey;
  connection: web3.Connection;

  args: {
    repayAccounts: RepayAccounts[];
    cnftParams: CnftParams;
  };
  addComputeUnits?: boolean;

  accounts: {
    fbond: web3.PublicKey;

    collateralTokenMint: web3.PublicKey;
    collateralTokenAccount: web3.PublicKey;

    userPubkey: web3.PublicKey;
    admin: web3.PublicKey;
    tree: web3.PublicKey;
  };

  sendTxn: (transaction: web3.Transaction, signers: web3.Signer[]) => Promise<void>;
}) => Promise<{
  account: web3.PublicKey | null;
  instructions: web3.TransactionInstruction[];
  signers: web3.Signer[];
  addressesForLookupTable: web3.PublicKey[];
}>;

export const repayFbondToTradeTransactionsCnft: RepayFbondToTradeTransactionsCnft = async ({
  programId,
  connection,
  args,
  accounts,
  addComputeUnits,
  sendTxn,
}) => {
  const program = returnAnchorProgram(programId, connection);
  const instructions: web3.TransactionInstruction[] = [];

  const [collateralBox] = await web3.PublicKey.findProgramAddress(
    [ENCODER.encode(COLLATERAL_BOX_PREFIX), accounts.fbond.toBuffer(), ENCODER.encode('0')],
    program.programId,
  );
  const [mutualBondTradeTxnVault] = await web3.PublicKey.findProgramAddress(
    [ENCODER.encode(MUTUAL_BOND_TRADE_TXN_VAULT)],
    program.programId,
  );

  const [treeAuthority, _bump2] = web3.PublicKey.findProgramAddressSync(
    [accounts.tree.toBuffer()],
    BUBBLEGUM_PROGRAM_ID,
  );

  const proof = await getAssetProof(accounts.collateralTokenMint, connection.rpcEndpoint);
  const proofPathAsAccounts = mapProof(proof);

  const root = decode(proof.root);
  const dataHash = decode(args.cnftParams.dataHash);
  const creatorHash = decode(args.cnftParams.creatorHash);
  const nonce = new BN(args.cnftParams.leafId);
  const index = args.cnftParams.leafId;

  const repayRemainingAccounts = args.repayAccounts
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

  const modifyComputeUnits = web3.ComputeBudgetProgram.setComputeUnitLimit({
    units: Math.round(800000 + Math.ceil(Math.random() * 10000)),
  });
  const requestHeap = web3.ComputeBudgetProgram.requestHeapFrame({ bytes: 1024 * 250 });
  instructions.push(requestHeap);

  if (!!addComputeUnits) instructions.push(modifyComputeUnits);
  const accountsIntoInstruction = {
    collateralBox: collateralBox,
    fbond: accounts.fbond,
    mutualBondTradeTxnVault: mutualBondTradeTxnVault,

    user: accounts.userPubkey,

    systemProgram: web3.SystemProgram.programId,
    rent: web3.SYSVAR_RENT_PUBKEY,

    admin: accounts.admin,

    merkleTree: accounts.tree,
    treeAuthority: treeAuthority,
    bubblegumProgram: BUBBLEGUM_PROGRAM_ID,
    compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
    logWrapper: SPL_NOOP_PROGRAM_ID,
  };

  // console.log(
  //   'accounts: ',
  //   anchorRawBNsAndPubkeysToNumsAndStrings({ publicKey: hadoRegistry, account: accountsIntoInstruction }),
  // );
  const repayAndProofRemainingAccounts = [...repayRemainingAccounts, ...proofPathAsAccounts];

  instructions.push(
    await program.methods
      .repayFbondToTradeTransactionsCnft(root, dataHash, creatorHash, nonce, index, proofPathAsAccounts.length)
      .accountsStrict(accountsIntoInstruction)
      .remainingAccounts([...repayAndProofRemainingAccounts])
      .instruction(),
  );
  const transaction = new web3.Transaction();
  for (let instruction of instructions) transaction.add(instruction);
  const remainingAccounts = [
    ...repayAndProofRemainingAccounts.map((sellBondRemainingAccount) => sellBondRemainingAccount.pubkey),
  ];

  const addressesForLookupTable = [...Object.values(accountsIntoInstruction), ...remainingAccounts];
  const signers = [];
  await sendTxn(transaction, signers);
  return { account: null, instructions, signers, addressesForLookupTable };
};
