import { describe,expect,it } from 'vitest';
import { preferredRenderScale } from './render-quality';

describe('high quality render scale',()=>{
  it('never drops below the crisp 1600×900 backing resolution',()=>{
    expect(preferredRenderScale(1280,720)).toBe(1.25);
    expect(preferredRenderScale(1024,768)).toBe(1.25);
  });

  it('reaches full HD on a 1920×1080 viewport',()=>{
    expect(preferredRenderScale(1920,1080)).toBe(1.5);
  });

  it('caps very large and Retina displays to protect frame rate',()=>{
    expect(preferredRenderScale(3840,2160)).toBe(1.5);
  });
});
