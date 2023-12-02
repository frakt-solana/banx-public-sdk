import { BN, web3 } from '@project-serum/anchor';
import { EMPTY_PUBKEY, ENCODER, MUTUAL_BOND_TRADE_TXN_VAULT, SOL_FUNDS_PREFIX } from '../../../constants';

import { returnAnchorProgram } from '../../../helpers';
import { BondOfferOptimistic, nowInSeconds, optimisticUpdateBondOffer } from './helpers';

type UpdatePerpetualOffer = (params: {
  programId: web3.PublicKey;
  connection: web3.Connection;

  args: {
    loanValue: number;
    amountOfLoans: number;
  };

  accounts: {
    bondOfferV2: web3.PublicKey;
    userPubkey: web3.PublicKey;
  };

  optimistic?: BondOfferOptimistic;

  sendTxn: (transaction: web3.Transaction, signers: web3.Signer[]) => Promise<void>;
}) => Promise<{
  account: null;
  instructions: web3.TransactionInstruction[];
  signers: web3.Signer[];
  optimisticResult?: BondOfferOptimistic;
}>;

export const updatePerpetualOffer: UpdatePerpetualOffer = async ({
  programId,
  connection,
  accounts,
  args,
  optimistic,
  sendTxn,
}) => {
  const program = returnAnchorProgram(programId, connection);
  const instructions: web3.TransactionInstruction[] = [];

  const [mutualBondTradeTxnVault] = await web3.PublicKey.findProgramAddress(
    [ENCODER.encode(MUTUAL_BOND_TRADE_TXN_VAULT)],
    program.programId,
  );

  instructions.push(
    await program.methods
      .updatePerpetualOffer(new BN(args.loanValue), new BN(args.amountOfLoans))
      .accountsStrict({
        bondOfferV2: accounts.bondOfferV2,
        user: accounts.userPubkey,
        mutualBondTradeTxnVault,
        systemProgram: web3.SystemProgram.programId,
        rent: web3.SYSVAR_RENT_PUBKEY,
      })
      .instruction(),
  );
  const transaction = new web3.Transaction();
  for (let instruction of instructions) transaction.add(instruction);

  const signers = [];
  await sendTxn(transaction, signers);
  const optimisticResult: BondOfferOptimistic | undefined = optimistic
    ? {
        bondOffer: optimisticUpdateBondOffer(
          {
            ...optimistic.bondOffer,
            lastTransactedAt: nowInSeconds(),
          },
          args.loanValue,
          args.amountOfLoans,
        ),
      }
    : optimistic;
  return { account: null, instructions, signers, optimisticResult };
};
