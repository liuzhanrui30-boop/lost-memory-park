import type { ButtonRequirement } from '../v2/types';

export interface ActionLockContext {
  grounded:boolean;
  vx:number;
  vy:number;
  jumps:number;
  combo:number;
}

const LABELS:Record<ButtonRequirement,string>={
  touch:'触碰',
  airborne:'腾空',
  reverse:'反向',
  still:'静止',
  'double-jump':'二段跳',
  combo:'连击',
  momentum:'助跑',
  rising:'上升',
  falling:'下坠',
};

const GLYPHS:Record<ButtonRequirement,string>={
  touch:'TOUCH',
  airborne:'AIR',
  reverse:'REVERSE',
  still:'HOLD',
  'double-jump':'2×JUMP',
  combo:'5×COMBO',
  momentum:'RUN',
  rising:'RISE',
  falling:'FALL',
};

export function requirementLabel(requirement:ButtonRequirement='touch'):string{return LABELS[requirement];}
export function requirementGlyph(requirement:ButtonRequirement='touch'):string{return GLYPHS[requirement];}

export function requirementMet(requirement:ButtonRequirement='touch',context:ActionLockContext):boolean{
  if(requirement==='airborne')return !context.grounded;
  if(requirement==='reverse')return context.vx<-70;
  if(requirement==='still')return context.grounded&&Math.abs(context.vx)<35;
  if(requirement==='double-jump')return !context.grounded&&context.jumps>=2;
  if(requirement==='combo')return context.combo>=5;
  if(requirement==='momentum')return context.grounded&&Math.abs(context.vx)>=275;
  if(requirement==='rising')return !context.grounded&&context.vy<=-180;
  if(requirement==='falling')return !context.grounded&&context.vy>=180;
  return true;
}
