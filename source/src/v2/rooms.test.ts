import { describe, expect, it } from 'vitest';
import { rooms, validateRooms } from './rooms';
import { MAX_ECHOES, newV2Save, v2Ending } from './types';

describe('I Wanna style remake data',()=>{
  it('has prologue, 24 formal rooms, four bosses and an epilogue',()=>{
    expect(rooms).toHaveLength(30);
    expect(rooms.filter(room=>room.kind==='normal')).toHaveLength(24);
    expect(rooms.filter(room=>room.kind==='boss')).toHaveLength(4);
    expect(rooms.filter(room=>room.kind==='prologue')).toHaveLength(1);
    expect(rooms.filter(room=>room.kind==='epilogue')).toHaveLength(1);
    expect(rooms.filter(room=>room.kind==='boss').every(room=>(room.boss?.stages??0)>=3)).toBe(true);
    expect(rooms.find(room=>room.id==='smile-director')?.boss?.stages).toBe(4);
    for(const room of rooms){
      expect(room.spawn.x).toBeGreaterThanOrEqual(0);
      expect(room.spawn.x).toBeLessThan(1280);
      expect(room.exit.x+room.exit.w).toBeLessThanOrEqual(room.worldWidth??1280);
      expect(room.blocks.length).toBeGreaterThan(room.kind==='epilogue'?0:1);
    }
  });
  it('contains twelve unique core memories and at least twenty-four optional archives',()=>{
    const ids=rooms.flatMap(room=>room.shard?[room.shard.id]:[]);
    expect(new Set(ids).size).toBe(12);
    expect(rooms.flatMap(room=>room.optional??[]).length).toBeGreaterThanOrEqual(24);
  });
  it('binds a readable story beat to every playable scene',()=>{
    for(const room of rooms){
      expect(room.story?.speaker.length).toBeGreaterThan(0);
      expect(room.story?.text.length).toBeGreaterThan(20);
      expect(room.story?.objective?.length).toBeGreaterThan(5);
    }
  });
  it('only targets spikes that exist in the room',()=>{
    for(const room of rooms){const spikeIds=new Set(room.spikes.map(s=>s.id));for(const trap of room.traps)for(const target of trap.targets)expect(spikeIds.has(target)).toBe(true);}
  });
  it('contains the expanded mechanics with valid gate links',()=>{
    expect(rooms.some(room=>room.blocks.some(block=>block.kind==='bounce'))).toBe(true);
    expect(rooms.some(room=>room.blocks.some(block=>block.kind==='ice'))).toBe(true);
    expect(rooms.some(room=>(room.lasers?.length??0)>0)).toBe(true);
    for(const room of rooms){const blockIds=new Set(room.blocks.map(block=>block.id)),groups=new Set(room.blocks.filter(block=>block.group).map(block=>block.group));for(const button of room.buttons??[])expect(button.target==='boss'||blockIds.has(button.target)||(button.target.startsWith('group:')&&groups.has(button.target.slice(6)))).toBe(true);}
  });
  it('keeps spawns and checkpoints outside authored laser beams',()=>{
    const overlaps=(a:{x:number;y:number;w:number;h:number},b:{x:number;y:number;w:number;h:number})=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
    for(const room of rooms){
      const spawn={x:room.spawn.x,y:room.spawn.y,w:30,h:42};
      for(const laser of room.lasers??[]){expect(overlaps(spawn,laser)).toBe(false);if(room.checkpoint)expect(overlaps(room.checkpoint,laser)).toBe(false);expect(laser.activeFor).toBeLessThan(laser.period);}
    }
  });
  it('keeps the three ending thresholds',()=>{
    expect(v2Ending(5)).toBe('escape');expect(v2Ending(6)).toBe('takeover');expect(v2Ending(12)).toBe('destroy');expect(newV2Save().deaths).toBe(0);expect(MAX_ECHOES).toBe(6);
  });
  it('passes startup data validation',()=>expect(validateRooms()).toEqual([]));
});
