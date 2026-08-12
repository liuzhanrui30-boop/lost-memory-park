import type {
  BeatDefinition,
  BlockDef,
  ButtonDef,
  ButtonRequirement,
  ContractDefinition,
  CrusherDef,
  LandmarkId,
  LaserDef,
  LauncherDef,
  OptionalCollectible,
  RoomDef,
  SentryDef,
  SpikeDef,
  SpotlightDef,
  WindZoneDef,
} from '../v2/types';
import { BOSS_STORY, EPILOGUE_STORY, PROLOGUE_STORY, roomStory } from '../story/narrative';
import { requirementLabel } from '../v9/action-locks';
import { lessonPressure, lessonTier } from '../v14/progression';
import { buttonSafetyZone, crusherSweptBounds, rectsOverlap, spikeObstacleConflicts, spikeSweptBounds } from '../v15/level-safety';

const WIDTH=3440;
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
const block=(id:string,x:number,y:number,w=128,kind:BlockDef['kind']='solid',extra:Partial<BlockDef>={}):BlockDef=>({id,x,y,w,h:28,kind,...extra});
const floor=(id:string,x:number,w:number,kind:BlockDef['kind']='solid',extra:Partial<BlockDef>={}):BlockDef=>({id,x,y:660,w,h:60,kind,...extra});
const spike=(id:string,x:number,y=626,direction:SpikeDef['direction']='up',extra:Partial<SpikeDef>={}):SpikeDef=>({id,x,y,w:34,h:34,direction,...extra});

export const HARD_CONTRACTS:readonly ContractDefinition[]=[
  {id:'contract-01',label:'第一次无伤',description:'不死亡抵达出口。失败不阻挡通关。',rule:'no-death'},
  {id:'contract-02',label:'熟练通过',description:'85 秒内抵达出口。',rule:'speed',target:85},
  {id:'contract-03',label:'不要犹豫',description:'不要在地面停留超过两秒。',rule:'relentless'},
  {id:'contract-04',label:'变化无伤',description:'不死亡通过全部变化机关。',rule:'no-death'},
  {id:'contract-05',label:'考核计时',description:'78 秒内完成本关。',rule:'speed',target:78},
  {id:'contract-06',label:'糖果终考',description:'不死亡完成本章最后一关。',rule:'no-death'},
  {id:'contract-07',label:'马戏无伤',description:'不死亡通过弹跳与炮火。',rule:'no-death'},
  {id:'contract-08',label:'空中熟练',description:'82 秒内抵达出口。',rule:'speed',target:82},
  {id:'contract-09',label:'保持移动',description:'不要在地面停留超过两秒。',rule:'relentless'},
  {id:'contract-10',label:'聚光无伤',description:'不死亡穿过聚光灯区域。',rule:'no-death'},
  {id:'contract-11',label:'马戏考核',description:'75 秒内完成本关。',rule:'speed',target:75},
  {id:'contract-12',label:'马戏终考',description:'不死亡完成本章最后一关。',rule:'no-death'},
  {id:'contract-13',label:'镜厅无伤',description:'不死亡通过第一段镜面路线。',rule:'no-death'},
  {id:'contract-14',label:'倒影熟练',description:'80 秒内抵达出口。',rule:'speed',target:80},
  {id:'contract-15',label:'不要停步',description:'不要在地面停留超过两秒。',rule:'relentless'},
  {id:'contract-16',label:'真假无伤',description:'不死亡通过真假落点。',rule:'no-death'},
  {id:'contract-17',label:'镜厅考核',description:'72 秒内完成本关。',rule:'speed',target:72},
  {id:'contract-18',label:'镜厅终考',description:'不死亡完成本章最后一关。',rule:'no-death'},
  {id:'contract-19',label:'城堡无伤',description:'不死亡通过第一段核心机关。',rule:'no-death'},
  {id:'contract-20',label:'核心熟练',description:'76 秒内抵达出口。',rule:'speed',target:76},
  {id:'contract-21',label:'不停机',description:'不要在地面停留超过两秒。',rule:'relentless'},
  {id:'contract-22',label:'红线无伤',description:'不死亡穿过红线机关。',rule:'no-death'},
  {id:'contract-23',label:'城堡考核',description:'68 秒内完成本关。',rule:'speed',target:68},
  {id:'contract-24',label:'最终无伤',description:'不死亡完成最后一关。',rule:'no-death'},
] as const;

export type ExecutionId='teeth'|'ceiling-thread'|'moving-needle'|'crossfire'|'orbit-cut'|'crumble-run'|'false-step'|'crusher-pair'|'spot-stutter'|'wind-thread'|'reverse-cannon';
export interface ExecutionScript {second:ExecutionId;finale:ExecutionId}
export const EXECUTION_SCRIPTS:readonly ExecutionScript[]=[
  {second:'teeth',finale:'ceiling-thread'},{second:'crumble-run',finale:'reverse-cannon'},{second:'moving-needle',finale:'teeth'},
  {second:'false-step',finale:'crusher-pair'},{second:'reverse-cannon',finale:'moving-needle'},{second:'ceiling-thread',finale:'crumble-run'},
  {second:'reverse-cannon',finale:'crusher-pair'},{second:'spot-stutter',finale:'reverse-cannon'},{second:'crumble-run',finale:'crusher-pair'},
  {second:'moving-needle',finale:'reverse-cannon'},{second:'spot-stutter',finale:'crumble-run'},{second:'crusher-pair',finale:'spot-stutter'},
  {second:'orbit-cut',finale:'false-step'},{second:'ceiling-thread',finale:'orbit-cut'},{second:'moving-needle',finale:'crusher-pair'},
  {second:'false-step',finale:'moving-needle'},{second:'spot-stutter',finale:'orbit-cut'},{second:'orbit-cut',finale:'crumble-run'},
  {second:'wind-thread',finale:'crossfire'},{second:'reverse-cannon',finale:'crusher-pair'},{second:'crumble-run',finale:'crossfire'},
  {second:'spot-stutter',finale:'wind-thread'},{second:'orbit-cut',finale:'reverse-cannon'},{second:'crusher-pair',finale:'crossfire'},
] as const;

