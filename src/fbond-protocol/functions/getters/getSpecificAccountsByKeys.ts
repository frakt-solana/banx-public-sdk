import { web3 } from '@project-serum/anchor';
import { anchorRawBNsAndPubkeysToNumsAndStrings } from '../../helpers';
import { returnAnchorProgram } from '../../helpers';
// import { anchorRawBNsAndPubkeysToNumsAndStrings, returnAnchorProgram } from '../../helpers';

export const getSpecificAccountsByKeys = async (
  {accountId,
    programId,
    connection,
    publicKeys
  }: {accountId: string,
  programId: web3.PublicKey,
  connection: web3.Connection,
  publicKeys: web3.PublicKey[]}
): Promise<any[]> => {
  const program = await returnAnchorProgram(programId, connection);

  const anyAccountsRaw = await program.account[accountId].fetchMultiple(publicKeys);
  const anyAccounts = anyAccountsRaw.map((anyAccountRaw, idx) => anchorRawBNsAndPubkeysToNumsAndStrings({account: anyAccountRaw, publicKey: publicKeys[idx]}));

  return anyAccounts;
};
