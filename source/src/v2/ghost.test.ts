import { describe, expect, it } from 'vitest';
import { compressGhost, ghostPositionAt, type GhostSample } from './ghost';

describe('ghost compression',()=>{
  const samples:GhostSample[]=Array.from({length:100},(_,i)=>({t:i/30,x:i*4.123,y:600-i*.77}));
  it('quantizes and caps trajectory points',()=>{
    const ghost=compressGhost(samples,20);expect(ghost).toHaveLength(20);expect(ghost[0]).toEqual([0,0,600]);expect(ghost.at(-1)?.[0]).toBe(330);
  });
  it('interpolates a non-colliding display position',()=>{
    const ghost=compressGhost(samples,20);const pos=ghostPositionAt(ghost,1)!;expect(pos.x).toBeGreaterThan(0);expect(pos.y).toBeLessThan(600);expect(ghostPositionAt([],1)).toBeNull();
  });
});
