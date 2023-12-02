import { anchorRawBNsAndPubkeysToNumsAndStrings } from '../../helpers';
import { returnAnchorProgram } from '../../helpers';
import {
  Adventure,
  AdventureSubscription,
  BanxStake,
  BanxUser,
  BondOfferV2,
  BondTradeTransactionV2,
  CollateralBox,
  FraktBond,
  HadoMarket,
  HadoMarketRegistry,
  StakingSettings,
} from '../../types';
import { getFilteredAccounts, getFilteredAccountsByNumber } from './getAllPerpetualProgramAccounts';
import { web3 } from '@project-serum/anchor';

export const getActiveStakingAccounts = async (
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

  const banxStakeOffset = 8;
  const adventureOffset = 8;
  const adventureSubscriptionsOffset = 104 + 8;

  const [banxStakesRaw, banxUsersRaw, adventuresRaw, adventureSubscriptionsRaw, stakingSettingsRaw] = await Promise.all(
    [
      getFilteredAccounts(program, 'banxStake', banxStakeOffset, [0]),
      program.account.banxUser.all(),
      getFilteredAccounts(program, 'adventure', adventureOffset, [1]),
      // program.account.adventureSubscription.all(),
      getFilteredAccountsByNumber(program, 'adventureSubscription', adventureSubscriptionsOffset, [0]),

      program.account.stakingSettings.all(),
    ],
  );
  // const banxStakesRaw = await program.account.banxStake.all();

  const banxStakes = banxStakesRaw.map((acc) => anchorRawBNsAndPubkeysToNumsAndStrings(acc));
  const banxUsers = banxUsersRaw.map((acc) => anchorRawBNsAndPubkeysToNumsAndStrings(acc));
  const adventures = adventuresRaw.map((acc) => anchorRawBNsAndPubkeysToNumsAndStrings(acc));
  const adventureSubscriptions = adventureSubscriptionsRaw.map((acc) => anchorRawBNsAndPubkeysToNumsAndStrings(acc));
  const stakingSettingsAccounts = stakingSettingsRaw.map((acc) => anchorRawBNsAndPubkeysToNumsAndStrings(acc));

  return {
    banxStakes,
    banxUsers,
    adventures,
    adventureSubscriptions,
    stakingSettings: stakingSettingsAccounts[0],
  };
};
