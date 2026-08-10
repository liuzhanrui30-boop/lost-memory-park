import { describe,expect,it } from 'vitest';
import { findCornerCorrection, findSupport, platformLaunchVelocity, shouldProbeSupport, splitMotion } from './kinematics';

describe('stable platformer kinematics',()=>{
  it('splits fast movement into bounded collision steps',()=>{
    const steps=splitMotion(17,3);expect(steps.reduce((a,b)=>a+b,0)).toBeCloseTo(17);expect(Math.max(...steps.map(Math.abs))).toBeLessThanOrEqual(3);
    expect(splitMotion(-8,3).reduce((a,b)=>a+b,0)).toBeCloseTo(-8);
  });
  it('corrects a shallow ceiling corner without killing the jump',()=>{
    const body={x:98,y:80,w:30,h:42},solids=[{x:124,y:70,w:100,h:20}];
    expect(findCornerCorrection(body,solids,6)).toBe(-4);
  });
  it('keeps a body grounded with a small floor probe',()=>{
    const body={x:50,y:116,w:30,h:42},solids=[{x:0,y:160,w:200,h:40}];
    expect(findSupport(body,solids,3)?.y).toBe(160);expect(findSupport({...body,y:150},solids,3)).toBeNull();
  });
  it('never snaps a rising player back onto a nearby floor',()=>{
    expect(shouldProbeSupport(-1.2,false)).toBe(false);expect(shouldProbeSupport(1.2,false)).toBe(true);expect(shouldProbeSupport(-1.2,true)).toBe(true);
  });
  it('inherits moving-platform momentum with safe caps',()=>{
    expect(platformLaunchVelocity(1,-1,1/120).x).toBeCloseTo(81.6);expect(platformLaunchVelocity(1,-1,1/120).y).toBeCloseTo(-57.6);
    expect(platformLaunchVelocity(20,-20,1/120)).toEqual({x:160,y:-145});expect(platformLaunchVelocity(-20,8,1/120)).toEqual({x:-160,y:0});
  });
});
