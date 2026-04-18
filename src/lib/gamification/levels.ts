export const LEVEL_THRESHOLDS = [
  { minFp: 0, level: 1, title: 'The Dreamer' },
  { minFp: 500, level: 2, title: 'The Organizer' },
  { minFp: 1500, level: 3, title: 'The Curator' },
  { minFp: 4000, level: 4, title: 'The Director' },
  { minFp: 10000, level: 5, title: 'The Maestro' },
] as const;

export function computeLevel(careerFp: number): number {
  let level = 1;
  for (const threshold of LEVEL_THRESHOLDS) {
    if (careerFp >= threshold.minFp) level = threshold.level;
  }
  return level;
}

export function computeLevelTitle(careerFp: number): string {
  let title: string = LEVEL_THRESHOLDS[0].title;
  for (const threshold of LEVEL_THRESHOLDS) {
    if (careerFp >= threshold.minFp) title = threshold.title;
  }
  return title;
}
