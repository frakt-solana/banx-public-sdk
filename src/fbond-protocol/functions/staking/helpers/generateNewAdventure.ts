import { ADVENTURE_DURATION, ADVENTURE_PREFIX, ENCODER } from '../../../constants';
import { Adventure, AdventureState } from '../../../types';
import { weeksToAdventureTimestamp } from './weeksToAdventureTimestamp';
import { web3 } from '@project-serum/anchor';

type GenerateNewAdventure = (params: {
  weeks: number;
  lowerRewardsLimit: number;
  upperRewardsLimit: number;
  programId: web3.PublicKey;
}) => Promise<Adventure>;

export const generateNewAdventure: GenerateNewAdventure = async ({
  weeks,
  lowerRewardsLimit,
  upperRewardsLimit,
  programId,
}) => {
  const adventureTimestamp = weeksToAdventureTimestamp(weeks);
  const [adventure] = await web3.PublicKey.findProgramAddress(
    [ENCODER.encode(ADVENTURE_PREFIX), ENCODER.encode(adventureTimestamp.toString())],
    programId,
  );
  return {
    adventureState: AdventureState.Uninitialized,
    periodStartedAt: adventureTimestamp,

    periodEndingAt: adventureTimestamp + ADVENTURE_DURATION,

    rewardsUpperLimit: upperRewardsLimit,

    rewardsLowerLimit: lowerRewardsLimit,

    totalPeriodRevenue: 0,

    rewardsToBeDistributed: 0,

    totalBanxSubscribed: 0,

    totalPartnerPoints: 0,

    totalPlayerPoints: 0,

    banxSubscribedLeft: 0,

    partnerPointsLeft: 0,

    playerPointsLeft: 0,

    rewardsLeft: 0,

    publicKey: adventure.toBase58(),
  };
};
