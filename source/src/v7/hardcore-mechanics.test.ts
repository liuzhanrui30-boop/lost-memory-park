import { describe,expect,it } from 'vitest';
import { aimedVelocity,contractSuccess,leadTarget,pursuitVelocity,sentryPassed } from './hardcore-mechanics';

describe('v7 high-pressure systems',()=>{
  it('keeps pursuit threatening without making close contact mathematically hopeless',()=>{
    expect(pursuitVelocity(170,260,110)).toBeLessThan(120);
    expect(pursuitVelocity(170,260,300)).toBe(170);
    expect(pursuitVelocity(170,260,1000)).toBe(260);
  });

  it('aims deterministic sentry shots at a bounded speed',()=>{
    const shot=aimedVelocity({x:0,y:0},{x:3,y:4},350);
    expect(shot).toEqual({vx:210,vy:280});
    expect(Math.hypot(shot.vx,shot.vy)).toBeCloseTo(350);
  });
  it('leads a player who only holds forward instead of firing behind them',()=>{
    const target=leadTarget({x:900,y:200},{x:300,y:600},{x:315,y:0},400);
    expect(target.x).toBeGreaterThan(530);expect(target.y).toBe(600);
  });
  it('disables a tracking device only after its safe pass line',()=>{
    expect(sentryPassed(1140,1000)).toBe(true);
    expect(sentryPassed(1109,1000)).toBe(false);
  });

  it('evaluates every clear contract at the exit rather than by hidden scoring',()=>{
    const base={failed:false,elapsed:24,deaths:0};
    expect(contractSuccess({id:'a',label:'a',description:'',rule:'no-death'},base)).toBe(true);
    expect(contractSuccess({id:'b',label:'b',description:'',rule:'speed',target:25},base)).toBe(true);
    expect(contractSuccess({id:'c',label:'c',description:'',rule:'relentless'},base)).toBe(true);
    expect(contractSuccess({id:'d',label:'d',description:'',rule:'relentless'},{...base,failed:true})).toBe(false);
  });
});
