import { describe,expect,it } from 'vitest';
import { rooms,validateRooms } from '../v2/rooms';
import { CHAPTER_ATTACK_THEMES } from '../v6/campaign';

describe('v10 clear high-pressure campaign',()=>{
  const normal=rooms.filter(room=>room.kind==='normal');

  it('removes every portal from the complete campaign',()=>{
    expect(rooms.flatMap(room=>room.portals??[])).toHaveLength(0);
    expect(rooms.some(room=>room.remixKind?.includes('portal'))).toBe(false);
  });

  it('gives each chapter one consistent and named ranged vocabulary',()=>{
    for(let chapter=1;chapter<=4;chapter++){
      const chapterRooms=normal.filter(room=>room.chapter===chapter),themes=new Set(chapterRooms.map(room=>room.attackTheme)),patterns=new Set(chapterRooms.flatMap(room=>(room.sentries??[]).map(sentry=>sentry.pattern)));
      expect(themes).toEqual(new Set([CHAPTER_ATTACK_THEMES[chapter]]));expect(patterns.size).toBe(2);
      expect(chapterRooms.map(room=>room.sentries?.length??0)).toEqual([0,1,1,1,2,2]);
    }
  });

  it('keeps simultaneous systems bounded while increasing authored obstacles',()=>{
    for(const room of normal){
      expect((room.sentries?.length??0)+(room.pursuit?1:0)).toBeLessThanOrEqual(3);
      expect(room.spikes.length).toBeGreaterThanOrEqual(8);
    }
  });

  it('keeps all routes data-valid',()=>expect(validateRooms()).toEqual([]));
});
