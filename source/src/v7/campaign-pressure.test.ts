import { describe,expect,it } from 'vitest';
import { rooms,validateRooms } from '../v2/rooms';
import { HARD_CONTRACTS } from '../v6/campaign';

describe('v7 extreme performance campaign',()=>{
  const normal=rooms.filter(room=>room.kind==='normal');

  it('gives every room ranged pressure while reserving pursuit walls for chapter climaxes',()=>{
    expect(normal).toHaveLength(24);expect(HARD_CONTRACTS).toHaveLength(24);
    expect(new Set(normal.map(room=>room.contract?.id)).size).toBe(24);
    expect(new Set(normal.map(room=>room.contract?.rule)).size).toBe(5);
    expect(normal.filter(room=>room.pursuit)).toHaveLength(4);
    for(const room of normal){expect(room.sentries).toHaveLength(2);expect(room.contract).toBeTruthy();}
  });

  it('keeps precision sequences compact while widening required landings',()=>{
    for(const room of normal){
      const precision=room.blocks.filter(block=>/v6-\d+-(second|finale)-p\d/.test(block.id));
      expect(precision).toHaveLength(6);
      expect(Math.max(...precision.map(block=>block.w))).toBeLessThanOrEqual(104);
      expect(Math.min(...precision.map(block=>block.w))).toBeGreaterThanOrEqual(72);
      expect(room.spikes.some(spike=>spike.id.includes('-edge-'))).toBe(true);
    }
  });

  it('raises the simultaneous threat budget chapter by chapter',()=>{
    const threat=(chapter:number)=>normal.filter(room=>room.chapter===chapter).reduce((sum,room)=>sum+(room.sentries?.length??0)+(room.lasers?.length??0)+room.spikes.filter(spike=>spike.orbit).length,0);
    expect(threat(2)).toBeGreaterThan(threat(1));expect(threat(4)).toBeGreaterThan(threat(2));
  });

  it('starts the hook in the prologue instead of postponing the real game',()=>{
    const prologue=rooms.find(room=>room.kind==='prologue')!;expect(prologue.pursuit).toBeTruthy();expect(prologue.sentries).toHaveLength(1);expect(prologue.contract?.rule).toBe('speed');
  });

  it('keeps the complete campaign data valid',()=>expect(validateRooms()).toEqual([]));
});
