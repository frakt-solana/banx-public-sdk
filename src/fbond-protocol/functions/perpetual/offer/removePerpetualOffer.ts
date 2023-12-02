import { BOND_OFFER_VAULT_PREFIX, ENCODER, MUTUAL_BOND_TRADE_TXN_VAULT } from '../../../constants';
import { returnAnchorProgram } from '../../../helpers';
import { BondOfferV2, PairState } from '../../../types';
import { optimisticUpdateBondOfferBonding } from './amm_helpers';
import {
  BondOfferOptimistic,
  nowInSeconds,
  optimisticUpdateBondOffer,
  optimisticWithdrawFromBondOffer,
} from './helpers';
import { web3 } from '@project-serum/anchor';

type RemovePerpetualOffer = (params: {
  programId: web3.PublicKey;
  connection: web3.Connection;

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

export const removePerpetualOffer: RemovePerpetualOffer = async ({
  programId,
  connection,
  accounts,
  optimistic,
  sendTxn,
}) => {
  const program = returnAnchorProgram(programId, connection);
  const instructions: web3.TransactionInstruction[] = [];

  const [mutualBondTradeTxnVault] = await web3.PublicKey.findProgramAddress(
    [ENCODER.encode(MUTUAL_BOND_TRADE_TXN_VAULT)],
    program.programId,
  );

  const [bondOfferVault, bondOfferVaultBump] = await web3.PublicKey.findProgramAddress(
    [ENCODER.encode(BOND_OFFER_VAULT_PREFIX), accounts.bondOfferV2.toBuffer()],
    program.programId,
  );

  instructions.push(
    await program.methods
      .removePerpetualOffer()
      .accountsStrict({
        bondOfferV2: accounts.bondOfferV2,
        user: accounts.userPubkey,
        systemProgram: web3.SystemProgram.programId,
        rent: web3.SYSVAR_RENT_PUBKEY,
        mutualBondTradeTxnVault,
        bondOfferVault,
      })
      .instruction(),
  );

  const transaction = new web3.Transaction();
  for (let instruction of instructions) transaction.add(instruction);

  const signers = [];
  await sendTxn(transaction, signers);
  const optimisticResult = optimistic
    ? {
        bondOffer:
          optimistic.bondOffer.pairState === PairState.PerpetualOnMarket
            ? optimisticWithdrawFromBondOffer(
                { ...optimistic.bondOffer, pairState: PairState.PerpetualClosed, lastTransactedAt: nowInSeconds() },
                optimistic.bondOffer.fundsSolOrTokenBalance,
              )
            : optimisticUpdateBondOfferBonding({
                bondOffer: {
                  ...optimistic.bondOffer,
                  pairState: PairState.PerpetualBondingCurveClosed,
                  lastTransactedAt: nowInSeconds(),
                  concentrationIndex: 0,
                },
                newDelta: 0,
                newLoanValue: 0,
                newQuantityOfLoans: 0,
              }),
      }
    : optimistic;
  return { account: null, instructions, signers, optimisticResult };
};
