import { BN, web3 } from '@project-serum/anchor';
import { BOND_OFFER_VAULT_PREFIX, EMPTY_PUBKEY, ENCODER, MUTUAL_BOND_TRADE_TXN_VAULT, SOL_FUNDS_PREFIX } from '../../../constants';

import { returnAnchorProgram } from '../../../helpers';
import { BondOfferOptimistic, nowInSeconds, optimisticUpdateBondOffer } from './helpers';
import { optimisticUpdateBondOfferBonding } from './amm_helpers';

type UpdatePerpetualOfferBonding = (params: {
  programId: web3.PublicKey;
  connection: web3.Connection;

  args: {
    loanValue: number;
    quantityOfLoans: number;
    delta: number;
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

export const updatePerpetualOfferBonding: UpdatePerpetualOfferBonding = async ({
  programId,
  connection,
  accounts,
  args,
  optimistic,
  sendTxn,
}) => {
  const program = returnAnchorProgram(programId, connection);
  const instructions: web3.TransactionInstruction[] = [];

  const [bondOfferVault, bondOfferVaultBump] = await web3.PublicKey.findProgramAddress(
    [
      ENCODER.encode(BOND_OFFER_VAULT_PREFIX),
      accounts.bondOfferV2.toBuffer(),
    ],
    program.programId,
  );

  instructions.push(
    await program.methods
      .updatePerpetualOfferBonding( new BN(args.loanValue), new BN(args.quantityOfLoans), new BN(args.delta))
      .accountsStrict({
        bondOfferV2: accounts.bondOfferV2,
        user: accounts.userPubkey,
        bondOfferVault,
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
        bondOffer: optimisticUpdateBondOfferBonding(
          {
            bondOffer: { ...optimistic.bondOffer,
            lastTransactedAt: nowInSeconds(),},
            newDelta: args.delta,
            newLoanValue: args.loanValue,
            newQuantityOfLoans: args.quantityOfLoans,
          },
         
        ),
      }
    : optimistic;
  return { account: null, instructions, signers, optimisticResult };
};
