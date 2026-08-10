import { describe,expect,it } from 'vitest';
import { rooms,validateRooms } from '../v2/rooms';

describe('production remaster campaign',()=>{
  it('turns every normal room into a scrolling authored space',()=>{
    const normal=rooms.filter(r=>r.kind==='normal');expect(normal).toHaveLength(24);expect(normal.every(r=>(r.worldWidth??1280)>=2050)).toBe(true);
    expect(new Set(normal.map(r=>r.remixKind)).size).toBeGreaterThanOrEqual(6);
  });
  it('keeps exits and added checkpoints inside each world',()=>{
    for(const room of rooms){const width=room.worldWidth??1280,height=room.worldHeight??720;expect(room.exit.x+room.exit.w).toBeLessThanOrEqual(width);for(const cp of room.checkpoints??[])expect(cp.x+cp.w).toBeLessThanOrEqual(width);expect(height).toBeGreaterThanOrEqual(720);if(room.kind==='normal')expect(room.blocks.some(b=>b.x<room.exit.x+room.exit.w&&b.x+b.w>room.exit.x&&Math.abs(b.y-(room.exit.y+room.exit.h))<=2)).toBe(true);}
  });
  it('passes enriched data validation',()=>expect(validateRooms()).toEqual([]));
});
