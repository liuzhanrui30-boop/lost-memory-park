import { describe,expect,it } from 'vitest';
import { rooms } from '../v2/rooms';
import { defaultSettings,newV2Save } from '../v2/types';
import { HARD_CONTRACTS,ROOM_RECIPES } from '../v6/campaign';

describe('v11 focused movement rule set',()=>{
  it('exposes no rewind or memory-anchor bindings or assists',()=>{
    const settings=defaultSettings() as unknown as Record<string,unknown>;
    expect(settings).not.toHaveProperty('bonusRewind');expect(settings).not.toHaveProperty('skipBossStage');
    expect(settings).not.toHaveProperty('extraDash');
    expect(settings.bindings).toEqual({left:'KeyA',right:'KeyD',jump:'Space',drop:'KeyS',restart:'KeyR',pause:'Escape'});
    expect(newV2Save()).not.toHaveProperty('rewindBonus');expect(newV2Save()).not.toHaveProperty('anchorTutorialSeen');
  });

  it('removes memory-tool contracts and authored anchor mechanics',()=>{
    expect(HARD_CONTRACTS.some(contract=>String(contract.rule).includes('rewind')||String(contract.rule).includes('anchor'))).toBe(false);
    expect(ROOM_RECIPES.some(recipe=>[...recipe.secondAct,...recipe.finale].some(mechanic=>String(mechanic).includes('anchor')))).toBe(false);
    expect(rooms.some(room=>room.remixKind?.includes('anchor'))).toBe(false);
  });
});
