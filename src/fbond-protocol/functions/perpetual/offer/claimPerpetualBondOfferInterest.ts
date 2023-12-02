import { BN, web3 } from '@project-serum/anchor';

import { enumToAnchorEnum, returnAnchorProgram } from '../../../helpers';
import { ENCODER, BOND_OFFER_PREFIX, BOND_OFFER_VAULT_PREFIX } from '../../../constants';
import { BondFeatures, BondOfferV2, BondingCurveType, PairType } from '../../../types';
import { BondOfferOptimistic, optimisticClaimBondOfferInterest, optimisticDepositToBondOffer } from './helpers';

type ClaimPerpetualBondOfferInterest = (params: {
  programId: web3.PublicKey;
  connection: web3.Connection;
  optimistic: BondOfferOptimistic;

  accounts: {
    bondOffer: web3.PublicKey;
    userPubkey: web3.PublicKey;
  };

  sendTxn: (transaction: web3.Transaction, signers: web3.Signer[]) => Promise<void>;
}) => Promise<{
  instructions: web3.TransactionInstruction[];
  signers: web3.Signer[];
  optimisticResult: BondOfferOptimistic;
}>;

export const claimPerpetualBondOfferInterest: ClaimPerpetualBondOfferInterest = async ({
  programId,
  connection,
  optimistic,
  accounts,
  sendTxn,
}) => {
  const program = returnAnchorProgram(programId, connection);
  const instructions: web3.TransactionInstruction[] = [];
  const [bondOfferVault, bondOfferVaultBump] = await web3.PublicKey.findProgramAddress(
    [
      ENCODER.encode(BOND_OFFER_VAULT_PREFIX),
      accounts.bondOffer.toBuffer(),
    ],
    program.programId,
  );
  instructions.push(
    await program.methods
      .claimPerpetualBondOfferInterest()
      .accountsStrict({
          bondOfferV2: accounts.bondOffer,
          bondOfferVault,
          user: accounts.userPubkey,
          systemProgram: web3.SystemProgram.programId,
          rent: web3.SYSVAR_RENT_PUBKEY,
      })
      .instruction(),
  );
  
  const transaction = new web3.Transaction();
  for (let instruction of instructions) transaction.add(instruction);

  const signers = [];
  await sendTxn(transaction, signers);

  const optimisticBondOffer = optimisticClaimBondOfferInterest(optimistic.bondOffer);

  return {
    instructions,
    signers,
    optimisticResult: {
      bondOffer: optimisticBondOffer,
    },
  };
};

