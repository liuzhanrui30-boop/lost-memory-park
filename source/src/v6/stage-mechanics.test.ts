import { describe, expect, it } from 'vitest';
import {
  crumbleStateAt,
  crusherPoseAt,
  crusherSafeWindow,
  launcherResult,
  spotlightMovementIsUnsafe,
  spotlightStateAt,
} from './stage-mechanics';

describe('v6 directed stage mechanics', () => {
  it('launches with authored direction and keeps the requested facing', () => {
    expect(launcherResult({vx:520,vy:-760,facing:1},-1)).toEqual({vx:520,vy:-760,facing:1});
    expect(launcherResult({vx:-480,vy:-640},1)).toEqual({vx:-480,vy:-640,facing:-1});
  });

  it('gives crushers a readable rest, warning, strike, hold and retreat cycle', () => {
    const crusher={period:2,distance:240,phase:0};
    expect(crusherPoseAt(crusher,0.2)).toMatchObject({offset:0,dangerous:false,warning:false});
    expect(crusherPoseAt(crusher,.9).warning).toBe(true);
    expect(crusherPoseAt(crusher,1.24).offset).toBeGreaterThan(100);
    expect(crusherPoseAt(crusher,1.45).dangerous).toBe(true);
    expect(crusherPoseAt(crusher,1.9).offset).toBeLessThan(240);
    expect(crusherSafeWindow(crusher)).toBeGreaterThanOrEqual(.55);
  });

  it('separates spotlight warning and active windows', () => {
    const light={period:3,activeFor:1.1,phase:0,warning:.45};
    expect(spotlightStateAt(light,.4).active).toBe(true);
    expect(spotlightStateAt(light,2.7).warning).toBe(true);
    expect(spotlightStateAt(light,1.5)).toMatchObject({active:false,warning:false});
    expect(spotlightMovementIsUnsafe(56,0)).toBe(true);
    expect(spotlightMovementIsUnsafe(0,91)).toBe(true);
    expect(spotlightMovementIsUnsafe(0,0)).toBe(false);
    expect(spotlightMovementIsUnsafe(20,30)).toBe(false);
  });

  it('restores crumble platforms instead of allowing a permanent soft lock', () => {
    expect(crumbleStateAt(null,4,.38,1.8)).toBe('stable');
    expect(crumbleStateAt(1,1.2,.38,1.8)).toBe('warning');
    expect(crumbleStateAt(1,1.6,.38,1.8)).toBe('absent');
    expect(crumbleStateAt(1,3.3,.38,1.8)).toBe('restored');
  });
});