export interface LockScript {A:ButtonRequirement;B:ButtonRequirement}
export const LOCK_SCRIPTS:readonly LockScript[]=[
  {A:'airborne',B:'rising'},{A:'double-jump',B:'falling'},{A:'momentum',B:'airborne'},{A:'reverse',B:'rising'},{A:'still',B:'double-jump'},{A:'momentum',B:'falling'},
  {A:'airborne',B:'rising'},{A:'double-jump',B:'falling'},{A:'momentum',B:'airborne'},{A:'reverse',B:'rising'},{A:'still',B:'double-jump'},{A:'momentum',B:'falling'},
  {A:'airborne',B:'rising'},{A:'double-jump',B:'falling'},{A:'momentum',B:'airborne'},{A:'reverse',B:'rising'},{A:'still',B:'double-jump'},{A:'momentum',B:'falling'},
  {A:'airborne',B:'rising'},{A:'double-jump',B:'falling'},{A:'momentum',B:'airborne'},{A:'reverse',B:'rising'},{A:'still',B:'double-jump'},{A:'momentum',B:'falling'},
] as const;

export type MechanicId='launcher'|'crumble'|'sticky'|'crusher'|'toggle'|'orbit'|'moving'|'wind'|'hidden'|'switch'|'fake'|'bounce'|'spotlight'|'laser'|'phase'|'ice'|'conveyor'|'applause'|'curtain';
export interface RoomRecipe {
  id:string;
  secondAct:readonly [MechanicId,MechanicId];
  finale:readonly [MechanicId,MechanicId];
  landmark:LandmarkId;
  branchSide:'second'|'finale';
  labels:readonly [string,string,string];
}

export const ROOM_RECIPES:readonly RoomRecipe[]=[
  {id:'candy-launch-collapse',secondAct:['launcher','crumble'],finale:['sticky','crusher'],landmark:'candy-press',branchSide:'second',labels:['糖纸起飞','礼盒失重','压榨机醒来']},
  {id:'candy-color-switch',secondAct:['toggle','hidden'],finale:['switch','moving'],landmark:'lollipop-gears',branchSide:'finale',labels:['礼貌陷阱','双色糖纸','机关礼盒']},
  {id:'candy-orbit-wind',secondAct:['orbit','moving'],finale:['launcher','wind'],landmark:'gift-jaw',branchSide:'second',labels:['糖浆断层','棒糖轨道','逆风大炮']},
  {id:'candy-sticky-jaw',secondAct:['sticky','crumble'],finale:['crusher','hidden'],landmark:'candy-press',branchSide:'finale',labels:['黏住脚步','包装纸会忘记','巨口开始咀嚼']},
  {id:'candy-switch-orbit',secondAct:['launcher','toggle'],finale:['orbit','moving'],landmark:'lollipop-gears',branchSide:'second',labels:['发射许可','双色齿轮','棒糖升降台']},
  {id:'candy-false-gift',secondAct:['hidden','fake'],finale:['crusher','sticky'],landmark:'gift-jaw',branchSide:'finale',labels:['伏击礼盒','假底板','吞咽程序']},
  {id:'circus-cannon-crush',secondAct:['launcher','bounce'],finale:['spotlight','crusher'],landmark:'cannon-stack',branchSide:'second',labels:['开场炮','三段弹跳','聚光灯下别动']},
  {id:'circus-applause',secondAct:['spotlight','moving'],finale:['applause','toggle'],landmark:'applause-eye',branchSide:'finale',labels:['灯灭前进','移动掌声','观众决定地板']},
  {id:'circus-curtain-teeth',secondAct:['crumble','bounce'],finale:['curtain','crusher'],landmark:'living-curtain',branchSide:'second',labels:['临时舞台','弹床谢幕','幕布开始合拢']},
  {id:'circus-return-shot',secondAct:['launcher','laser'],finale:['bounce','launcher'],landmark:'cannon-stack',branchSide:'finale',labels:['红线排练','炮火穿针','连续弹射']},
  {id:'circus-switch-light',secondAct:['spotlight','switch'],finale:['moving','launcher'],landmark:'applause-eye',branchSide:'second',labels:['掌声静止','暗场开关','最后一次腾空']},
  {id:'circus-living-curtain',secondAct:['crusher','bounce'],finale:['curtain','spotlight'],landmark:'living-curtain',branchSide:'finale',labels:['压台彩排','弹床逃生','幕布在看你']},
  {id:'mirror-phase-route',secondAct:['phase','moving'],finale:['toggle','orbit'],landmark:'broken-mirror',branchSide:'second',labels:['相位入口','倒影升降','房间开始旋转']},
  {id:'mirror-color-route',secondAct:['toggle','ice'],finale:['moving','phase'],landmark:'twin-shadow',branchSide:'finale',labels:['冰面分色','倒影换路','出口延迟出现']},
  {id:'mirror-orbit-crusher',secondAct:['orbit','phase'],finale:['crusher','moving'],landmark:'rotating-room',branchSide:'second',labels:['镜子的牙齿','轨道失真','压台升降']},
  {id:'mirror-false-loop',secondAct:['hidden','launcher'],finale:['fake','toggle'],landmark:'broken-mirror',branchSide:'finale',labels:['错误倒影','从镜面起飞','地板只存在一半']},
  {id:'mirror-stillness',secondAct:['spotlight','ice'],finale:['phase','moving'],landmark:'twin-shadow',branchSide:'second',labels:['别让倒影发现','冰上静止','两秒后的路线']},
  {id:'mirror-inversion',secondAct:['toggle','orbit'],finale:['phase','crusher'],landmark:'rotating-room',branchSide:'finale',labels:['顺序倒置','旋转真相','房间合上眼睛']},
  {id:'castle-core-belt',secondAct:['conveyor','moving'],finale:['crusher','laser'],landmark:'clock-hand',branchSide:'second',labels:['核心输送带','升降制动','钟表巨手落下']},
  {id:'castle-memory-lock',secondAct:['toggle','laser'],finale:['switch','crusher'],landmark:'memory-furnace',branchSide:'finale',labels:['城门换色','焚化红线','熔炉开关']},
  {id:'castle-collapse-wall',secondAct:['crumble','crusher'],finale:['hidden','moving'],landmark:'choice-engine',branchSide:'second',labels:['拆除顺序','城墙下压','尖刺追着舞台走']},
  {id:'castle-mixed-show',secondAct:['launcher','spotlight'],finale:['wind','crusher'],landmark:'clock-hand',branchSide:'finale',labels:['问候炮','在光里停住','逆风穿过巨手']},
  {id:'castle-furnace-line',secondAct:['laser','orbit'],finale:['conveyor','laser'],landmark:'memory-furnace',branchSide:'second',labels:['焚化红线','齿轮回廊','输送带交叉火力']},
  {id:'castle-choice-finale',secondAct:['toggle','crusher'],finale:['laser','spotlight'],landmark:'choice-engine',branchSide:'finale',labels:['两个按钮','选择机器','最后一束灯']},
] as const;

