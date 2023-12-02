import { BN, web3 } from '@project-serum/anchor';
import { ENCODER } from '../../../constants';
import {
  AUTOCOMPOUND_DEPOSIT_PREFIX,
  COLLATERAL_BOX_PREFIX,
  HADOMARKET_REGISTRY_PREFIX,
} from '../../../constants';
import {
  returnAnchorProgram,
} from './../../../helpers';
import { RepayAccounts } from './repayFbondToTradeTransactions';

import { SellBondParamsAndAccounts } from './refinanceToBondOffersV2';

type RefinanceToBondOffersV2Cnft = (params: {
  programId: web3.PublicKey;
  connection: web3.Connection;

  args: {
    nextBoxIndex: string;
    sellBondParamsAndAccounts: SellBondParamsAndAccounts[];
    repayAccounts: RepayAccounts[];
  };
  addComputeUnits?: boolean;

  accounts: {
    userPubkey: web3.PublicKey;
    fbond: web3.PublicKey;
    adminPubkey: web3.PublicKey;

    fraktMarket: web3.PublicKey;
    oracleFloor: web3.PublicKey;

    whitelistEntry: web3.PublicKey;
    hadoMarket: web3.PublicKey;

    protocolFeeReceiver: web3.PublicKey;
  };

  sendTxn: (transaction: web3.Transaction, signers: web3.Signer[]) => Promise<void>;
}) => Promise<{
  instructions: web3.TransactionInstruction[];
  signers: web3.Signer[];
  fbond: web3.PublicKey;
  fbondTokenMint: web3.PublicKey;
  collateralBox: web3.PublicKey;
  addressesForLookupTable: web3.PublicKey[];
}>;

export const refinanceToBondOffersV2Cnft: RefinanceToBondOffersV2Cnft = async ({
  programId,
  connection,
  accounts,
  addComputeUnits,
  args,
  sendTxn,
}) => {
  const program = returnAnchorProgram(programId, connection);
  const instructions: web3.TransactionInstruction[] = [];
  const newFbond = web3.Keypair.generate();

  const [collateralBox] = await web3.PublicKey.findProgramAddress(
    [ENCODER.encode(COLLATERAL_BOX_PREFIX), accounts.fbond.toBuffer(), ENCODER.encode(args.nextBoxIndex)],
    program.programId,
  );


  const [newCollateralBox] = await web3.PublicKey.findProgramAddress(
    [ENCODER.encode(COLLATERAL_BOX_PREFIX), newFbond.publicKey.toBuffer(), ENCODER.encode('0')],
    program.programId,
  );

  const [hadoRegistry, registrySeed] = await web3.PublicKey.findProgramAddress(
    [ENCODER.encode(HADOMARKET_REGISTRY_PREFIX), accounts.hadoMarket.toBuffer()],
    program.programId,
  );

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

  const sellBondParams = await Promise.all(
    args.sellBondParamsAndAccounts.map(async (sellBondParamsAndAccount) => {
      const [bondTradeTransactionV2, bondTradeTransactionV2Bump] = await web3.PublicKey.findProgramAddress(
        [
          ENCODER.encode(AUTOCOMPOUND_DEPOSIT_PREFIX),
          newFbond.publicKey.toBuffer(),
          sellBondParamsAndAccount.bondOfferV2.toBuffer(),
          ENCODER.encode(sellBondParamsAndAccount.minAmountToGet.toString()),
          ENCODER.encode(sellBondParamsAndAccount.amountToSell.toString()),
        ],
        program.programId,
      );
      return {
        minAmountToGet: new BN(sellBondParamsAndAccount.minAmountToGet),
        amountToSell: new BN(sellBondParamsAndAccount.amountToSell),
        bondTradeTransactionV2Bump: bondTradeTransactionV2Bump,
      };
    }),
  );

  const sellBondRemainingAccounts = (
    await Promise.all(
      args.sellBondParamsAndAccounts.map(async (sellBondParamsAndAccount) => {
        const [bondTradeTransactionV2, bondTradeTransactionV2Bump] = await web3.PublicKey.findProgramAddress(
          [
            ENCODER.encode(AUTOCOMPOUND_DEPOSIT_PREFIX),
            newFbond.publicKey.toBuffer(),
            sellBondParamsAndAccount.bondOfferV2.toBuffer(),
            ENCODER.encode(sellBondParamsAndAccount.minAmountToGet.toString()),
            ENCODER.encode(sellBondParamsAndAccount.amountToSell.toString()),
          ],
          program.programId,
        );

        return [
          {
            pubkey: sellBondParamsAndAccount.bondOfferV2,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: bondTradeTransactionV2,
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
 
  const refinanceRemainingAccountsRaw = [
    ...sellBondRemainingAccounts,
    ...repayRemainingAccounts,
  ];
  const refinanceRemainingAccounts = refinanceRemainingAccountsRaw.map((remainingAccount, i) => ({
    ...remainingAccount,
    isWritable: refinanceRemainingAccountsRaw.find(
      (remainingAccount2, i2) => remainingAccount.pubkey.toBase58() == remainingAccount2.pubkey.toBase58() && i > i2,
    )
      ? false
      : remainingAccount.isWritable,
  }));

  const accountsIntoInstruction = {
    collateralBox: collateralBox,
    fbond: accounts.fbond,
    admin: accounts.adminPubkey,

    user: accounts.userPubkey,

    newFbond: newFbond.publicKey,
    newCollateralBox: newCollateralBox,

    hadoRegistry: hadoRegistry,

    hadoMarket: accounts.hadoMarket,
    oracleFloor: accounts.oracleFloor,
    whitelistEntry: accounts.whitelistEntry,
    protocolFeeReceiver: accounts.protocolFeeReceiver,

    systemProgram: web3.SystemProgram.programId,
    rent: web3.SYSVAR_RENT_PUBKEY,
  };

  instructions.push(
    await program.methods
      .refinanceToBondOffersV2Cnft(sellBondParams)
      .accountsStrict(accountsIntoInstruction)
      .remainingAccounts(refinanceRemainingAccounts)
      .instruction(),
  );

  const transaction = new web3.Transaction();
  for (let instruction of instructions) transaction.add(instruction);

  const remainingAccounts = refinanceRemainingAccounts.map(
    (refinanceRemainingAccount) => refinanceRemainingAccount.pubkey,
  );

  const addressesForLookupTable = [...Object.values(accountsIntoInstruction), ...remainingAccounts];
  const signers = [newFbond];
  // await sendTxn(transaction, signers);
  return {
    instructions,
    signers,
    fbond: newFbond.publicKey,
    fbondTokenMint: newFbond.publicKey,
    collateralBox: newCollateralBox,
    addressesForLookupTable,
  };
};
