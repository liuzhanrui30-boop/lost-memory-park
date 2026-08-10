import { describe,expect,it } from 'vitest';
import { buildProjectilePattern,patternGlyph,patternLabel } from './projectile-patterns';

describe('v10 readable projectile families',()=>{
  const base={vx:300,vy:0};
  it('keeps each family visually and mechanically distinct',()=>{
    expect(buildProjectilePattern('aimed',base)).toHaveLength(1);
    expect(buildProjectilePattern('arc',base)[0].gravity).toBeGreaterThan(0);
    expect(buildProjectilePattern('fan',base)).toHaveLength(3);
    expect(buildProjectilePattern('mirror',base)).toHaveLength(2);
    expect(buildProjectilePattern('burst',base).map(shot=>shot.vx)).toEqual([228,300,372]);
  });
  it('provides concise telegraph labels',()=>{
    expect(patternLabel('arc')).toBe('抛射');expect(patternGlyph('mirror')).toBe('◇◇');
  });
});
