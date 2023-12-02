import { BN, web3 } from '@project-serum/anchor';
import { ASSOCIATED_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@project-serum/anchor/dist/cjs/utils/token';
import { findAssociatedTokenAddress } from '../../../../common';
import { BANX_POINTS_MAP_PREFIX, ENCODER, STAKING_SETTINGS_PREFIX } from '../../../constants';
import { returnAnchorProgram } from '../../../helpers';

type FixBrokenBanxStake = (params: {
    programId: web3.PublicKey;
    connection: web3.Connection;

    addComputeUnits?: boolean;

    args: {
        isLoaned: boolean;
    };

    accounts: {
        userPubkey: web3.PublicKey;
        banxStake: web3.PublicKey;
        frakrBond?: web3.PublicKey;
    };

    sendTxn: (transaction: web3.Transaction, signers: web3.Signer[]) => Promise<void>;
}) => Promise<{
    instructions: web3.TransactionInstruction[];
    signers: web3.Signer[];
    addressesForLookupTable: web3.PublicKey[];
}>;

export const fixBrokenBanxStake: FixBrokenBanxStake = async ({
    programId,
    connection,
    addComputeUnits,
    accounts,
    args,
    sendTxn,
}) => {
    const program = returnAnchorProgram(programId, connection);
    const instructions: web3.TransactionInstruction[] = [];

    const modifyComputeUnits = web3.ComputeBudgetProgram.setComputeUnitLimit({
        units: Math.round(800000 + Math.ceil(Math.random() * 10000)),
    });
    const requestHeap = web3.ComputeBudgetProgram.requestHeapFrame({ bytes: 1024 * 250 });
    instructions.push(requestHeap);

    if (!!addComputeUnits) instructions.push(modifyComputeUnits);

    const accountsIntoInstruction = {
        banxStake: accounts.banxStake,
        user: accounts.userPubkey,
        systemProgram: web3.SystemProgram.programId,
        rent: web3.SYSVAR_RENT_PUBKEY,
    };

    let remainigAccounts;

    if (args.isLoaned) {
        remainigAccounts = [
            {
                pubkey: accounts.frakrBond,
                isSigner: false,
                isWritable: true,
            },
        ];
    }
    else    {
         remainigAccounts = [];
    }


    instructions.push(
        await program.methods
            .fixBrokenBanxStake(args.isLoaned)
            .accountsStrict(accountsIntoInstruction)
            .remainingAccounts(remainigAccounts)
            .instruction(),
    );
    const addressesForLookupTable = [...Object.values(accountsIntoInstruction)];

    const transaction = new web3.Transaction();
    for (let instruction of instructions) transaction.add(instruction);

    const signers = [];
    await sendTxn(transaction, signers);
    return {
        instructions,
        signers,
        addressesForLookupTable,
    };
};
