import { findAssociatedTokenAddress } from '../../../../common';
import { AUTHORIZATION_RULES_PROGRAM, ENCODER, METADATA_PROGRAM_PUBKEY } from '../../../constants';
import {
  AUTOCOMPOUND_DEPOSIT_PREFIX,
  BOND_PROOGRAM_AUTHORITY_PREFIX,
  COLLATERAL_BOX_PREFIX,
  HADOMARKET_REGISTRY_PREFIX,
  MUTUAL_BOND_TRADE_TXN_VAULT,
  RETURN_FUNDS_OWNER_PREFIX,
} from '../../../constants';
import { findTokenRecordPda, getMetaplexEditionPda, getMetaplexMetadata, returnAnchorProgram } from '../../../helpers';
import { SellBondParamsAndAccounts } from '../repayment';
import { Metadata, TokenRecord, TokenStandard } from '@metaplex-foundation/mpl-token-metadata';
import { BN, web3 } from '@project-serum/anchor';
import { ASSOCIATED_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@project-serum/anchor/dist/cjs/utils/token';

type CreateBondAndSellToOffersWithAdditionalInstuctions = (params: {
  programId: web3.PublicKey;
  connection: web3.Connection;

  args: {
    amountToDeposit: number;
    amountToReturn: number;
    bondDuration: number;
    sellBondParamsAndAccounts: SellBondParamsAndAccounts[];
    additionalInstructions: web3.TransactionInstruction[];
    additionalSigners: web3.Keypair[];
    borrowInstruction: web3.TransactionInstruction;
    repayInstruction: web3.TransactionInstruction;
  };
  addComputeUnits?: boolean;

  accounts: {
    fraktMarket: web3.PublicKey;
    oracleFloor: web3.PublicKey;

    whitelistEntry: web3.PublicKey;
    hadoMarket: web3.PublicKey;

    userPubkey: web3.PublicKey;
    protocolFeeReceiver: web3.PublicKey;
    tokenMint: web3.PublicKey;
  };

  sendTxn: (transaction: web3.Transaction, signers: web3.Signer[]) => Promise<void>;
}) => Promise<{
  fbond: web3.PublicKey;
  fbondTokenMint: web3.PublicKey;
  collateralBox: web3.PublicKey;
  bondProgramAuthority: web3.PublicKey;
  returnFundsOwner: web3.PublicKey;
  userTokenAccount: web3.PublicKey;
  collateralTokenAccount: web3.PublicKey;
  editionInfo: web3.PublicKey;
  nftMetadata: web3.PublicKey;
  ownerTokenRecord: web3.PublicKey;
  destTokenRecord: web3.PublicKey;

  instructions: web3.TransactionInstruction[];
  signers: web3.Signer[];
  addressesForLookupTable: web3.PublicKey[];
}>;

export const createBondAndSellToOffersWithAdditionalInstuctions: CreateBondAndSellToOffersWithAdditionalInstuctions =
  async ({ programId, connection, args, addComputeUnits, accounts, sendTxn }) => {
    const program = returnAnchorProgram(programId, connection);
    const instructions: web3.TransactionInstruction[] = [];
    const fbond = web3.Keypair.generate();

    const [bondProgramAuthority] = await web3.PublicKey.findProgramAddress(
      [ENCODER.encode(BOND_PROOGRAM_AUTHORITY_PREFIX), fbond.publicKey.toBuffer()],
      program.programId,
    );

    const [returnFundsOwner] = await web3.PublicKey.findProgramAddress(
      [ENCODER.encode(RETURN_FUNDS_OWNER_PREFIX), fbond.publicKey.toBuffer()],
      program.programId,
    );

    const [collateralBox] = await web3.PublicKey.findProgramAddress(
      [ENCODER.encode(COLLATERAL_BOX_PREFIX), fbond.publicKey.toBuffer(), ENCODER.encode('0')],
      program.programId,
    );

    const userTokenAccount = await findAssociatedTokenAddress(accounts.userPubkey, accounts.tokenMint);
    const collateralTokenAccount = await findAssociatedTokenAddress(bondProgramAuthority, accounts.tokenMint);
    const editionInfo = getMetaplexEditionPda(accounts.tokenMint);
    const nftMetadata = getMetaplexMetadata(accounts.tokenMint);
    const ownerTokenRecord = findTokenRecordPda(accounts.tokenMint, userTokenAccount);
    const destTokenRecord = findTokenRecordPda(accounts.tokenMint, collateralTokenAccount);
    const meta = await Metadata.fromAccountAddress(connection, nftMetadata);
    const ruleSet = meta.programmableConfig?.ruleSet;
    const tokenRecordData =
      meta.tokenStandard === TokenStandard.ProgrammableNonFungible
        ? await TokenRecord.fromAccountAddress(connection, ownerTokenRecord)
        : { delegate: null };
    const delegatePubkey = tokenRecordData.delegate;

    const [mutualBondTradeTxnVault] = await web3.PublicKey.findProgramAddress(
      [ENCODER.encode(MUTUAL_BOND_TRADE_TXN_VAULT)],
      program.programId,
    );

    const [hadoRegistry, registrySeed] = await web3.PublicKey.findProgramAddress(
      [ENCODER.encode(HADOMARKET_REGISTRY_PREFIX), accounts.hadoMarket.toBuffer()],
      program.programId,
    );

    const sellBondParams = await Promise.all(
      args.sellBondParamsAndAccounts.map(async (sellBondParamsAndAccount) => {
        const [bondTradeTransactionV2, bondTradeTransactionV2Bump] = await web3.PublicKey.findProgramAddress(
          [
            ENCODER.encode(AUTOCOMPOUND_DEPOSIT_PREFIX),
            fbond.publicKey.toBuffer(),
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
              fbond.publicKey.toBuffer(),
              sellBondParamsAndAccount.bondOfferV2.toBuffer(),
              ENCODER.encode(sellBondParamsAndAccount.minAmountToGet.toString()),
              ENCODER.encode(sellBondParamsAndAccount.amountToSell.toString()),
            ],
            program.programId,
          );
          // console.log('bondTradeTransactionV2: ', bondTradeTransactionV2.toBase58());

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
      units: Math.round(1200000),
    });
    const requestHeap = web3.ComputeBudgetProgram.requestHeapFrame({ bytes: 1024 * 250 });
    instructions.push(requestHeap);

    if (!!addComputeUnits) instructions.push(modifyComputeUnits);
    instructions.push(args.borrowInstruction);
    for (let instruction of args.additionalInstructions) instructions.push(instruction);
    const accountsIntoInstruction = {
      fbond: fbond.publicKey,
      bondProgramAuthority: bondProgramAuthority,

      user: accounts.userPubkey,

      hadoRegistry: hadoRegistry,
      // fraktMarket: accounts.fraktMarket,
      hadoMarket: accounts.hadoMarket,

      oracleFloor: accounts.oracleFloor,

      whitelistEntry: accounts.whitelistEntry,
      mutualBondTradeTxnVault: mutualBondTradeTxnVault,

      protocolFeeReceiver: accounts.protocolFeeReceiver,

      collateralBox: collateralBox,
      tokenMint: accounts.tokenMint,
      userTokenAccount: userTokenAccount,
      collateralTokenAccount: collateralTokenAccount,
      ownerTokenRecord,
      destTokenRecord,
      nftMetadata,
      instructions: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
      authorizationRulesProgram: AUTHORIZATION_RULES_PROGRAM,

      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
      systemProgram: web3.SystemProgram.programId,
      rent: web3.SYSVAR_RENT_PUBKEY,
      metadataProgram: METADATA_PROGRAM_PUBKEY,
      editionInfo: editionInfo,
    };

    const remainingAccountsPnft = [
      {
        pubkey: ruleSet || METADATA_PROGRAM_PUBKEY,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: delegatePubkey || METADATA_PROGRAM_PUBKEY,
        isSigner: false,
        isWritable: false,
      },
    ];

    const createAndSellBondRemainingAccounts = [...sellBondRemainingAccounts, ...remainingAccountsPnft];

    instructions.push(
      await program.methods
        .createBondAndSellToOffers(sellBondParams)
        .accountsStrict(accountsIntoInstruction)
        .remainingAccounts(createAndSellBondRemainingAccounts)
        .instruction(),
    );
    const addressesForLookupTable = [
      ...Object.values(accountsIntoInstruction),
      ...Array.from(createAndSellBondRemainingAccounts, (x) => x.pubkey),
    ];
    instructions.push(args.repayInstruction);
    const transaction = new web3.Transaction();
    for (let instruction of instructions) transaction.add(instruction);

    const signers = [...args.additionalSigners, fbond];
    await sendTxn(transaction, signers);
    return {
      fbond: fbond.publicKey,
      fbondTokenMint: fbond.publicKey,
      collateralBox: collateralBox,
      bondProgramAuthority,
      returnFundsOwner,
      userTokenAccount,
      collateralTokenAccount,
      editionInfo,
      nftMetadata,
      ownerTokenRecord,
      destTokenRecord,
      instructions,
      signers,
      addressesForLookupTable,
    };
  };
