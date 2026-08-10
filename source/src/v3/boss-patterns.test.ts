import { describe,expect,it } from 'vitest';
import { bossVolley } from './boss-patterns';

describe('authored boss attack score',()=>{
  it('is deterministic for the same stage and beat',()=>expect(bossVolley(4,3,7,600)).toEqual(bossVolley(4,3,7,600)));
  it('gives every chapter a distinct readable pattern',()=>{
    const patterns=[1,2,3,4].map(ch=>bossVolley(ch,2,3,600));expect(patterns.every(p=>p.length>0)).toBe(true);expect(new Set(patterns.map(p=>p[0].color)).size).toBe(4);
  });
  it('adds pressure in later phases without removing telegraph time',()=>{
    expect(bossVolley(1,3,2,500).length).toBeGreaterThan(bossVolley(1,1,2,500).length);expect(bossVolley(4,4,8,500).every(s=>s.warning>=.36)).toBe(true);
  });
});
