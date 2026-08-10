export function bossWaveRequirement(phase:number):number{
  return Math.min(3,2+Math.floor(Math.max(0,phase)/2));
}

export function bossStageReady(phase:number,max:number,waves:number):boolean{
  return phase>=max||waves>=bossWaveRequirement(phase);
}
