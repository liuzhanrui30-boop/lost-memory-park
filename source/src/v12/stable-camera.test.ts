import {describe,expect,it} from 'vitest';
import {fixedBackdropOffset,gentleShake,smoothCamera,snapCameraX,stableCameraTarget} from './stable-camera';

describe('v12 stable camera',()=>{
  it('keeps the complete backdrop fixed regardless of player travel',()=>{
    expect([0,320,1800,3440].map(fixedBackdropOffset)).toEqual([0,0,0,0]);
  });

  it('ignores movement inside a wide horizontal deadzone',()=>{
    expect(stableCameraTarget(500,1100,3440)).toMatchObject({target:500,insideDeadzone:true});
    expect(stableCameraTarget(500,1300,3440).target).toBeGreaterThan(500);
    expect(stableCameraTarget(500,900,3440).target).toBeLessThan(500);
  });

  it('uses frame-rate-independent easing and stable respawn framing',()=>{
    const target=900,a=smoothCamera(200,target,1/30),b=smoothCamera(smoothCamera(200,target,1/60),target,1/60);
    expect(Math.abs(a-b)).toBeLessThan(.0001);
    expect(snapCameraX(2000,3440)).toBeCloseTo(1398.4,4);
  });

  it('caps shake to a gentle offset and fully disables it for reduced motion',()=>{
    const shake=gentleShake(.73,1,1);
    expect(Math.abs(shake.x)).toBeLessThanOrEqual(4);
    expect(Math.abs(shake.y)).toBeLessThanOrEqual(2.5);
    expect(gentleShake(.73,1,1,true)).toEqual({x:0,y:0});
  });
});