export const CHAPTER_ATTACK_THEMES:Record<number,string>={1:'糖豆抛射与糖针点射',2:'飞刀扇射与马戏连炮',3:'镜像双发与倒影狙击',4:'齿轮连射与王冠散射'};

interface BuildState {
  blocks:BlockDef[];spikes:SpikeDef[];buttons:ButtonDef[];lasers:LaserDef[];launchers:LauncherDef[];crushers:CrusherDef[];spotlights:SpotlightDef[];windZones:WindZoneDef[];traps:RoomDef['traps'];
}

interface ActScaffold {prefix:string;start:number;end:number;platforms:BlockDef[];safeFloor:BlockDef;landing:BlockDef}

function addPit(spikes:SpikeDef[],prefix:string,start:number,end:number):void{for(let x=start;x<end;x+=34)spikes.push(spike(`${prefix}-pit-${x}`,x,686));}

function scaffold(state:BuildState,prefix:string,start:number,end:number,variant:number):ActScaffold{
  const span=end-start,safeFloor=floor(`${prefix}-safe`,start-145,160),landing=floor(`${prefix}-landing`,end-75,110);
  const layouts:readonly (readonly [number,number,number,number?])[][]=[
    [[26,550,72],[55,430,68],[82,545,64]],
    [[22,445,68],[50,570,72],[78,390,64]],
    [[30,575,64],[59,455,62],[82,335,58]],
    [[24,520,88],[56,360,58],[82,525,58]],
    [[28,400,62],[52,535,64],[79,430,66]],
    [[20,560,70],[49,405,60],[76,560,62]],
    [[27,485,66],[57,575,58],[83,420,60]],
    [[23,375,72],[51,525,60],[80,350,60]],
  ];
  const layout=layouts[variant%layouts.length];
  const platforms=layout.map(([percent,y,w,h],i)=>block(`${prefix}-p${i}`,start+Math.round(span*percent/100),y,w+14,'solid',h?{h}:{}));
  const highRoute=block(`${prefix}-high-route`,start+Math.round(span*(variant%2?.66:.43)),250+(variant%3)*30,72,'oneway');
  state.blocks.push(safeFloor,...platforms,highRoute,landing);addPit(state.spikes,prefix,start+18,end-18);return{prefix,start,end,platforms,safeFloor,landing};
}

function dressAct(state:BuildState,act:ActScaffold,chapter:number,variant:number):void{
  const span=act.end-act.start;
  const finale=act.prefix.endsWith('finale'),edgeIndices=finale?[0,2]:[1];
  for(const i of edgeIndices){const p=act.platforms[i];if(p.w<62)continue;state.spikes.push({id:`${act.prefix}-edge-${i}`,x:p.x+p.w-20,y:p.y-20,w:20,h:20,direction:'up'});}
  const gap=(a:BlockDef,b:BlockDef)=>({x:(a.x+a.w+b.x)/2,y:Math.max(165,Math.min(a.y,b.y)-82)}),[p0,p1,p2]=act.platforms,gapA=gap(p0,p1),gapB=gap(p1,p2);
  if(chapter===1){
    for(const [i,point] of [gapA,gapB].entries())state.spikes.push({id:`${act.prefix}-candy-tooth-${i}`,x:point.x-14,y:point.y,w:28,h:28,direction:'down'});
  }else if(chapter===2){
    for(const [i,point] of [gapA,gapB].entries())state.spikes.push({id:`${act.prefix}-circus-knife-${i}`,x:point.x-14,y:point.y-i*12,w:28,h:28,direction:'down'});
  }else if(chapter===3){
    state.spikes.push({id:`${act.prefix}-orbit-blade`,x:gapB.x-15,y:gapB.y,w:30,h:30,direction:'down',orbit:{centerX:gapB.x,centerY:gapB.y+15,radiusX:52+(variant%3)*14,radiusY:30,speed:variant%2?-1.65:1.55,phase:variant*.43}});
    state.spikes.push({id:`${act.prefix}-mirror-needle`,x:gapA.x-15,y:gapA.y,w:30,h:30,direction:'down',moving:{axis:'x',distance:58+(variant%2)*16,speed:1.8}});
  }else{
    state.spikes.push({id:`${act.prefix}-castle-hanger`,x:gapB.x-15,y:gapB.y,w:30,h:30,direction:'down'});
    state.lasers.push({id:`${act.prefix}-low-sweep`,x:act.start+Math.round(span*.28),y:578,w:Math.round(span*.56),h:9,period:2.6,activeFor:.48,phase:1.2+variant*.19,direction:'horizontal'});
  }
}

function addSpikeRow(state:BuildState,prefix:string,x:number,y:number,count:number,direction:SpikeDef['direction']='up'):void{
  for(let i=0;i<count;i++)state.spikes.push({id:`${prefix}-${i}`,x:x+i*30,y,w:30,h:30,direction});
}

