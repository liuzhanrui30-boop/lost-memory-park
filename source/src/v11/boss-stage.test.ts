import { describe,expect,it } from 'vitest';
import { bossStageReady,bossWaveRequirement } from './boss-stage';

describe('v11 unskippable boss stages',()=>{
  it('requires two waves early and three waves later',()=>{
    expect([0,1,2,3].map(bossWaveRequirement)).toEqual([2,2,3,3]);
  });

  it('never unlocks an active stage before its full attack quota',()=>{
    expect(bossStageReady(0,3,1)).toBe(false);
    expect(bossStageReady(0,3,2)).toBe(true);
    expect(bossStageReady(2,4,2)).toBe(false);
    expect(bossStageReady(2,4,3)).toBe(true);
    expect(bossStageReady(4,4,0)).toBe(true);
  });
});
