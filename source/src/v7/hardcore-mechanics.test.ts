import { describe,expect,it } from 'vitest';
import { aimedVelocity,comboTier,contractSuccess,isNearMiss,leadTarget,pursuitVelocity } from './hardcore-mechanics';

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

  it('evaluates every measurable contract at the exit rather than by luck',()=>{
    const base={failed:false,elapsed:24,deaths:0,maxHeat:73,maxCombo:13};
    expect(contractSuccess({id:'a',label:'a',description:'',rule:'no-death'},base)).toBe(true);
    expect(contractSuccess({id:'b',label:'b',description:'',rule:'speed',target:25},base)).toBe(true);
    expect(contractSuccess({id:'c',label:'c',description:'',rule:'heat',target:75},base)).toBe(false);
    expect(contractSuccess({id:'d',label:'d',description:'',rule:'combo',target:12},base)).toBe(true);
    expect(contractSuccess({id:'e',label:'e',description:'',rule:'relentless'},{...base,failed:true})).toBe(false);
  });

  it('recognizes a readable near miss but never rewards an actual collision',()=>{
    const player={x:100,y:100,w:30,h:42},hazard={x:151,y:100,w:20,h:42};
    expect(isNearMiss(player,hazard,22)).toBe(true);
    expect(isNearMiss({...player,x:130},hazard,22)).toBe(false);
    expect(comboTier(2)).toBe(0);expect(comboTier(7)).toBe(2);expect(comboTier(20)).toBe(4);
  });
});
