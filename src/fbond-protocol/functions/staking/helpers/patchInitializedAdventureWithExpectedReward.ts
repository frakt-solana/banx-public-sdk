import { Adventure } from '../../../types';

type PatchInitializedAdventureWithExpectedReward = (params: {
  adventure: Adventure;
  lowerRewardsLimit: number;
  upperRewardsLimit: number;
}) => Promise<Adventure>;

export const patchInitializedAdventureWithExpectedReward: PatchInitializedAdventureWithExpectedReward = async ({
  adventure,
  lowerRewardsLimit,
  upperRewardsLimit,
}) => {
  const rewardsToBeDistributed = Math.min(Math.max(adventure.totalPeriodRevenue, lowerRewardsLimit), upperRewardsLimit);
  return {
    ...adventure,

    rewardsUpperLimit: upperRewardsLimit,

    rewardsLowerLimit: lowerRewardsLimit,

    rewardsToBeDistributed: rewardsToBeDistributed,
    rewardsLeft: rewardsToBeDistributed,
  };
};
