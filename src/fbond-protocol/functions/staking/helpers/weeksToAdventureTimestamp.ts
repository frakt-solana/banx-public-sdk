import { ADVENTURE_DURATION, ADVENTURE_START } from '../../../constants';

export const weeksToAdventureTimestamp = (weeks: number): number => {
  return ADVENTURE_START + ADVENTURE_DURATION * weeks;
};

export const adventureTimestampToWeeks = (adventureTimestamp: number): number =>
  Math.floor((adventureTimestamp - ADVENTURE_START) / ADVENTURE_DURATION);
