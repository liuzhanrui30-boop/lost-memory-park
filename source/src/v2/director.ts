export const COMMAND_IDS=['float','rush','blackout','needle','echo-tax'] as const;
export type DirectorCommandId=typeof COMMAND_IDS[number];

export interface DirectorCommand {
  id:DirectorCommandId;
  label:string;
  description:string;
  gravityScale:number;
  airControlScale:number;
  motionScale:number;
  laserScale:number;
  spikeSpeedScale:number;
  spikeWarning:number;
  echoLimit:number;
  spotlight:boolean;
  color:string;
}

const COMMANDS:Record<DirectorCommandId,DirectorCommand>={
  float:{id:'float',label:'轻飘舞台',description:'重力降低，空中修正增强。别相信熟悉的落点。',gravityScale:.7,airControlScale:1.22,motionScale:1,laserScale:1,spikeSpeedScale:1,spikeWarning:0,echoLimit:6,spotlight:false,color:'#78a99f'},
  rush:{id:'rush',label:'催场',description:'移动机关与激光节奏加快，但预警仍完整保留。',gravityScale:1,airControlScale:1,motionScale:1.38,laserScale:1.28,spikeSpeedScale:1.12,spikeWarning:.08,echoLimit:6,spotlight:false,color:'#d1964c'},
  blackout:{id:'blackout',label:'停电演出',description:'聚光灯只照亮你附近，危险物保留高对比轮廓。',gravityScale:1,airControlScale:1,motionScale:1,laserScale:1,spikeSpeedScale:1,spikeWarning:.12,echoLimit:6,spotlight:true,color:'#7d6ea8'},
  needle:{id:'needle',label:'热刺反应',description:'隐藏尖刺伏笔更明显，触发后的动作也更猛烈。',gravityScale:1,airControlScale:1,motionScale:1,laserScale:1,spikeSpeedScale:1.45,spikeWarning:.28,echoLimit:6,spotlight:false,color:'#c65361'},
  'echo-tax':{id:'echo-tax',label:'演员限额',description:'舞台只保留三个死亡残影，必须精确安排失败。',gravityScale:1,airControlScale:1,motionScale:1.05,laserScale:1,spikeSpeedScale:1,spikeWarning:.08,echoLimit:3,spotlight:false,color:'#8e6c72'},
};

function hash32(value:number):number{
  let x=value|0;x^=x>>>16;x=Math.imul(x,0x7feb352d);x^=x>>>15;x=Math.imul(x,0x846ca68b);x^=x>>>16;return x>>>0;
}

export function createRunSeed(slot:number,nonce=Date.now()):number{
  return (hash32((nonce|0)^Math.imul(slot+1,0x9e3779b1))||1)>>>0;
}

export function directorCommandFor(roomIndex:number,seed:number):DirectorCommand{
  const index=hash32((seed>>>0)^Math.imul(roomIndex+17,0x45d9f3b))%COMMAND_IDS.length;
  return COMMANDS[COMMAND_IDS[index]];
}

export function neutralDirectorCommand():DirectorCommand{
  return {id:'float',label:'标准演出',description:'本房间使用原始舞台规则。',gravityScale:1,airControlScale:1,motionScale:1,laserScale:1,spikeSpeedScale:1,spikeWarning:0,echoLimit:6,spotlight:false,color:'#7d7077'};
}
