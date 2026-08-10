import type { CrusherDef, LauncherDef, SpotlightDef } from '../v2/types';

export interface LauncherResult {vx:number;vy:number;facing:-1|1}
export interface CrusherPose {offset:number;dangerous:boolean;warning:boolean;phase:number;impact:number}
export interface SpotlightState {active:boolean;warning:boolean;phase:number;strength:number}

const positiveMod=(value:number,mod:number):number=>((value%mod)+mod)%mod;
const clamp01=(value:number):number=>Math.max(0,Math.min(1,value));
const smooth=(value:number):number=>{const t=clamp01(value);return t*t*(3-2*t);};
const cubicOut=(value:number):number=>1-Math.pow(1-clamp01(value),3);

export function launcherResult(def:Pick<LauncherDef,'vx'|'vy'|'facing'>,currentFacing:number):LauncherResult{
  const inferred=Math.sign(def.vx)||Math.sign(currentFacing)||1;
  return{vx:def.vx,vy:def.vy,facing:(def.facing??inferred) as -1|1};
}

export function crusherPoseAt(def:Pick<CrusherDef,'period'|'distance'|'phase'>,time:number):CrusherPose{
  const period=Math.max(.2,def.period),phase=positiveMod(time+(def.phase??0),period)/period;
  if(phase<.38)return{offset:0,dangerous:false,warning:false,phase,impact:0};
  if(phase<.55){const t=(phase-.38)/.17;return{offset:-def.distance*.06*smooth(t),dangerous:false,warning:true,phase,impact:0};}
  if(phase<.68){const t=(phase-.55)/.13;return{offset:def.distance*cubicOut(t),dangerous:true,warning:false,phase,impact:t>.86?1:0};}
  if(phase<.78)return{offset:def.distance,dangerous:true,warning:false,phase,impact:0};
  const t=(phase-.78)/.22;return{offset:def.distance*(1-smooth(t)),dangerous:false,warning:false,phase,impact:0};
}

export function crusherSafeWindow(def:Pick<CrusherDef,'period'>):number{return Math.max(.2,def.period)*.55;}

export function spotlightStateAt(def:Pick<SpotlightDef,'period'|'activeFor'|'phase'|'warning'>,time:number):SpotlightState{
  const period=Math.max(.2,def.period),phase=positiveMod(time+(def.phase??0),period),activeFor=Math.max(0,Math.min(period,def.activeFor)),warningFor=Math.max(.1,def.warning??.45),active=phase<activeFor,remaining=period-phase,warning=!active&&remaining<=warningFor;
  const strength=active?1:warning?1-remaining/warningFor:0;
  return{active,warning,phase,strength};
}

export function spotlightMovementIsUnsafe(vx:number,vy:number):boolean{return Math.abs(vx)>55||Math.abs(vy)>90;}

export type CrumbleState='stable'|'warning'|'absent'|'restored';
export function crumbleStateAt(touchedAt:number|null,time:number,delay=.38,respawn=1.8):CrumbleState{
  if(touchedAt===null)return'stable';const age=Math.max(0,time-touchedAt);if(age<delay)return'warning';if(age<delay+respawn)return'absent';return'restored';
}

export function beatReward(heat:number):{gold:boolean;comboBonus:number}{const gold=heat>=60;return{gold,comboBonus:gold?2:0};}
