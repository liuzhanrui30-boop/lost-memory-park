import { describe, expect, it } from 'vitest';
import { rooms } from '../v2/rooms';
import { BOSS_STORY, EPILOGUE_STORY, PROLOGUE_STORY } from './narrative';

describe('story clarity contract',()=>{
  it('gives every playable chapter beat a speaker, cause and objective',()=>{
    expect(rooms[0].story).toEqual(PROLOGUE_STORY);
    for(const room of rooms.filter(room=>room.kind==='normal')){
      expect(room.story?.speaker.length).toBeGreaterThan(0);
      expect(room.story?.text.length).toBeGreaterThan(20);
      expect(room.story?.objective?.length).toBeGreaterThan(5);
    }
    for(const room of rooms.filter(room=>room.kind==='boss'))expect(room.story).toEqual(BOSS_STORY[room.chapter]);
    expect(rooms.at(-1)?.story).toEqual(EPILOGUE_STORY);
  });
});
