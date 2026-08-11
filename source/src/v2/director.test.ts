import { describe, expect, it } from 'vitest';
import { COMMAND_IDS, createRunSeed, directorCommandFor } from './director';
import { defaultSettings, newV2Save } from './types';

describe('director commands',()=>{
  it('is deterministic for a room and seed',()=>{
    expect(directorCommandFor(7,123456)).toEqual(directorCommandFor(7,123456));
    expect(directorCommandFor(7,123456)).not.toEqual(directorCommandFor(8,123456));
  });
  it('samples every command across reproducible seeds',()=>{
    const seen=new Set(Array.from({length:200},(_,seed)=>directorCommandFor(seed%30,seed+99).id));
    expect([...seen].sort()).toEqual([...COMMAND_IDS].sort());
  });
  it('creates non-zero bounded seeds and preserves remaster defaults',()=>{
    expect(createRunSeed(2,123)).toBeGreaterThan(0);
    expect(createRunSeed(2,123)).toBe(createRunSeed(2,123));
    const save=newV2Save();expect(save.version).toBe(5);expect(save.runSeed).toBeGreaterThan(0);
    expect(defaultSettings().bindings).toEqual({left:'KeyA',right:'KeyD',jump:'Space',drop:'KeyS',restart:'KeyR',pause:'Escape'});
  });
});
