import { describe,expect,it } from 'vitest';
import { compactTouchViewport,directionForPointer,touchControlsEnabled } from './touch-ui';

describe('mobile touch UI',()=>{
  it('supports automatic, forced and disabled modes',()=>{
    expect(touchControlsEnabled('auto',true)).toBe(true);
    expect(touchControlsEnabled('auto',false)).toBe(false);
    expect(touchControlsEnabled('on',false)).toBe(true);
    expect(touchControlsEnabled('off',true)).toBe(false);
  });

  it('identifies compact landscape phone screens',()=>{
    expect(compactTouchViewport(844,390,true)).toBe(true);
    expect(compactTouchViewport(1920,1080,true)).toBe(false);
    expect(compactTouchViewport(844,390,false)).toBe(false);
  });

  it('allows sliding a thumb between left and right',()=>{
    expect(directionForPointer(120,100,160)).toBe('left');
    expect(directionForPointer(240,100,160)).toBe('right');
  });
});
