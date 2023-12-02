import { BN, web3 } from '@project-serum/anchor';
import { ENCODER } from '../../../constants';
import {
    BOND_OFFER_PREFIX,
    AUTOCOMPOUND_DEPOSIT_PREFIX,
    COLLATERAL_BOX_PREFIX,
    HADOMARKET_REGISTRY_PREFIX,
} from '../../../constants';
import {
    returnAnchorProgram,
} from './../../../helpers';
import { RepayAccounts } from './repayFbondToTradeTransactions';

type RefinanceFbondByLender = (params: {
    programId: web3.PublicKey;
    connection: web3.Connection;

    args: {
        nextBoxIndex: string;
        repayAccounts: RepayAccounts[];
    };
    addComputeUnits?: boolean;

    accounts: {
        userPubkey: web3.PublicKey;
        fbond: web3.PublicKey;
        adminPubkey: web3.PublicKey;

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

export const refinanceFbondByLender: RefinanceFbondByLender = async ({
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

    const bondOfferSeed = Math.ceil(Math.random() * 1000000);
    const [bondOfferV2] = await web3.PublicKey.findProgramAddress(
        [ENCODER.encode(BOND_OFFER_PREFIX), accounts.userPubkey.toBuffer(), ENCODER.encode(bondOfferSeed.toString())],
        program.programId,
    );

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

    const [bondTradeTransactionV2, bondTradeTransactionV2Bump] = await web3.PublicKey.findProgramAddress(
        [
          ENCODER.encode(AUTOCOMPOUND_DEPOSIT_PREFIX),
          newFbond.publicKey.toBuffer(),
          bondOfferV2.toBuffer(),
          ENCODER.encode('1'),
          ENCODER.encode('1'),
        ],
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

    const modifyComputeUnits = web3.ComputeBudgetProgram.setComputeUnitLimit({
        units: Math.round(800000 + Math.ceil(Math.random() * 10000)),
    });
    const requestHeap = web3.ComputeBudgetProgram.requestHeapFrame({ bytes: 1024 * 250 });
    instructions.push(requestHeap);

    if (!!addComputeUnits) instructions.push(modifyComputeUnits);

    const accountsIntoInstruction = {
        bondOfferV2: bondOfferV2,
        bondTradeTransactionV2: bondTradeTransactionV2,

        collateralBox: collateralBox,
        fbond: accounts.fbond,
        hadoRegistry: hadoRegistry,
        hadoMarket: accounts.hadoMarket,
        user: accounts.userPubkey,
        admin: accounts.adminPubkey,
        newFbond: newFbond.publicKey,
        newCollateralBox: newCollateralBox,
        protocolFeeReceiver: accounts.protocolFeeReceiver,

        systemProgram: web3.SystemProgram.programId,
        rent: web3.SYSVAR_RENT_PUBKEY,
    };

    instructions.push(
        await program.methods
            .refinanceFbondByLender(
                new BN(bondOfferSeed),
            )
            .accountsStrict(accountsIntoInstruction)
            .remainingAccounts(repayRemainingAccounts)
            .instruction(),
    );

    const transaction = new web3.Transaction();
    for (let instruction of instructions) transaction.add(instruction);

    const remainingAccounts = repayRemainingAccounts.map(
        (refinanceRemainingAccount) => refinanceRemainingAccount.pubkey,
      );
    const addressesForLookupTable = [...Object.values(accountsIntoInstruction), ...remainingAccounts];
    const signers = [newFbond];
    await sendTxn(transaction, signers);
    return {
        instructions,
        signers,
        fbond: newFbond.publicKey,
        fbondTokenMint: newFbond.publicKey,
        collateralBox: newCollateralBox,
        addressesForLookupTable,
    };
};
