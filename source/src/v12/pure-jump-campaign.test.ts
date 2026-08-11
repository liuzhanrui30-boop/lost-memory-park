import { describe,expect,it } from 'vitest';
import { rooms,validateRooms } from '../v2/rooms';
import { defaultSettings } from '../v2/types';
import { LOCK_SCRIPTS } from '../v6/campaign';

const normal=rooms.filter(room=>room.kind==='normal');
const encoreBlocks=(chapter:number)=>normal.filter(room=>room.chapter===chapter).flatMap(room=>room.blocks.filter(block=>block.id.includes('-encore-')));

describe('v12 pure jump four-act campaign',()=>{
  it('removes dash from settings and every authored skill gate',()=>{
    expect(defaultSettings()).not.toHaveProperty('extraDash');
    expect(defaultSettings().bindings).not.toHaveProperty('dash');
    expect(LOCK_SCRIPTS.flatMap(script=>[script.A,script.B])).not.toContain('dash');
  });

  it('adds a readable encore, checkpoint and optional high route to every normal room',()=>{
    for(const room of normal){
      expect(room.blocks.some(block=>block.id.includes('-encore-rest'))).toBe(true);
      expect(room.blocks.filter(block=>block.id.includes('-encore-p'))).toHaveLength(3);
      expect(room.checkpoints?.some(checkpoint=>checkpoint.x>2900)).toBe(true);
      expect(room.optional?.some(item=>item.id.startsWith('note-encore-'))).toBe(true);
      expect(room.beats?.at(-1)?.x).toBeGreaterThan(3300);
    }
  });

  it('gives every chapter a distinct final traversal grammar',()=>{
    expect(encoreBlocks(1).some(block=>block.kind==='sticky')).toBe(true);
    expect(encoreBlocks(1).some(block=>block.kind==='crumble')).toBe(true);
    expect(encoreBlocks(2).some(block=>block.kind==='bounce')).toBe(true);
    expect(normal.filter(room=>room.chapter===2&&room.lesson!.step>=5).every(room=>room.spotlights?.some(light=>light.id.includes('-encore-')))).toBe(true);
    expect(encoreBlocks(3).some(block=>block.kind==='phase')).toBe(true);
    expect(normal.filter(room=>room.chapter===3&&room.lesson!.step>=5).every(room=>room.spikes.some(spike=>spike.id.includes('-encore-orbit-blade')))).toBe(true);
    expect(encoreBlocks(4).some(block=>block.kind==='conveyor')).toBe(true);
    expect(normal.filter(room=>room.chapter===4&&room.lesson!.step>=5).every(room=>room.lasers?.some(laser=>laser.id.includes('-encore-core-line')))).toBe(true);
  });

  it('keeps the expanded campaign data-valid',()=>expect(validateRooms()).toEqual([]));
});
