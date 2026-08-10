import { describe,expect,it } from 'vitest';
import { orbitPosition, phaseActiveAt, windDelta } from './mechanics';

describe('remaster environment mechanics',()=>{
  it('keeps phase platforms deterministic and telegraphed',()=>{
    expect(phaseActiveAt(0,3,2,0)).toBe(true);expect(phaseActiveAt(2.4,3,2,0)).toBe(false);expect(phaseActiveAt(3.1,3,2,0)).toBe(true);
  });
  it('moves orbit hazards on a reproducible ellipse',()=>{
    expect(orbitPosition({centerX:100,centerY:80,radiusX:20,radiusY:10,speed:1,phase:0},0)).toEqual({x:120,y:80});
    const quarter=orbitPosition({centerX:100,centerY:80,radiusX:20,radiusY:10,speed:1,phase:0},Math.PI/2);expect(quarter.x).toBeCloseTo(100);expect(quarter.y).toBeCloseTo(90);
  });
  it('scales wind by fixed-step time',()=>expect(windDelta(240,-60,1/120)).toEqual({x:2,y:-.5}));
});
