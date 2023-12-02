import { web3, BN } from '@project-serum/anchor';

import { enumToAnchorEnum, returnAnchorProgram } from '../../../helpers';
import {
  EMPTY_PUBKEY,
  ENCODER,
  FEE_PREFIX,
  HADOMARKET_REGISTRY_PREFIX,
  NFTS_OWNER_PREFIX,
  SOL_FUNDS_PREFIX,
} from '../../../constants';
import { MarketState } from '../../../types';

type MakePerpetualMarket = (params: {
  programId: web3.PublicKey;
  connection: web3.Connection;

  args: {
    minBidCap: number;
    minMarketFee: number;
    marketState: MarketState;
  };
  accounts: {
    userPubkey: web3.PublicKey;
    fraktMarket: web3.PublicKey;
    whitelistEntry: web3.PublicKey;
  };

  sendTxn: (transaction: web3.Transaction, signers: web3.Signer[]) => Promise<void>;
}) => Promise<{ account: web3.PublicKey; instructions: web3.TransactionInstruction[]; signers: web3.Signer[] }>;

export const makePerpetualMarket: MakePerpetualMarket = async ({ programId, connection, accounts, args, sendTxn }) => {
  const program = returnAnchorProgram(programId, connection);
  const instructions: web3.TransactionInstruction[] = [];
  const hadoMarket = web3.Keypair.generate();
  const [hadoRegistry, registrySeed] = await web3.PublicKey.findProgramAddress(
    [ENCODER.encode(HADOMARKET_REGISTRY_PREFIX), hadoMarket.publicKey.toBuffer()],
    program.programId,
  );

  instructions.push(
    await program.methods
      .makePerpetualMarket({
        minBidCap: new BN(args.minBidCap),
        minMarketFee: new BN(args.minMarketFee),
        marketState: enumToAnchorEnum(args.marketState),
      })
      .accountsStrict({
        hadoMarket: hadoMarket.publicKey,
        user: accounts.userPubkey,

        hadoRegistry: hadoRegistry,
        fraktMarket: accounts.fraktMarket,

        whitelistEntry: accounts.whitelistEntry,
        systemProgram: web3.SystemProgram.programId,
        rent: web3.SYSVAR_RENT_PUBKEY,
      })
      .instruction(),
  );

  const transaction = new web3.Transaction();
  for (let instruction of instructions) transaction.add(instruction);

  const signers = [hadoMarket];
  await sendTxn(transaction, signers);
  return { account: hadoMarket.publicKey, instructions, signers };
};
