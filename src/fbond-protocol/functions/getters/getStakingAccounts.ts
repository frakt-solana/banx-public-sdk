import { web3 } from '@project-serum/anchor';
import { anchorRawBNsAndPubkeysToNumsAndStrings } from '../../helpers';
import { returnAnchorProgram } from '../../helpers';
import {
  CollateralBox,
  FraktBond,
  HadoMarketRegistry,
  HadoMarket,
  BondTradeTransactionV2,
  BondOfferV2,
  BanxStake,
  BanxUser,
  Adventure,
  AdventureSubscription,
  StakingSettings,
} from '../../types';

export const getStakingAccounts = async (
  programId: web3.PublicKey,
  connection: web3.Connection,
): Promise<{
  banxStakes: BanxStake[];
  banxUsers: BanxUser[];
  adventures: Adventure[];
  adventureSubscriptions: AdventureSubscription[];
  stakingSettings: StakingSettings;
}> => {
  const program = await returnAnchorProgram(programId, connection);
  const banxStakesRaw = await program.account.banxStake.all();
  const banxStakes = banxStakesRaw.map((acc) => anchorRawBNsAndPubkeysToNumsAndStrings(acc));

  const banxUsers = (await program.account.banxUser.all()).map((raw) => anchorRawBNsAndPubkeysToNumsAndStrings(raw));

  const adventures = (await program.account.adventure.all()).map((raw) => anchorRawBNsAndPubkeysToNumsAndStrings(raw));

  const adventureSubscriptions = (await program.account.adventureSubscription.all()).map((raw) =>
    anchorRawBNsAndPubkeysToNumsAndStrings(raw),
  );

  const stakingSettingsAccounts = (await program.account.stakingSettings.all()).map((raw) =>
    anchorRawBNsAndPubkeysToNumsAndStrings(raw),
  );

  return {
    banxStakes,
    banxUsers,
    adventures,
    adventureSubscriptions,
    stakingSettings: stakingSettingsAccounts[0],
  };
};