function addOpeningExecution(state:BuildState,index:number,chapter:number,lessonStep:number):void{
  const first=190+(index%4)*12,second=735+(index%3)*52;
  const placeRow=(prefix:string,start:number,y:number,count:number,direction:SpikeDef['direction'])=>{
    let x=start,placed=0;while(placed<count&&x<1160){const candidate={id:`${prefix}-${placed}`,x,y,w:30,h:30,direction};if(!state.blocks.some(block=>block.y<650&&rectsOverlap(candidate,block))){state.spikes.push(candidate);placed++;}x+=30;}
  };
  if(lessonStep>=1)placeRow(`v8-${index}-opening-fence-a`,first,630,3+(index%3),'up');
  if(lessonStep>=2)placeRow(`v8-${index}-opening-fence-b`,second,630,2+((index+1)%3),'up');
  if(lessonStep>=3)placeRow(`v8-${index}-opening-ceiling`,first+112,510-(index%2)*38,2,'down');
  if(chapter>=3&&lessonStep>=4){const sweeper={id:`v8-${index}-opening-sweeper`,x:535,y:560,w:32,h:32,direction:'right' as const,moving:{axis:'y' as const,distance:115,speed:2.15+chapter*.12}};if(!state.blocks.some(block=>rectsOverlap(spikeSweptBounds(sweeper),block)))state.spikes.push(sweeper);}
}

function addSignatureFeint(state:BuildState,act:ActScaffold,index:number,chapter:number,lessonStep:number):void{
  if(lessonStep<2)return;
  const prefix=`v15-${index}-${act.prefix.endsWith('finale')?'finale':'second'}-feint`,[p0,p1,p2]=act.platforms;
  if(chapter===1){
    const target=act.safeFloor,sid=`${prefix}-sugar-bite`;
    state.spikes.push({id:sid,x:target.x+target.w-24,y:target.y-24,w:24,h:24,direction:'up',hidden:true});
    state.traps.push({id:`${prefix}-trigger`,trigger:{x:target.x+22,y:0,w:34,h:650},action:'reveal',targets:[sid]});
  }else if(chapter===2){
    const left=act.safeFloor,right=p0,gapX=(left.x+left.w+right.x)/2;
    state.spikes.push({id:`${prefix}-knife`,x:gapX-15,y:Math.min(left.y,right.y)-48,w:30,h:30,direction:'down',moving:{axis:'y',distance:76,speed:1.72+lessonStep*.08}});
  }else if(chapter===3){
    const left=act.safeFloor,right=p0,gapX=(left.x+left.w+right.x)/2,gapY=Math.min(left.y,right.y)-18;
    state.spikes.push({id:`${prefix}-mirror-orbit`,x:gapX-15,y:gapY-15,w:30,h:30,direction:'down',orbit:{centerX:gapX,centerY:gapY,radiusX:28+lessonStep*1.2,radiusY:26,speed:lessonStep%2?-1.42:1.42,phase:index*.37}});
  }else{
    const left=act.safeFloor,right=p0,gapX=Math.round((left.x+left.w+right.x)/2);
    state.lasers.push({id:`${prefix}-clock-line`,x:gapX-6,y:205,w:12,h:455,period:3.2,activeFor:.52,phase:.75+(index%3)*.28,direction:'vertical'});
  }
}

function reserveButtonSafety(state:BuildState):void{
  const removed=new Set<string>();
  for(const button of state.buttons){
    const zone=buttonSafetyZone(button);
    for(const spike of state.spikes)if(rectsOverlap(zone,spikeSweptBounds(spike)))removed.add(spike.id);
    state.lasers=state.lasers.filter(laser=>!rectsOverlap(zone,laser));
    state.crushers=state.crushers.filter(crusher=>!rectsOverlap(zone,crusherSweptBounds(crusher)));
  }
  if(!removed.size)return;
  state.spikes=state.spikes.filter(spike=>!removed.has(spike.id));
  state.traps=state.traps.map(trap=>({...trap,targets:trap.targets.filter(target=>!removed.has(target))})).filter(trap=>trap.targets.length>0);
}

function reserveObstacleSafety(state:BuildState):void{
  // Generated acts are allowed to be hard, but a lethal path must never tunnel through
  // an authored platform, gate, or branch. Remove only the offending hazard and clean its
  // trigger references; the rest of the authored pattern remains intact.
  const removed=new Set<string>();
  for(const conflict of spikeObstacleConflicts({blocks:state.blocks,spikes:state.spikes})){
    const spike=state.spikes.find(candidate=>candidate.id===conflict.spikeId);
    // Opening fence/ceiling hazards and chapter feints are core teaching beats. Their
    // current collision pose is already clear, so keep them and reject only paths whose
    // starting hitbox visibly intersects a platform.
    if(spike&&spike.id.startsWith('v15-')){
      const block=state.blocks.find(candidate=>candidate.id===conflict.blockId);
      if(block&&!rectsOverlap({x:spike.x,y:spike.y,w:spike.w,h:spike.h},block))continue;
    }
    removed.add(conflict.spikeId);
  }
  if(!removed.size)return;
  state.spikes=state.spikes.filter(spike=>!removed.has(spike.id));
  state.traps=state.traps.map(trap=>({...trap,targets:trap.targets.filter(target=>!removed.has(target))})).filter(trap=>trap.targets.length>0);
}

