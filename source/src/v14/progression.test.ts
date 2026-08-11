import { describe,expect,it } from 'vitest';
import { rooms } from '../v2/rooms';
import { checkpointVisualTier, lessonPressure, lessonTier, segmentRoleLabel } from './progression';

describe('v12.6 logical level progression',()=>{
  const normal=rooms.filter(room=>room.kind==='normal');

  it('labels every chapter as a visible six-step course',()=>{
    for(let chapter=1;chapter<=4;chapter++){
      const chapterRooms=normal.filter(room=>room.chapter===chapter);
      expect(chapterRooms.map(room=>room.lesson?.step)).toEqual([1,2,3,4,5,6]);
      expect(chapterRooms.map(room=>room.lesson?.tier)).toEqual(['入门','练习','组合','变化','考核','终局']);
    }
  });

  it('uses teach, practice, test and finish roles inside every normal room',()=>{
    for(const room of normal)expect(room.beats?.map(beat=>beat.role)).toEqual(['learn','practice','test','finish']);
  });

  it('increases authored pressure without hidden score systems',()=>{
    expect(lessonPressure(0)).toMatchObject({secondMechanics:1,finaleMechanics:1,sentries:0,encoreHazards:0});
    expect(lessonPressure(2)).toMatchObject({executionSecond:true,sentries:1,encoreHazards:1});
    expect(lessonPressure(5)).toMatchObject({executionFinale:true,sentries:2,encoreHazards:2});
    expect(lessonTier(5)).toBe('终局');
  });

  it('gives checkpoint silhouettes four distinct progression tiers',()=>{
    expect([0,1,2,3].map(index=>checkpointVisualTier(index,4))).toEqual([0,1,2,3]);
    expect((['learn','practice','test','finish'] as const).map(segmentRoleLabel)).toEqual(['学习','练习','考验','终点']);
  });
});
