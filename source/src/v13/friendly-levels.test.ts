import { describe,expect,it } from 'vitest';
import { rooms } from '../v2/rooms';

describe('friendlier required route',()=>{
  it('places lock checkpoints on top of their recovery platforms',()=>{
    for(const room of rooms.filter(room=>room.kind==='normal'))for(const platform of room.blocks.filter(block=>block.id.includes('-recovery-'))){
      expect(room.checkpoints?.some(checkpoint=>checkpoint.y+checkpoint.h===platform.y&&checkpoint.x>=platform.x&&checkpoint.x+checkpoint.w<=platform.x+platform.w),`${room.id}:${platform.id}`).toBe(true);
    }
  });

  it('keeps required encore platforms wide enough for stable landings',()=>{
    for(const room of rooms.filter(room=>room.kind==='normal'))for(const platform of room.blocks.filter(block=>/-encore-p[0-2]$/.test(block.id)))expect(platform.w,`${room.id}:${platform.id}`).toBeGreaterThanOrEqual(74);
  });

  it('teaches full WASD and selective echo removal in the prologue',()=>{
    const prologue=rooms[0],text=prologue.tutorialSigns?.flatMap(sign=>sign.rows.flatMap(row=>[row.keys,row.label])).join(' ')??'';
    expect(prologue.tutorialSigns).toHaveLength(1);expect(text).toContain('W');expect(text).toContain('S');expect(text).toContain('右键');
  });
});