function addExecution(state:BuildState,act:ActScaffold,execution:ExecutionId,chapter:number,variant:number):void{
  const id=`${act.prefix}-execution-${execution}`,span=act.end-act.start,p0=act.platforms[0],p1=act.platforms[1],p2=act.platforms[2];
  if(execution==='teeth')addSpikeRow(state,id,act.start+Math.round(span*.18),630,4+Math.min(2,chapter-1));
  else if(execution==='ceiling-thread'){addSpikeRow(state,`${id}-a`,p1.x-8,p1.y-82,2,'down');addSpikeRow(state,`${id}-b`,p2.x+8,p2.y-80,2,'down');}
  else if(execution==='moving-needle')state.spikes.push({id,x:p1.x-24,y:p1.y-32,w:32,h:32,direction:variant%2?'left':'right',moving:{axis:'x',distance:92+chapter*14,speed:2.05+chapter*.16}});
  else if(execution==='crossfire')state.lasers.push({id:`${id}-v`,x:act.start+Math.round(span*.48),y:185,w:12,h:475,period:2.35,activeFor:.72,phase:variant*.29,direction:'vertical'},{id:`${id}-h`,x:act.start+Math.round(span*.25),y:455,w:Math.round(span*.58),h:10,period:2.35,activeFor:.62,phase:1.16+variant*.29,direction:'horizontal'});
  else if(execution==='orbit-cut')state.spikes.push({id,x:p1.x,y:p1.y-70,w:32,h:32,direction:'down',orbit:{centerX:p1.x+p1.w/2,centerY:p1.y-42,radiusX:92+chapter*11,radiusY:54,speed:variant%2?-1.9:1.82,phase:variant*.36}});
  else if(execution==='crumble-run'){for(const p of [p0,p1,p2]){p.kind='crumble';p.crumbleDelay=.26+(variant%2)*.05;p.crumbleRespawn=1.55;}}
  else if(execution==='false-step'){p1.kind='fake';p2.kind='crumble';p2.crumbleDelay=.3;p2.crumbleRespawn=1.55;addSpikeRow(state,`${id}-catch`,p1.x+10,p1.y+30,2,'up');}
  else if(execution==='crusher-pair')state.crushers.push({id:`${id}-a`,x:act.start+Math.round(span*.34),y:55,w:82,h:170,axis:'y',distance:385,period:2.35,phase:variant*.25},{id:`${id}-b`,x:act.start+Math.round(span*.67),y:80,w:76,h:150,axis:'y',distance:330,period:2.55,phase:1.12+variant*.19});
  else if(execution==='spot-stutter')state.spotlights.push({id:`${id}-a`,x:act.start+20,y:170,w:Math.round(span*.48),h:490,period:2.35,activeFor:.72,phase:0,warning:.52},{id:`${id}-b`,x:act.start+Math.round(span*.48),y:170,w:Math.round(span*.48),h:490,period:2.35,activeFor:.72,phase:1.17,warning:.52});
  else if(execution==='wind-thread'){state.windZones.push({id,x:act.start+25,y:180,w:span-45,h:480,forceX:variant%2?-310:320,forceY:-95});state.spikes.push({id:`${id}-needle`,x:p1.x+10,y:p1.y-35,w:34,h:34,direction:'up',moving:{axis:'x',distance:95,speed:2.4}});}
  else if(execution==='reverse-cannon')state.launchers.push({id,x:p2.x+p2.w/2-29,y:p2.y-55,w:58,h:55,vx:-500-chapter*24,vy:-610,facing:-1,cooldown:.7});
}

function addSkillLock(state:BuildState,act:ActScaffold,index:number,slot:'A'|'B',requires:ButtonRequirement):BlockDef{
  const gateId=`v9-${index}-lock-${slot}`,candidates=act.platforms.filter(platform=>platform.kind===undefined||platform.kind==='solid'||platform.kind==='oneway'||platform.kind==='ice'||platform.kind==='sticky'||platform.kind==='conveyor');
  let platform=requires==='momentum'?block(`v12-${index}-runway-${slot}`,act.end-275,535-(index%2)*42,188,'oneway'):candidates[(index+(slot==='A'?1:2))%candidates.length];
  if(requires==='momentum')state.blocks.push(platform);
  if(!platform){platform=block(`v9-${index}-podium-${slot}`,act.end-205,520-(index%3)*48,86,'oneway');state.blocks.push(platform);}
  state.blocks.push({id:gateId,x:act.end-48,y:120,w:34,h:540,kind:'gate'});
  state.buttons.push({id:`${gateId}-switch`,x:platform.x+platform.w/2-23,y:platform.y-27,w:46,h:27,target:gateId,requires,label:`${requirementLabel(requires)}锁 ${slot} 已解除`});
  // 锁后给出一个短暂安全落点，让难度形成“压力—解题—呼吸—再升级”的锯齿节奏。
  const recovery=block(`v9-${index}-recovery-${slot}`,act.end+4,565-(index%2)*44,104,'oneway');state.blocks.push(recovery);return recovery;
}

function checkpointOn(platform:BlockDef):{x:number;y:number;w:number;h:number}{return{x:platform.x+26,y:platform.y-60,w:34,h:60};}

const ENCORE_LABELS:Record<number,readonly string[]>={
  1:['糖牙返场','焦糖断桥','礼盒加演','糖浆终拍','棒糖回旋','巨口谢幕'],
  2:['弹床返场','飞刀空拍','炮口换位','掌声停格','幕布高台','空中谢幕'],
  3:['相位返场','倒影错拍','镜面升降','真假落点','旋转终拍','出口重组'],
  4:['核心返场','齿轮断桥','红线终拍','输送逆流','钟摆换位','园长谢幕'],
};

