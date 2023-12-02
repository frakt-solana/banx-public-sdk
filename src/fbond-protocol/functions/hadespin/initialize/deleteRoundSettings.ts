import { web3, BN } from '@project-serum/anchor';
import { returnAnchorProgram } from '../../../helpers';
import { ENCODER, ROUND_SETTING_PREFIX } from '../../../constants';

type DeleteRoundSettings = (params: {
    programId: web3.PublicKey;
    connection: web3.Connection;
    accounts: {
        userPubkey: web3.PublicKey;
    };

    sendTxn: (transaction: web3.Transaction, signers: web3.Signer[]) => Promise<void>;
}) => Promise<{ account: web3.PublicKey; instructions: web3.TransactionInstruction[]; signers: web3.Signer[] }>;

export const deleteRoundSettings: DeleteRoundSettings = async ({
    programId,
    connection,
    accounts,
    sendTxn,
}) => {
    const program = returnAnchorProgram(programId, connection);
    const instructions: web3.TransactionInstruction[] = [];
    const [roundSettings] = await web3.PublicKey.findProgramAddress(
        [ENCODER.encode(ROUND_SETTING_PREFIX)],
        program.programId,
      );
      
    instructions.push(
        await program.methods
            .deleteRoundSettings()
            .accountsStrict({
                systemProgram: web3.SystemProgram.programId,
                rent: web3.SYSVAR_RENT_PUBKEY,
                user: accounts.userPubkey,
                roundSetting: roundSettings,
            })
            .instruction(),
    );

    const transaction = new web3.Transaction();
    for (let instruction of instructions) transaction.add(instruction);

    const signers = [];
    await sendTxn(transaction, signers);
    return { account: roundSettings, instructions, signers };
};
