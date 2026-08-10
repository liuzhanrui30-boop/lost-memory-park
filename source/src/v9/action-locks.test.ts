import { describe,expect,it } from 'vitest';
import { requirementGlyph,requirementLabel,requirementMet } from './action-locks';

const base={grounded:true,vx:0,vy:0,jumps:0,combo:0};

describe('v9 action locks',()=>{
  it('recognises every deliberate player action',()=>{
    expect(requirementMet('touch',base)).toBe(true);
    expect(requirementMet('airborne',{...base,grounded:false})).toBe(true);
    expect(requirementMet('reverse',{...base,vx:-71})).toBe(true);
    expect(requirementMet('still',base)).toBe(true);
    expect(requirementMet('double-jump',{...base,grounded:false,jumps:2})).toBe(true);
    expect(requirementMet('combo',{...base,combo:5})).toBe(true);
    expect(requirementMet('momentum',{...base,vx:275})).toBe(true);
    expect(requirementMet('rising',{...base,grounded:false,vy:-180})).toBe(true);
    expect(requirementMet('falling',{...base,grounded:false,vy:180})).toBe(true);
  });

  it('rejects near misses instead of opening the lock accidentally',()=>{
    expect(requirementMet('airborne',base)).toBe(false);
    expect(requirementMet('reverse',{...base,vx:-69})).toBe(false);
    expect(requirementMet('still',{...base,vx:36})).toBe(false);
    expect(requirementMet('double-jump',{...base,grounded:false,jumps:1})).toBe(false);
    expect(requirementMet('combo',{...base,combo:4})).toBe(false);
    expect(requirementMet('momentum',{...base,vx:274})).toBe(false);
    expect(requirementMet('rising',{...base,grounded:false,vy:-179})).toBe(false);
    expect(requirementMet('falling',{...base,grounded:false,vy:179})).toBe(false);
  });

  it('has concise world-space labels',()=>{
    expect(requirementLabel('double-jump')).toBe('二段跳');
    expect(requirementGlyph('combo')).toBe('5×COMBO');
    expect(requirementLabel('momentum')).toBe('助跑');
  });
});