function addEncore(state:BuildState,index:number,chapter:number,hazardLevel:0|1|2):{label:string;optional:OptionalCollectible}{
  const prefix=`v12-${index}-encore`,shift=index%2?10:0;
  state.blocks.push(floor(`${prefix}-rest`,2968,86),floor(`${prefix}-landing`,3370,70));
  addPit(state.spikes,prefix,3038,3370);
  const p0=block(`${prefix}-p0`,3060,550-(index%3)*14,78,'oneway');
  const p1=block(`${prefix}-p1`,3168,452+(index%2)*20,74,'oneway');
  const p2=block(`${prefix}-p2`,3276,540-(index%2)*28,78,'oneway');
  const high=block(`${prefix}-high`,3200+(index%3)*7,300-(index%2)*20,76,'oneway');
  state.blocks.push(p0,p1,p2,high);

  if(chapter===1){
    p0.kind='crumble';p0.crumbleDelay=.42;p0.crumbleRespawn=1.75;
    if(hazardLevel>=1)p1.kind='sticky';
    if(hazardLevel>=2){p2.kind='moving';p2.toY=p2.y-132;p2.speed=1.42;state.spikes.push({id:`${prefix}-tooth-a`,x:p1.x+5,y:p1.y-88,w:28,h:28,direction:'down'},{id:`${prefix}-tooth-b`,x:p1.x+p1.w-33,y:p1.y-88,w:28,h:28,direction:'down'});}
  }else if(chapter===2){
    p0.kind='bounce';
    if(hazardLevel>=1){p1.kind='moving';p1.toY=p1.y-118;p1.speed=1.52;}
    if(hazardLevel>=2){p2.kind='bounce';state.spotlights.push({id:`${prefix}-freeze-light`,x:3125,y:155,w:215,h:505,period:2.9,activeFor:.82,phase:.45+(index%3)*.24,warning:.58});state.spikes.push({id:`${prefix}-knife`,x:3290,y:315,w:30,h:30,direction:'down',moving:{axis:'y',distance:92,speed:2.05}});}
  }else if(chapter===3){
    p0.kind='phase';p0.phasePeriod=2.8;p0.phaseActiveFor=2.05;p0.phaseOffset=0;
    if(hazardLevel>=1){p1.kind='moving';p1.toY=p1.y-122;p1.speed=1.38;}
    if(hazardLevel>=2){p2.kind='phase';p2.phasePeriod=2.8;p2.phaseActiveFor=2.05;p2.phaseOffset=.92;state.spikes.push({id:`${prefix}-orbit-blade`,x:high.x,y:high.y-65,w:30,h:30,direction:'down',orbit:{centerX:high.x+high.w/2,centerY:high.y-46,radiusX:70,radiusY:30,speed:index%2?-1.62:1.62,phase:index*.31}});}
  }else{
    p0.kind='conveyor';p0.forceX=index%2?-145:145;
    if(hazardLevel>=1){p1.kind='moving';p1.toY=p1.y-135;p1.speed=1.6;}
    if(hazardLevel>=2){p2.kind='crumble';p2.crumbleDelay=.3;p2.crumbleRespawn=1.58;state.lasers.push({id:`${prefix}-core-line`,x:3238+shift,y:178,w:12,h:482,period:2.62,activeFor:.72,phase:.66+(index%3)*.21,direction:'vertical'});state.spikes.push({id:`${prefix}-gear`,x:3120,y:470,w:32,h:32,direction:'right',moving:{axis:'y',distance:105,speed:2.22}});}
  }

  const label=ENCORE_LABELS[chapter][index%6];
  return{label,optional:{id:`note-encore-${index+1}`,x:high.x+30,y:high.y-38,w:28,h:34,title:`返场节目单 ${String(index+1).padStart(2,'0')}`,text:`${label}：位移特技已经停用。这里记录的只有助跑、起跳、空中修正和落点。`}};
}

function sentriesFor(index:number,chapter:number,count:0|1|2):SentryDef[]{
  const key=clamp(chapter,1,4) as 1|2|3|4;
  const patterns={1:['arc','aimed'],2:['fan','burst'],3:['mirror','aimed'],4:['burst','fan']} as const,labels={1:['糖豆抛射','糖针点射'],2:['飞刀扇射','马戏连炮'],3:['镜像双发','倒影狙击'],4:['齿轮连射','王冠散射']} as const,colors={1:['#d65365','#a93f55'],2:['#dca83f','#cf5b55'],3:['#45a99e','#b44763'],4:['#c64150','#df9f39']} as const;
  const periods={1:[2.72,2.48],2:[2.48,2.28],3:[2.34,2.16],4:[2.18,2.02]} as const,warnings={1:[.88,.76],2:[.78,.72],3:[.74,.68],4:[.7,.64]} as const;
  return[
    {id:`v10-sentry-${index}-a`,x:1080+(index%3)*62,y:175+(index%3)*70,range:760,period:periods[key][0],projectileSpeed:290+chapter*25,warning:warnings[key][0],phase:(index%4)*.31,pattern:patterns[key][0],label:labels[key][0],shotColor:colors[key][0]},
    {id:`v10-sentry-${index}-b`,x:2460+(index%2)*105,y:165+(index%3)*82,range:790,period:periods[key][1],projectileSpeed:310+chapter*28,warning:warnings[key][1],phase:.95+(index%3)*.27,pattern:patterns[key][1],label:labels[key][1],shotColor:colors[key][1]},
  ].slice(0,count);
}

