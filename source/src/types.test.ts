import { describe, expect, it } from 'vitest';
import { defaultSave, endingForShardCount, formatTime } from './types';

describe('progression rules', () => {
  it('selects all three endings at the planned thresholds', () => {
    expect(endingForShardCount(0)).toBe('escape');
    expect(endingForShardCount(5)).toBe('escape');
    expect(endingForShardCount(6)).toBe('takeover');
    expect(endingForShardCount(11)).toBe('takeover');
    expect(endingForShardCount(12)).toBe('destroy');
  });

  it('starts each dream with five lives and no progress', () => {
    const save = defaultSave();
    expect(save.lives).toBe(5);
    expect(save.shards).toEqual([]);
    expect(save.currentLevel).toBe(0);
  });

  it('formats run time for the HUD', () => {
    expect(formatTime(0)).toBe('00:00.0');
    expect(formatTime(65.89)).toBe('01:05.8');
  });
});
