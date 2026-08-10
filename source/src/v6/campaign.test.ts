import { describe, expect, it } from 'vitest';
import { rooms, validateRooms } from '../v2/rooms';
import { ROOM_RECIPES } from './campaign';

const mechanicKinds=(room:(typeof rooms)[number]):Set<string>=>{
  const kinds=new Set<string>(room.blocks.map(block=>block.kind??'solid'));
  if(room.launchers?.length)kinds.add('launcher');
  if(room.crushers?.length)kinds.add('crusher');
  if(room.spotlights?.length)kinds.add('spotlight');
  if(room.lasers?.length)kinds.add('laser');
  if(room.windZones?.length)kinds.add('wind');
  if(room.spikes.some(spike=>spike.orbit))kinds.add('orbit-spike');
  return kinds;
};

describe('v12 authored four-act campaign',()=>{
  it('uses twenty-four explicit recipes instead of six modulo templates',()=>{
    expect(ROOM_RECIPES).toHaveLength(24);
    expect(new Set(ROOM_RECIPES.map(recipe=>recipe.id)).size).toBe(24);
    expect(new Set(ROOM_RECIPES.map(recipe=>`${recipe.secondAct}/${recipe.finale}`)).size).toBeGreaterThanOrEqual(20);
  });

  it('turns every normal room into a four-act 3440px gauntlet',()=>{
    const normal=rooms.filter(room=>room.kind==='normal');expect(normal).toHaveLength(24);
    for(const room of normal){
      expect(room.worldWidth).toBe(3440);
      expect(room.beats).toHaveLength(4);
      expect(room.checkpoints?.length??0).toBeGreaterThanOrEqual(3);
      expect(mechanicKinds(room).size).toBeGreaterThanOrEqual(3);
      expect(room.optional?.some(item=>item.x>1280)).toBe(true);
      expect(room.optional?.some(item=>item.x>3000)).toBe(true);
    }
  });

  it('provides at least twelve authored landmarks and all new device families',()=>{
    const normal=rooms.filter(room=>room.kind==='normal');
    expect(new Set(normal.map(room=>room.landmark)).size).toBeGreaterThanOrEqual(12);
    expect(normal.some(room=>room.launchers?.length)).toBe(true);
    expect(normal.every(room=>(room.portals?.length??0)===0)).toBe(true);
    expect(normal.some(room=>room.crushers?.length)).toBe(true);
    expect(normal.some(room=>room.spotlights?.length)).toBe(true);
    expect(normal.some(room=>room.blocks.some(block=>block.kind==='crumble'))).toBe(true);
    expect(normal.some(room=>room.blocks.some(block=>block.kind==='toggle'))).toBe(true);
    expect(normal.some(room=>room.blocks.some(block=>block.kind==='sticky'))).toBe(true);
    expect(normal.some(room=>room.blocks.some(block=>block.kind==='orbit'))).toBe(true);
  });

  it('opens with a compact playable set piece instead of an empty prologue',()=>{
    const prologue=rooms.find(room=>room.kind==='prologue')!;
    expect(prologue.worldWidth).toBe(1960);
    expect(prologue.launchers?.length).toBeGreaterThan(0);
    expect(prologue.portals?.length??0).toBe(0);
    expect(prologue.crushers?.length).toBeGreaterThan(0);
    expect(prologue.beats).toHaveLength(3);
  });

  it('passes extended data validation',()=>expect(validateRooms()).toEqual([]));
});