function applyMechanic(state:BuildState,act:ActScaffold,mechanic:MechanicId,slot:number,chapter:number):void{
  const id=`${act.prefix}-${mechanic}-${slot}`,p=act.platforms[slot%act.platforms.length],other=act.platforms[(slot+1)%act.platforms.length];
  if(mechanic==='launcher')state.launchers.push({id,x:act.start-74+slot*18,y:600,w:64,h:60,vx:chapter===3&&slot%2?-560:560,vy:-735,facing:chapter===3&&slot%2?-1:1});
  else if(mechanic==='crusher')state.crushers.push({id,x:act.start+205+slot*42,y:70,w:108,h:190,axis:'y',distance:chapter===4?390:330,period:2.65+slot*.22,phase:slot*.54});
  else if(mechanic==='spotlight')state.spotlights.push({id,x:act.start+40,y:165,w:act.end-act.start-70,h:485,period:3+slot*.25,activeFor:1.08+slot*.12,phase:slot*.72,warning:.48});
  else if(mechanic==='applause')state.spotlights.push({id:`${id}-a`,x:act.start+25,y:150,w:245,h:500,period:2.55,activeFor:.9,phase:0,warning:.5},{id:`${id}-b`,x:act.start+275,y:150,w:245,h:500,period:2.55,activeFor:.9,phase:1.28,warning:.5});
  else if(mechanic==='curtain')state.crushers.push({id:`${id}-l`,x:act.start-20,y:120,w:95,h:470,axis:'x',distance:185,period:3.15,phase:0},{id:`${id}-r`,x:act.end-75,y:120,w:95,h:470,axis:'x',distance:-185,period:3.15,phase:0});
  else if(mechanic==='crumble'){p.kind='crumble';p.crumbleDelay=.38;p.crumbleRespawn=1.8;other.kind='crumble';other.crumbleDelay=.42;other.crumbleRespawn=1.7;}
  else if(mechanic==='toggle'){
    const group=`${act.prefix}-color-${slot}`;p.kind='toggle';p.group=group;p.activeWhen=true;other.kind='toggle';other.group=group;other.activeWhen=false;state.buttons.push({id:`${id}-button`,x:act.start-88,y:634,w:48,h:24,target:`group:${group}`,label:'双色舞台已经交换'});
  }else if(mechanic==='sticky'){act.safeFloor.kind='sticky';act.landing.kind='sticky';}
  else if(mechanic==='orbit'){p.kind='orbit';p.orbit={centerX:p.x+p.w/2,centerY:p.y+10,radiusX:80+slot*12,radiusY:54+slot*18,speed:slot%2?-1.15:1.28,phase:slot*.7};}
  else if(mechanic==='moving'){p.kind='moving';p.toY=clamp(p.y-135,270,560);p.speed=1.25+slot*.22;}
  else if(mechanic==='wind')state.windZones.push({id,x:act.start+20,y:180,w:act.end-act.start-25,h:470,forceX:slot%2?-240:265,forceY:-70});
  else if(mechanic==='hidden'){
    const targets=[] as string[];for(let i=0;i<3;i++){const sid=`${id}-spike-${i}`;targets.push(sid);state.spikes.push(spike(sid,other.x+15+i*34,other.y-34,'up',{hidden:true}));}
    const triggerX=Math.max(act.start,other.x-80);
    // Hidden spikes use the legacy trigger system and therefore remain fully resettable.
    state.traps.push({id:`${id}-trigger`,trigger:{x:triggerX,y:0,w:55,h:650},action:'reveal',targets});
  }else if(mechanic==='switch'){
    const gateId=`${id}-gate`;state.blocks.push({id:gateId,x:act.end-135,y:430,w:34,h:230,kind:'gate'});state.buttons.push({id:`${id}-button`,x:p.x+p.w/2-22,y:p.y-24,w:44,h:24,target:gateId,label:'支路开关已启动'});
  }else if(mechanic==='fake')p.kind='fake';
  else if(mechanic==='bounce')p.kind='bounce';
  else if(mechanic==='phase'){p.kind='phase';p.phasePeriod=2.7;p.phaseActiveFor=1.82;p.phaseOffset=slot*.82;}
  else if(mechanic==='ice'){act.safeFloor.kind='ice';act.landing.kind='ice';}
  else if(mechanic==='conveyor'){act.safeFloor.kind='conveyor';act.safeFloor.forceX=150;act.landing.kind='conveyor';act.landing.forceX=-110;}
  else if(mechanic==='laser')state.lasers.push({id,x:act.start+270+slot*35,y:180,w:14,h:480,period:2.6+slot*.25,activeFor:.82,phase:slot*.74,direction:'vertical'});
}

function directedRoom(room:RoomDef,index:number):RoomDef{
  const lessonStep=index%6,pressure=lessonPressure(lessonStep),recipe=ROOM_RECIPES[index],execution=EXECUTION_SCRIPTS[index],lockScript=LOCK_SCRIPTS[index],state:BuildState={blocks:structuredClone(room.blocks),spikes:structuredClone(room.spikes),buttons:structuredClone(room.buttons??[]),lasers:structuredClone(room.lasers??[]),launchers:[],crushers:[],spotlights:[],windZones:structuredClone(room.windZones??[]),traps:structuredClone(room.traps)};addOpeningExecution(state,index,room.chapter,lessonStep);
  const exitBottom=clamp(room.exit.y+room.exit.h,210,600);for(let i=0;i<4;i++)state.blocks.push(block(`v6-${index}-bridge-${i}`,1200+i*100,clamp(exitBottom+i*78,210,600),120,'oneway'));
  state.blocks.push(floor(`v6-${index}-rest-a`,1490,128),floor(`v6-${index}-rest-b`,2200,118));
  const second=scaffold(state,`v6-${index}-second`,1640,2180,index),finale=scaffold(state,`v6-${index}-finale`,2330,2990,index+2);
  recipe.secondAct.slice(0,pressure.secondMechanics).forEach((mechanic,slot)=>applyMechanic(state,second,mechanic,slot,room.chapter));recipe.finale.slice(0,pressure.finaleMechanics).forEach((mechanic,slot)=>applyMechanic(state,finale,mechanic,slot+2,room.chapter));
  if(pressure.dressSecond)dressAct(state,second,room.chapter,index);if(pressure.dressFinale)dressAct(state,finale,room.chapter,index+3);if(pressure.executionSecond)addExecution(state,second,execution.second,room.chapter,index);if(pressure.executionFinale)addExecution(state,finale,execution.finale,room.chapter,index+3);addSignatureFeint(state,lessonStep%2?second:finale,index,room.chapter,lessonStep);const recoveryA=addSkillLock(state,second,index,'A',lockScript.A),recoveryB=addSkillLock(state,finale,index,'B',lockScript.B);
  const branchX=recipe.branchSide==='second'?1980:2745,branchY=300+(index%3)*35;state.blocks.push(block(`v6-${index}-branch-step`,branchX-145,branchY+105,112,'oneway'),block(`v6-${index}-branch`,branchX,branchY,118,'oneway'));
  const encore=addEncore(state,index,room.chapter,pressure.encoreHazards);
  const optional:OptionalCollectible={id:`note-directed-${index+1}`,x:branchX+44,y:branchY-42,w:28,h:34,title:`导演手记 ${String(index+1).padStart(2,'0')}`,text:[...recipe.labels].join('。')+'。这不是随机事故，而是写进节目单的顺序。'};
  const beats:BeatDefinition[]=[{x:1160,label:recipe.labels[0],intensity:.25,role:'learn'},{x:2140,label:recipe.labels[1],intensity:.5,role:'practice',checkpoint:true},{x:2920,label:recipe.labels[2],intensity:.78,role:'test',checkpoint:true},{x:3360,label:encore.label,intensity:.95,role:'finish',checkpoint:true}];
  const baseSpeed=[0,130,149,168,187][room.chapter],maxSpeed=[0,224,249,274,298][room.chapter];
  const pursuit=index%6===5?{id:`v10-pursuit-${index}`,startX:-115,triggerX:260,baseSpeed,maxSpeed,width:96}:undefined;
  const focus=`${recipe.labels[0]} → ${recipe.labels[1]} → ${recipe.labels[2]}`;
  reserveButtonSafety(state);
  reserveObstacleSafety(state);
  return{...structuredClone(room),worldWidth:WIDTH,worldHeight:720,exit:{...room.exit,x:WIDTH-58,y:566,w:42,h:94},blocks:state.blocks,spikes:state.spikes,traps:state.traps,buttons:state.buttons,lasers:state.lasers,launchers:state.launchers,portals:[],crushers:state.crushers,spotlights:state.spotlights,windZones:state.windZones,checkpoints:[...(room.checkpoints??(room.checkpoint?[room.checkpoint]:[])),{x:1482,y:600,w:34,h:60},checkpointOn(recoveryA),checkpointOn(recoveryB)],optional:[...(room.optional??[]),optional,encore.optional],beats,landmark:recipe.landmark,remixKind:focus,lesson:{step:lessonStep+1,total:6,tier:lessonTier(lessonStep),focus},story:roomStory(room.chapter,lessonStep),pursuit,sentries:sentriesFor(index,room.chapter,pressure.sentries),attackTheme:CHAPTER_ATTACK_THEMES[room.chapter],contract:HARD_CONTRACTS[index]};
}

