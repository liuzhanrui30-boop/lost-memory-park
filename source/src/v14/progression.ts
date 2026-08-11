import type { SegmentRole } from '../v2/types';

export interface LessonPressure {
  secondMechanics:1|2;
  finaleMechanics:1|2;
  dressSecond:boolean;
  dressFinale:boolean;
  executionSecond:boolean;
  executionFinale:boolean;
  sentries:0|1|2;
  encoreHazards:0|1|2;
}

export const LESSON_TIERS=['入门','练习','组合','变化','考核','终局'] as const;

const PRESSURE:readonly LessonPressure[]=[
  {secondMechanics:1,finaleMechanics:1,dressSecond:false,dressFinale:false,executionSecond:false,executionFinale:false,sentries:0,encoreHazards:0},
  {secondMechanics:2,finaleMechanics:1,dressSecond:true,dressFinale:false,executionSecond:false,executionFinale:false,sentries:1,encoreHazards:0},
  {secondMechanics:2,finaleMechanics:2,dressSecond:true,dressFinale:false,executionSecond:true,executionFinale:false,sentries:1,encoreHazards:1},
  {secondMechanics:2,finaleMechanics:2,dressSecond:true,dressFinale:true,executionSecond:true,executionFinale:false,sentries:1,encoreHazards:1},
  {secondMechanics:2,finaleMechanics:2,dressSecond:true,dressFinale:true,executionSecond:true,executionFinale:true,sentries:2,encoreHazards:2},
  {secondMechanics:2,finaleMechanics:2,dressSecond:true,dressFinale:true,executionSecond:true,executionFinale:true,sentries:2,encoreHazards:2},
] as const;

export function lessonPressure(step:number):LessonPressure{return PRESSURE[Math.max(0,Math.min(5,Math.floor(step)))]}
export function lessonTier(step:number):string{return LESSON_TIERS[Math.max(0,Math.min(5,Math.floor(step)))]}
export function segmentRoleLabel(role:SegmentRole):string{return({learn:'学习',practice:'练习',test:'考验',finish:'终点'} as const)[role]}
export function checkpointVisualTier(index:number,total:number):0|1|2|3{
  if(total<=1)return 3;
  return Math.max(0,Math.min(3,Math.round(index/(total-1)*3))) as 0|1|2|3;
}
