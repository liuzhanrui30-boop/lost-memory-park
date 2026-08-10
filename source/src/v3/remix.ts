import type { BlockDef, OptionalCollectible, RoomDef, SpikeDef, WindZoneDef } from '../v2/types';

const WIDTH=2240;
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const platform=(id:string,x:number,y:number,w:number,kind:BlockDef['kind']='solid',color='#c98182',extra:Partial<BlockDef>={}):BlockDef=>({id,x,y,w,h:28,kind,color,...extra});
const floor=(id:string,x:number,w:number,color='#9d716d',kind:BlockDef['kind']='solid',extra:Partial<BlockDef>={}):BlockDef=>({id,x,y:660,w,h:60,kind,color,...extra});
const spike=(id:string,x:number,y:number,direction:SpikeDef['direction']='up',extra:Partial<SpikeDef>={}):SpikeDef=>({id,x,y,w:34,h:34,direction,...extra});
const note=(index:number,x:number,y:number):OptionalCollectible=>({id:`note-remaster-${index+1}`,x,y,w:28,h:34,title:`重制舞台批注 ${String(index+1).padStart(2,'0')}`,text:['旧地图到这里就结束了。园长把后半段藏在布景后面。','地板下有轮轴。这里从来不是一张静止的地图。','每一次“意外”都在节目单上有准确秒数。','新演员被要求先学会逃跑，再学习为什么要逃。','灯泡的电线通向同一个大脑活动记录仪。','这段舞台不是为了阻止你，而是为了观察你如何作弊。'][index%6]});

function descendingBridge(prefix:string,startY:number):BlockDef[]{
  const blocks:BlockDef[]=[];let y=startY;
  for(let i=0;i<4;i++){y=clamp(y+(y<560?82:0),260,620);blocks.push(platform(`${prefix}-bridge-${i}`,1280+i*145,y,132));}
  return blocks;
}

function extension(room:RoomDef,index:number):RoomDef{
  const prefix=`rx${index}`,kind=index%6,startY=clamp(room.exit.y+room.exit.h,220,660),chapter=room.chapter;
  const blocks:BlockDef[]=[...descendingBridge(prefix,startY)],spikes:SpikeDef[]=[],lasers=[...(room.lasers??[])],buttons=[...(room.buttons??[])],traps=[...room.traps],windZones:WindZoneDef[]=[];
  const baseColor=['#c98578','#8b6468','#728382','#78545d'][chapter-1]??'#8b6468';
  const cpTop=blocks[1]?.y??600,checkpoints=[...(room.checkpoint?[room.checkpoint]:[]),{x:1432,y:cpTop-60,w:34,h:60}];
  if(kind===0){
    blocks.push(floor(`${prefix}-belt-a`,1810,190,baseColor,'conveyor',{forceX:145}),floor(`${prefix}-belt-b`,2000,240,baseColor,'conveyor',{forceX:-105}));
    spikes.push(spike(`${prefix}-belt-spike-a`,1885,626),spike(`${prefix}-belt-spike-b`,2058,626));
  }else if(kind===1){
    blocks.push(platform(`${prefix}-phase-a`,1780,500,130,'phase','#8da8a5',{phasePeriod:2.7,phaseActiveFor:1.85}),platform(`${prefix}-phase-b`,1970,410,130,'phase','#8da8a5',{phasePeriod:2.7,phaseActiveFor:1.85,phaseOffset:.9}),platform(`${prefix}-oneway`,2080,560,110,'oneway','#d5b26d'),floor(`${prefix}-phase-exit`,2180,60,baseColor));
    spikes.push(spike(`${prefix}-phase-floor-a`,1745,626),spike(`${prefix}-phase-floor-b`,1915,626));
  }else if(kind===2){
    blocks.push(floor(`${prefix}-wind-floor`,1750,490,baseColor));windZones.push({id:`${prefix}-wind`,x:1680,y:215,w:500,h:420,forceX:chapter%2?245:-210,forceY:-55});
    spikes.push(spike(`${prefix}-wind-a`,1875,626),spike(`${prefix}-wind-b`,1909,626),spike(`${prefix}-wind-c`,2110,626));
  }else if(kind===3){
    blocks.push(floor(`${prefix}-orbit-floor`,1710,530,baseColor));
    spikes.push(spike(`${prefix}-orbit-a`,1840,410,'up',{orbit:{centerX:1870,centerY:500,radiusX:95,radiusY:78,speed:1.7}}),spike(`${prefix}-orbit-b`,2070,470,'up',{orbit:{centerX:2070,centerY:520,radiusX:75,radiusY:105,speed:-1.35,phase:1.2}}));
  }else if(kind===4){
    blocks.push(platform(`${prefix}-fake-a`,1740,540,125,'fake','#eee0ce'),platform(`${prefix}-fake-b`,1910,470,125,'fake','#eee0ce'),platform(`${prefix}-fake-c`,2080,550,125,'fake','#eee0ce'),floor(`${prefix}-landing`,2200,40,baseColor));
    for(let x=1680;x<2210;x+=34)spikes.push(spike(`${prefix}-pit-${x}`,x,686));
  }else{
    blocks.push(platform(`${prefix}-lift`,1760,535,140,'moving',baseColor,{toY:390,speed:1.4}),platform(`${prefix}-anchor-ledge`,1960,380,120,'oneway','#d5b26d'),floor(`${prefix}-gate-floor`,1730,510,baseColor),{id:`${prefix}-gate`,x:2140,y:430,w:34,h:230,kind:'gate',color:'#725165'});
    spikes.push(spike(`${prefix}-choice-a`,1850,626),spike(`${prefix}-choice-b`,1884,626));buttons.push({id:`${prefix}-button`,x:2000,y:354,w:44,h:22,target:`${prefix}-gate`,label:'后台捷径已展开'});
  }
  const exit={...room.exit,x:WIDTH-62,y:566,w:42,h:94};
  return{...room,worldWidth:WIDTH,worldHeight:720,remixKind:['conveyor','phase','wind','orbit','collapse','anchor'][kind],exit,blocks:[...room.blocks,...blocks],spikes:[...room.spikes,...spikes],traps,buttons,lasers,checkpoints,windZones:[...(room.windZones??[]),...windZones],optional:[...(room.optional??[]),note(index,2030,Math.max(245,Math.min(585,(blocks.at(-1)?.y??600)-62)))]};
}

export function remixCampaign(base:RoomDef[]):RoomDef[]{
  let normalIndex=0;return base.map(room=>room.kind==='normal'?extension(structuredClone(room),normalIndex++):{...structuredClone(room),worldWidth:room.worldWidth??1280,worldHeight:room.worldHeight??720,checkpoints:room.checkpoints??(room.checkpoint?[room.checkpoint]:[])});
}