export function upgradePrologue(room:RoomDef):RoomDef{
  const blocks=[floor('opening-floor-a',0,640),block('opening-crumble-a',712,542,152,'crumble',{crumbleDelay:.5,crumbleRespawn:1.75}),block('opening-crumble-b',892,462,152,'crumble',{crumbleDelay:.48,crumbleRespawn:1.8}),block('opening-high-step',1072,400,142,'oneway'),block('opening-landing-step',1192,510,112,'oneway'),floor('opening-floor-b',1280,680)];
  const pit=[] as SpikeDef[];addPit(pit,'opening',640,1280);for(let i=0;i<3;i++)pit.push({id:`opening-mandatory-jump-${i}`,x:330+i*30,y:630,w:30,h:30,direction:'up'});
  return{...structuredClone(room),name:'序章 · 先学会活着',hint:'先看指示牌熟悉 WASD；大炮和尖刺会依次教你移动、跳跃与二段跳。',message:'广播：你是这座乐园的设计师。你把痛苦做成关卡，又抹掉了自己的记忆。现在沿路线找回证据。',story:PROLOGUE_STORY,worldWidth:1960,exit:{x:1895,y:566,w:42,h:94},blocks,spikes:pit,traps:[],launchers:[{id:'opening-launcher',x:565,y:600,w:66,h:60,vx:565,vy:-710,facing:1}],portals:[],crushers:[{id:'opening-hand',x:1570,y:70,w:112,h:190,axis:'y',distance:385,period:3.2,phase:.35}],spotlights:[],windZones:[],lasers:[],buttons:[],checkpoints:[{x:1430,y:600,w:34,h:60}],beats:[{x:500,label:'基本移动',intensity:.12,role:'learn'},{x:1120,label:'二段跳',intensity:.42,role:'practice'},{x:1760,label:'综合躲避',intensity:.72,role:'finish',checkpoint:true}],tutorialSigns:[{id:'wasd-guide',x:74,y:330,w:430,h:242,title:'新手指示牌',rows:[{keys:'A / D',label:'左右移动'},{keys:'W / 空格',label:'跳跃 · 再按一次二段跳'},{keys:'S / ↓',label:'向下穿过薄板'},{keys:'R',label:'回到最近检查点'},{keys:'右键 / 退格',label:'单删 / 全清死亡残影'}]}],landmark:'candy-press',pursuit:{id:'opening-pursuit',startX:-120,triggerX:540,baseSpeed:96,maxSpeed:174,width:92},sentries:[{id:'opening-sentry',x:1510,y:245,range:620,period:3.25,projectileSpeed:282,warning:1.05,phase:.4,pattern:'arc',label:'糖豆抛射',shotColor:'#d65365'}],attackTheme:'糖豆抛射',contract:{id:'opening-contract',label:'开场试镜',description:'45 秒内逃出序章。失败不阻挡通关。',rule:'speed',target:45}};
}

function upgradeBoss(room:RoomDef):RoomDef{
  const chapter=room.chapter,launchers=chapter===1?[{id:'boss-candy-launch',x:170,y:600,w:62,h:60,vx:500,vy:-680,facing:1 as const}]:[],crushers=chapter===4?[{id:'boss-core-hand',x:660,y:40,w:120,h:170,axis:'y' as const,distance:285,period:3.1,phase:.4}]:[],spotlights=chapter===2?[{id:'boss-applause-light',x:190,y:170,w:900,h:470,period:3.2,activeFor:1.05,phase:.3,warning:.5}]:[];
  return{...structuredClone(room),story:BOSS_STORY[chapter],launchers,portals:[],crushers,spotlights,attackTheme:CHAPTER_ATTACK_THEMES[chapter],beats:[],landmark:(['candy-press','cannon-stack','broken-mirror','memory-furnace'] as LandmarkId[])[chapter-1]};
}

export function directedCampaign(base:RoomDef[]):RoomDef[]{let normal=0;return base.map(room=>room.kind==='normal'?directedRoom(room,normal++):room.kind==='prologue'?upgradePrologue(room):room.kind==='boss'?upgradeBoss(room):{...structuredClone(room),story:EPILOGUE_STORY,portals:[],worldWidth:room.worldWidth??1280,worldHeight:room.worldHeight??720,checkpoints:room.checkpoints??(room.checkpoint?[room.checkpoint]:[])});}
