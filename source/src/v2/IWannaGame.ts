import { AudioSystem } from '../game/AudioSystem';
import { rooms } from './rooms';
import { directorCommandFor, neutralDirectorCommand, type DirectorCommand } from './director';
import { compressGhost, ghostPositionAt, type GhostSample } from './ghost';
import { findCornerCorrection, findSupport, platformLaunchVelocity, shouldProbeSupport, splitMotion } from '../v3/kinematics';
import { orbitPosition, phaseActiveAt, windDelta } from '../v3/mechanics';
import { bossVolley } from '../v3/boss-patterns';
import { chapterArt, shade, visualSeed, type ChapterArt } from '../v4/art-direction';
import { beatReward, crumbleStateAt, crusherPoseAt, launcherResult, spotlightMovementIsUnsafe, spotlightStateAt } from '../v6/stage-mechanics';
import { drawBeatMarker, drawCrusher, drawLandmark, drawLauncher, drawSpotlight } from '../v6/stage-render';
import { aimedVelocity, comboTier, contractSuccess, isNearMiss, leadTarget, pursuitVelocity } from '../v7/hardcore-mechanics';
import { requirementGlyph, requirementLabel, requirementMet } from '../v9/action-locks';
import { buildProjectilePattern,patternGlyph,patternLabel } from '../v10/projectile-patterns';
import { bossStageReady as isBossStageReady,bossWaveRequirement as requiredBossWaves } from '../v11/boss-stage';
import { fixedBackdropOffset,gentleShake,smoothCamera,snapCameraX,stableCameraTarget } from '../v12/stable-camera';
import { preferredRenderScale } from '../v12/render-quality';
import { compactTouchViewport } from '../v12/touch-ui';
import type { BlockDef, ButtonDef, CrusherDef, EndingId, GhostPoint, LaserDef, OptionalCollectible, Rect, RoomDef, SentryDef, SentryPattern, SpikeDef, V2Save } from './types';
import { MAX_ECHOES, defaultSettings, newV2Save, v2Ending } from './types';

type BlockRun = BlockDef & { baseX:number;baseY:number;active:boolean;touched:number;lastX:number;lastY:number;crumbleTouched:number|null };
type SpikeRun = SpikeDef & { baseX:number;baseY:number;active:boolean;vx:number;vy:number;reveal:number };
type ButtonRun = ButtonDef & { pressed:boolean };
type BossShot = {x:number;y:number;vx:number;vy:number;r:number;warning:number;color:string};
type DirectorShot = BossShot&{id:string;targetX:number;targetY:number;life:number;gravity:number;pattern:SentryPattern;label:string};

export interface V2Callbacks {
  onHud:(data:{room:number;deaths:number;shards:number;elapsed:number;progress:number;jumps:number;heat:number;echoes:number;mode:V2Save['mode'];director:DirectorCommand;beats:{current:number;total:number;gold:number};combo:{value:number;tier:number;nearMiss:boolean};lock:{remaining:number;next:string};contract:{label:string;description:string;state:'active'|'failed'|'cleared'|'none';seals:number};boss:{active:boolean;phase:number;max:number;waves:number;required:number}})=>void;
  onRoom:(room:RoomDef)=>void;
  onToast:(text:string)=>void;
  onDeath:(text:string)=>void;
  onSave:(save:V2Save)=>void;
  onEnding:(ending:EndingId,save:V2Save)=>void;
  onMemory?:(id:string)=>void;
  onOptional?:(item:OptionalCollectible)=>void;
  onAchievement?:(id:string)=>void;
  onRoomResult?:(result:{room:string;time:number;deaths:number;rank:string;heat?:number})=>void;
  onModeComplete?:(mode:V2Save['mode'],save:V2Save)=>void;
  onDirector?:(command:DirectorCommand)=>void;
  onBeat?:(result:{index:number;label:string;gold:boolean})=>void;
  onContract?:(result:{label:string;success:boolean;seals:number})=>void;
}

type InputAction='left'|'right'|'jump'|'restart';

const W=1280,H=720,PW=30,PH=42,STEP=1/60;

export class IWannaGame {
  readonly audio=new AudioSystem();
  private canvas:HTMLCanvasElement;
  private ctx:CanvasRenderingContext2D;
  private callbacks:V2Callbacks;
  private save:V2Save=newV2Save();
  private room!:RoomDef;
  private blocks:BlockRun[]=[];
  private spikes:SpikeRun[]=[];
  private buttons:ButtonRun[]=[];
  private lasers:LaserDef[]=[];
  private echoes:{x:number;y:number;w:number;h:number;tilt:number}[]=[];
  private optionals:OptionalCollectible[]=[];
  private directorCommand:DirectorCommand=neutralDirectorCommand();
  private ghostPoints:GhostPoint[]=[];
  private ghostSamples:GhostSample[]=[];
  private ghostSampleClock=0;
  private ghostStartTime=0;
  private heat=0;
  private maxHeat=0;
  private cameraX=0;
  private cameraY=0;
  private trauma=0;
  private bossPhase=0;
  private bossTimer=0;
  private bossVolleyCounter=0;
  private bossStageWaves=0;
  private bossShots:BossShot[]=[];
  private history:{x:number;y:number}[]=[];
  private roomStartTime=0;
  private roomStartDeaths=0;
  private triggered=new Set<string>();
  private collected=false;
  private checkpointActive=false;
  private checkpointIndex=-1;
  private player={x:76,y:610,vx:0,vy:0,grounded:false,jumps:0,standing:'',facing:1,scaleX:1,scaleY:1};
  private keys={left:false,right:false,jump:false};
  private lastHorizontal=1;
  private jumpBuffer=0;
  private coyote=0;
  private accumulator=0;
  private last=performance.now();
  private time=0;
  private paused=true;
  private started=false;
  private dead=false;
  private deathTimer=0;
  private roomIntro=0;
  private particles:{x:number;y:number;vx:number;vy:number;life:number;color:string}[]=[];
  private frame=0;
  private debug=new URLSearchParams(location.search).get('debug')==='1';
  private debugOverlay=this.debug;
  private laserWarnCycle=new Map<string,number>();
  private launcherCooldown=new Map<string,number>();
  private spotlightWarnCycle=new Map<string,number>();
  private crusherImpactCycle=new Map<string,number>();
  private toggleStates=new Map<string,boolean>();
  private togglePending=new Map<string,{state:boolean;at:number}>();
  private beatIndex=0;
  private beatGold=0;
  private beatFx=0;
  private pursuitX=-999;
  private pursuitActive=false;
  private pursuitWarning=0;
  private sentryShots:DirectorShot[]=[];
  private sentryNext=new Map<string,number>();
  private combo=0;
  private maxCombo=0;
  private comboTimer=0;
  private nearMissFx=0;
  private nearMissCooldown=new Map<string,number>();
  private buttonHintAt=new Map<string,number>();
  private contractFailed=false;
  private contractCleared=false;
  private stillTime=0;
  private dpr=preferredRenderScale(window.innerWidth,window.innerHeight,1280,720,compactTouchViewport(window.innerWidth,window.innerHeight,this.touchCapable()));
  private lowDetail=false;
  private stageCache:HTMLCanvasElement|null=null;
  private stageCacheKey='';
  private sceneryCache:HTMLCanvasElement|null=null;
  private sceneryCacheKey='';
  private foregroundCache:HTMLCanvasElement|null=null;
  private foregroundCacheKey='';
  private hudNext=0;
  private perfDrawMs=0;
  private perfDrawFrames=0;
  private perfUpdateMs=0;
  private perfUpdates=0;
  private idleRenderAt=0;

  constructor(root:HTMLElement,callbacks:V2Callbacks){
    this.callbacks=callbacks;
    this.canvas=document.createElement('canvas');this.canvas.width=Math.round(W*this.dpr);this.canvas.height=Math.round(H*this.dpr);this.canvas.tabIndex=0;
    this.ctx=this.canvas.getContext('2d',{alpha:false,desynchronized:true})!;this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);root.replaceChildren(this.canvas);
    this.resize();window.addEventListener('resize',()=>this.resize());
    this.loop=this.loop.bind(this);this.frame=requestAnimationFrame(this.loop);
  }

  setSave(save:V2Save):void{this.save={...newV2Save(),...save,settings:{...defaultSettings(),...(save.settings??{}),bindings:{...defaultSettings().bindings,...(save.settings?.bindings??{})}},modeBests:{...(save.modeBests??{})},ghostRooms:{...(save.ghostRooms??{})},directorCommandHistory:{...(save.directorCommandHistory??{})},exploredRooms:{...(save.exploredRooms??{})}};this.canvas.classList.toggle('mirror-canvas',this.save.mode==='mirror');this.audio.setMusic(this.save.music);this.audio.setSfx(this.save.sfx);this.audio.setVolumes(this.save.settings.muted?0:this.save.settings.master,this.save.settings.music,this.save.settings.sfx,this.save.settings.ambient);}
  getSave():V2Save{return structuredClone(this.save)}
  isPaused():boolean{return this.paused}
  hasStarted():boolean{return this.save.started}

  startNew():void{const slot=this.save.slot,settings={...this.save.settings},mode='story' as const;this.save={...newV2Save(),slot,settings,mode,runSeed:Date.now()>>>0};this.save.started=true;this.started=true;this.time=0;this.loadRoom(0,false);}
  startMode(mode:V2Save['mode']):void{
    const previous=this.getSave(),fresh=newV2Save();
    this.save={...fresh,slot:previous.slot,settings:{...previous.settings,bindings:{...previous.settings.bindings}},mode,started:true,completed:previous.completed,shards:[...previous.shards],notes:[...previous.notes],achievements:[...previous.achievements],endings:[...previous.endings],unlockedRoom:previous.unlockedRoom,bestRooms:{...previous.bestRooms},roomDeaths:{},bossStages:{},modeBests:{...previous.modeBests},ghostRooms:{...previous.ghostRooms},directorUnlocked:previous.directorUnlocked||previous.completed,directorCommandHistory:{},exploredRooms:{...previous.exploredRooms},runSeed:(mode==='director'?Date.now()>>>0:previous.runSeed)};
    this.started=true;this.time=0;this.canvas.classList.toggle('mirror-canvas',mode==='mirror');this.loadRoom(mode==='bossrush'?7:0,false);
  }
  continueGame():void{if(!this.save.started){this.startNew();return;}this.started=true;this.time=this.save.elapsed;this.loadRoom(Math.min(this.save.room,rooms.length-1),true);}
  startAtRoom(index:number):void{this.save.started=true;this.started=true;this.save.room=Math.max(0,Math.min(index,rooms.length-1));this.save.unlockedRoom=Math.max(this.save.unlockedRoom,index);this.save.respawnRoom=this.save.room;this.save.respawnX=rooms[this.save.room].spawn.x;this.save.respawnY=rooms[this.save.room].spawn.y;this.loadRoom(this.save.room,false);}
  returnToTitle():void{this.paused=true;this.audio.setSuspended(true);this.persist();}
  setPaused(value:boolean):void{if(!this.started)return;this.paused=value;this.audio.setSuspended(value);this.last=performance.now();}
  setSettings(music:boolean,sfx:boolean):void{this.save.music=music;this.save.sfx=sfx;this.audio.setMusic(music);this.audio.setSfx(sfx);this.persist();}
  applySettings(settings:V2Save['settings']):void{this.save.settings={...settings,bindings:{...settings.bindings}};this.save.music=settings.music>0;this.save.sfx=settings.sfx>0;this.audio.setMusic(this.save.music);this.audio.setSfx(this.save.sfx);this.audio.setVolumes(settings.muted?0:settings.master,settings.music,settings.sfx,settings.ambient);this.save.assisted=settings.gameSpeed<1||settings.warningBoost||settings.showHiddenTraps;this.persist();}

  keyDown(code:string):void{
    const action=this.actionForCode(code);if(action)this.actionDown(action);
    if(code==='Backspace'&&this.started&&!this.paused)this.clearEchoes();
    if(this.debug&&code==='BracketRight')this.startAtRoom(Math.min(rooms.length-1,this.save.room+1));
    if(this.debug&&code==='BracketLeft')this.startAtRoom(Math.max(0,this.save.room-1));
  }
  keyUp(code:string):void{
    const action=this.actionForCode(code);if(action)this.actionUp(action);
  }
  actionDown(action:InputAction):void{
    if(action==='left'||action==='right'){
      const physical=action==='left'?-1:1,world=this.save.mode==='mirror'?-physical:physical;
      this.keys[world<0?'left':'right']=true;this.lastHorizontal=world;return;
    }
    if(action==='jump'){if(!this.keys.jump)this.jumpBuffer=.12;this.keys.jump=true;return;}
    if(action==='restart'&&this.started&&!this.paused)this.die('主动重开',false);
  }
  actionUp(action:InputAction):void{
    if(action==='left'||action==='right'){const physical=action==='left'?-1:1,world=this.save.mode==='mirror'?-physical:physical;this.keys[world<0?'left':'right']=false;return;}
    if(action==='jump'){this.keys.jump=false;if(this.player.vy<-180)this.player.vy*=.52;}
  }
  private bossMax():number{return this.room?.boss?.stages??3;}
  private bossWaveRequirement():number{return this.room?.boss?requiredBossWaves(this.bossPhase):0;}
  private bossStageReady():boolean{return !this.room?.boss||isBossStageReady(this.bossPhase,this.bossMax(),this.bossStageWaves);}
  private commandForRoom():DirectorCommand{return this.save.mode==='director'?directorCommandFor(this.save.room,this.save.runSeed):neutralDirectorCommand();}
  debugForceBossPhase(phase:number):void{if(!this.debug||!this.room?.boss)return;this.bossPhase=Math.max(0,Math.min(this.bossMax(),phase));this.bossStageWaves=this.bossWaveRequirement();this.save.bossStages[this.room.boss.id]=this.bossPhase;this.resetRoomObjects();this.persist();}
  debugSetBossWaves(waves:number):void{if(!this.debug||!this.room?.boss)return;this.bossStageWaves=Math.max(0,Math.floor(waves));}
  debugWinCurrentRoom():void{if(!this.debug||!this.room)return;this.bossPhase=this.bossMax();this.player.x=this.room.kind==='epilogue'?W-PW-2:this.room.exit.x+2;this.player.y=this.room.exit.y+4;this.player.vx=this.player.vy=0;}
  debugSetCollections(shards:number,notes:number):void{if(!this.debug)return;this.save.shards=rooms.flatMap(r=>r.shard?[r.shard.id]:[]).slice(0,shards);this.save.notes=rooms.flatMap(r=>(r.optional??[]).map(x=>x.id)).slice(0,notes);this.collected=this.room.shard?this.save.shards.includes(this.room.shard.id):true;this.optionals=(this.room.optional??[]).filter(x=>!this.save.notes.includes(x.id));this.persist();}
  debugChooseEnding(side:'left'|'right'):void{if(!this.debug||this.room.kind!=='epilogue')return;this.player.x=side==='left'?0:this.room.exit.x+2;this.player.y=this.room.exit.y+4;this.player.vx=this.player.vy=0;this.paused=false;}
  debugSetOverlay(visible:boolean):void{if(this.debug)this.debugOverlay=visible;}
  debugTeleport(x:number,y:number):void{if(!this.debug)return;this.player.x=Math.max(0,Math.min(this.worldWidth()-PW,x));this.player.y=Math.max(0,Math.min((this.room.worldHeight??H)-PH,y));this.player.vx=this.player.vy=0;this.updateCamera(.3);}
  debugSnapshot(){return{room:this.save.room,id:this.room?.id??'',worldWidth:this.worldWidth(),remix:this.room?.remixKind??'',landmark:this.room?.landmark??'',devices:{launchers:this.room?.launchers?.length??0,portals:this.room?.portals?.length??0,crushers:this.room?.crushers?.length??0,spotlights:this.room?.spotlights?.length??0,sentries:this.room?.sentries?.length??0,pursuit:!!this.room?.pursuit},toggles:Object.fromEntries(this.toggleStates),beats:{current:this.beatIndex,total:this.room?.beats?.length??0,gold:this.beatGold},combo:{value:this.combo,max:this.maxCombo,timer:this.comboTimer},contract:{id:this.room?.contract?.id??'',failed:this.contractFailed,cleared:this.contractCleared},pressure:{pursuitX:this.pursuitX,pursuitActive:this.pursuitActive,shots:this.sentryShots.length},ranged:{theme:this.room?.attackTheme??'',patterns:(this.room?.sentries??[]).map(sentry=>sentry.pattern??'aimed')},render:{dpr:this.dpr,lowDetail:this.lowDetail,particles:this.particles.length,drawMs:this.perfDrawFrames?this.perfDrawMs/this.perfDrawFrames:0,updateMs:this.perfUpdates?this.perfUpdateMs/this.perfUpdates:0,drawFrames:this.perfDrawFrames,updates:this.perfUpdates},execution:{locks:this.blocks.filter(block=>block.id.includes('-lock-')&&block.kind==='gate'&&block.active).map(block=>({id:block.id,x:block.x})),switches:this.buttons.filter(button=>button.id.includes('-lock-')).map(button=>({id:button.id,x:button.x,y:button.y,pressed:button.pressed,requires:button.requires??'touch'}))},boss:{phase:this.bossPhase,max:this.bossMax(),waves:this.bossStageWaves,required:this.bossWaveRequirement(),ready:this.bossStageReady()},mode:this.save.mode,deaths:this.save.deaths,x:this.player.x,y:this.player.y,vx:this.player.vx,vy:this.player.vy,cameraX:this.cameraX,heat:this.heat,director:this.directorCommand.id,paused:this.paused};}

  private loadRoom(index:number,fromSave:boolean):void{
    this.room=rooms[index];this.save.room=index;this.directorCommand=this.commandForRoom();this.save.directorCommandHistory[this.room.id]=this.directorCommand.id;this.audio.setChapter(Math.max(0,this.room.chapter-1),this.room.kind==='boss');
    this.stageCacheKey='';this.sceneryCacheKey='';this.foregroundCacheKey='';this.perfDrawMs=0;this.perfDrawFrames=0;this.perfUpdateMs=0;this.perfUpdates=0;
    if(fromSave&&this.save.respawnRoom===index){this.player.x=this.save.respawnX;this.player.y=this.save.respawnY;}else{this.player.x=this.room.spawn.x;this.player.y=this.room.spawn.y;}
    this.player.vx=this.player.vy=0;this.player.jumps=0;this.player.grounded=false;this.player.scaleX=this.player.scaleY=1;this.dead=false;this.collected=this.room.shard?this.save.shards.includes(this.room.shard.id):true;
    this.checkpointIndex=this.save.respawnRoom===index?this.allCheckpoints().findIndex(cp=>Math.abs((cp.x-4)-this.save.respawnX)<8):-1;this.checkpointActive=this.checkpointIndex>=0;
    this.echoes=[];this.optionals=(this.room.optional??[]).filter(item=>!this.save.notes.includes(item.id));this.bossPhase=this.room.boss?(this.save.bossStages[this.room.boss.id]??0):0;this.bossTimer=0;this.bossVolleyCounter=0;this.bossStageWaves=0;this.bossShots=[];this.history=[];this.ghostSamples=[];this.ghostPoints=this.save.settings.showGhost?(this.save.ghostRooms[this.room.id]??[]):[];this.heat=0;this.maxHeat=0;this.ghostSampleClock=0;this.ghostStartTime=this.time;this.launcherCooldown.clear();this.spotlightWarnCycle.clear();this.crusherImpactCycle.clear();this.beatIndex=(this.room.beats??[]).filter(beat=>beat.x<=this.player.x).length;this.beatGold=0;this.beatFx=0;this.combo=0;this.maxCombo=0;this.comboTimer=0;this.nearMissFx=0;this.nearMissCooldown.clear();this.buttonHintAt.clear();this.hudNext=0;this.contractFailed=false;this.contractCleared=!!this.save.bestRooms[this.room.id]?.contract;this.stillTime=0;this.resetPressureSystems();this.cameraX=snapCameraX(this.player.x+PW/2,this.worldWidth(),W);this.cameraY=0;this.roomStartTime=this.time;this.roomStartDeaths=this.save.deaths;this.resetRoomObjects();this.roomIntro=2.2;this.paused=false;this.audio.setSuspended(false);this.callbacks.onRoom(this.room);this.callbacks.onDirector?.(this.directorCommand);if(this.room.message)this.callbacks.onToast(this.room.message);this.emitHud(true);this.persist();
  }

  private resetPressureSystems():void{
    const pursuit=this.room.pursuit,respawn=this.save.respawnRoom===this.save.room?this.save.respawnX:this.room.spawn.x;
    this.pursuitX=pursuit?Math.max(pursuit.startX,respawn-(pursuit.width??94)-245):-999;this.pursuitActive=false;this.pursuitWarning=0;this.sentryShots=[];this.sentryNext.clear();
    for(const sentry of this.room.sentries??[])this.sentryNext.set(sentry.id,this.time+(sentry.phase??0)+.55);
  }

  private resetRoomObjects():void{
    this.toggleStates.clear();this.togglePending.clear();for(const block of this.room.blocks)if(block.group&&!this.toggleStates.has(block.group))this.toggleStates.set(block.group,true);
    this.blocks=this.room.blocks.map(b=>({...b,baseX:b.x,baseY:b.y,active:b.kind==='toggle'?(this.toggleStates.get(b.group??'')??true)===(b.activeWhen??true):true,touched:-1,lastX:b.x,lastY:b.y,crumbleTouched:null}));
    this.spikes=this.room.spikes.map(s=>({...s,baseX:s.x,baseY:s.y,active:!s.hidden,vx:0,vy:0,reveal:s.hidden?0:1}));
    this.buttons=(this.room.buttons??[]).map((b,i)=>({...b,pressed:!!this.room.boss&&i<this.bossPhase}));
    this.lasers=this.room.lasers??[];
    if(this.room.boss){const gate=this.blocks.find(b=>b.kind==='gate');if(gate)gate.active=this.bossPhase<this.bossMax();}
    this.triggered.clear();this.laserWarnCycle.clear();this.spotlightWarnCycle.clear();
  }

  private loop(now:number):void{
    this.frame=requestAnimationFrame(this.loop);const delta=Math.min((now-this.last)/1000,.05);this.last=now;
    const active=this.started&&!this.paused;if(active){this.accumulator+=delta;while(this.accumulator>=STEP){const mark=this.debug?performance.now():0;this.update(STEP*(this.save.settings.gameSpeed??1));if(this.debug){this.perfUpdateMs+=performance.now()-mark;this.perfUpdates++;}this.accumulator-=STEP;}}
    if(active||now>=this.idleRenderAt){this.idleRenderAt=now+100;const mark=this.debug?performance.now():0;this.draw();if(this.debug){this.perfDrawMs+=performance.now()-mark;this.perfDrawFrames++;}}
  }

  private update(dt:number):void{
    this.time+=dt;this.roomIntro=Math.max(0,this.roomIntro-dt);this.jumpBuffer=Math.max(0,this.jumpBuffer-dt);this.beatFx=Math.max(0,this.beatFx-dt);this.nearMissFx=Math.max(0,this.nearMissFx-dt);this.comboTimer=Math.max(0,this.comboTimer-dt);if(this.comboTimer<=0)this.combo=0;this.trauma=Math.max(0,this.trauma-dt*2.8);
    let particleWrite=0;for(const p of this.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=900*dt;p.life-=dt;if(p.life>0)this.particles[particleWrite++]=p;}this.particles.length=particleWrite;if(this.particles.length>70)this.particles.splice(0,this.particles.length-70);
    if(this.dead){this.deathTimer-=dt;if(this.deathTimer<=0)this.respawn();this.emitHud();return;}

    this.updateObjects(dt);this.updateBoss(dt);this.player.scaleX=this.approach(this.player.scaleX,1,dt*5.5);this.player.scaleY=this.approach(this.player.scaleY,1,dt*5.5);
    this.applyWind(dt);
    const dir=this.keys.left&&this.keys.right?this.lastHorizontal:(this.keys.right?1:this.keys.left?-1:0);if(dir)this.player.facing=dir;
    const standingBlock=this.blocks.find(b=>b.id===this.player.standing);const onIce=standingBlock?.kind==='ice',onSticky=standingBlock?.kind==='sticky';
    const reversing=dir!==0&&Math.sign(this.player.vx)!==dir&&Math.abs(this.player.vx)>20;const target=dir*(onSticky?185:330),airScale=this.directorCommand.airControlScale,accel=onIce?720:onSticky?1200:this.player.grounded?(reversing?4100:2850):1820*airScale;
    this.player.vx=this.approach(this.player.vx,target,accel*dt);if(!dir&&this.player.grounded)this.player.vx=this.approach(this.player.vx,0,(onIce?135:onSticky?880:3300)*dt);
    this.coyote=this.player.grounded?.085:Math.max(0,this.coyote-dt);
    if(this.jumpBuffer>0&&((this.coyote>0&&this.player.jumps===0)||this.player.jumps<2)){
      const inherited=standingBlock&&this.player.grounded?platformLaunchVelocity(standingBlock.x-standingBlock.lastX,standingBlock.y-standingBlock.lastY,dt):{x:0,y:0};this.player.vx=Math.max(-500,Math.min(500,this.player.vx+inherited.x));this.player.vy=(onSticky?-700:-640)+inherited.y;this.player.grounded=false;this.player.jumps++;this.jumpBuffer=0;this.coyote=0;this.player.scaleX=.82;this.player.scaleY=1.2;this.audio.jump();this.addCombo(1);
    }
    const apex=!this.player.grounded&&Math.abs(this.player.vy)<72?.58:1,fall=this.player.vy>0?1.58:1;this.player.vy=Math.min(this.player.vy+1780*this.directorCommand.gravityScale*apex*fall*dt,980);
    const standing=this.blocks.find(b=>b.id===this.player.standing);if(standing&&this.player.grounded){this.moveX(standing.x-standing.lastX+(standing.kind==='conveyor'?(standing.forceX??0)*dt:0));this.moveY(standing.y-standing.lastY);}
    this.moveX(this.player.vx*dt);this.moveY(this.player.vy*dt);this.updateCamera(dt);this.updateHeat(dt,dir);this.captureGhost(dt);this.updatePressureSystems(dt);this.updateContract(dt);
    this.checkLaunchers();this.checkCrushers();this.checkSpotlights();this.checkBeats();this.activateTraps();this.checkButtons();this.checkSpikes();this.checkLasers();this.checkPressureDamage();this.checkBossDamage();if(!this.dead)this.checkNearMisses();this.checkCheckpoint();this.checkShard();this.checkOptional();this.checkExit();
    if(this.player.y>H+60)this.die('掉出房间');
    this.save.exploredRooms[this.room.id]=Math.max(this.save.exploredRooms[this.room.id]??0,(this.player.x+PW)/this.worldWidth());this.save.elapsed=this.time;this.emitHud();
  }

  private updateObjects(dt:number):void{
    for(const [group,pending] of this.togglePending){if(this.time<pending.at)continue;this.toggleStates.set(group,pending.state);this.togglePending.delete(group);this.audio.toggle();this.addTrauma(.13);for(let i=0;i<this.effectCount(10);i++)this.particles.push({x:this.player.x+PW/2,y:this.player.y+PH/2,vx:(Math.random()-.5)*250,vy:-40-Math.random()*170,life:.2+Math.random()*.25,color:i%2?'#5ed6d2':'#f1c86a'});}
    for(const b of this.blocks){
      b.lastX=b.x;b.lastY=b.y;
      if(b.kind==='phase')b.active=phaseActiveAt(this.time,b.phasePeriod??3,b.phaseActiveFor??2,b.phaseOffset??0);
      if(b.kind==='toggle')b.active=(this.toggleStates.get(b.group??'')??true)===(b.activeWhen??true);
      if(b.kind==='moving'){
        const wave=(Math.sin(this.time*(b.speed??1.3)*this.directorCommand.motionScale)+1)/2;b.x=b.toX===undefined?b.baseX:b.baseX+(b.toX-b.baseX)*wave;b.y=b.toY===undefined?b.baseY:b.baseY+(b.toY-b.baseY)*wave;
      }
      if(b.kind==='orbit'&&b.orbit){const pos=orbitPosition(b.orbit,this.time*this.directorCommand.motionScale);b.x=pos.x-b.w/2;b.y=pos.y-b.h/2;}
      if(b.kind==='crumble'){
        const state=crumbleStateAt(b.crumbleTouched,this.time,b.crumbleDelay,b.crumbleRespawn);
        if(state==='warning'){b.active=true;b.x=b.baseX+Math.sin(this.time*92)*2.2;b.y=b.baseY+Math.sin(this.time*77)*1.4;}
        else if(state==='absent'){b.active=false;b.x=b.baseX;b.y=b.baseY;}
        else if(state==='restored'){b.active=true;b.x=b.baseX;b.y=b.baseY;b.crumbleTouched=null;}
        else{b.active=true;b.x=b.baseX;b.y=b.baseY;}
      }
      if(b.kind==='fake'&&b.touched>=0){const age=this.time-b.touched;if(age>.18)b.y+=520*dt;if(b.y>H+80)b.active=false;}
    }
    for(const s of this.spikes){if(s.orbit&&s.active){const pos=orbitPosition(s.orbit,this.time*this.directorCommand.motionScale);s.x=pos.x-s.w/2;s.y=pos.y-s.h/2;}else if(s.moving&&s.active){const wave=Math.sin(this.time*s.moving.speed*this.directorCommand.motionScale);if(s.moving.axis==='x')s.x=s.baseX+wave*s.moving.distance;else s.y=s.baseY+wave*s.moving.distance;}if(s.vx||s.vy){s.x+=s.vx*dt*this.directorCommand.spikeSpeedScale;s.y+=s.vy*dt*this.directorCommand.spikeSpeedScale;}s.reveal=Math.min(1,s.reveal+dt*9);}
  }

  private updatePressureSystems(dt:number):void{
    const pursuit=this.room.pursuit;
    if(pursuit){
      const trigger=Math.max(pursuit.triggerX,(this.save.respawnRoom===this.save.room?this.save.respawnX:this.room.spawn.x)+130);
      if(!this.pursuitActive&&this.player.x+PW/2>=trigger){this.pursuitActive=true;this.pursuitWarning=.7;this.audio.pursuit();this.callbacks.onToast('活幕布已放出 · 别停');}
      if(this.pursuitActive){const distance=this.player.x-(this.pursuitX+(pursuit.width??94)),speed=pursuitVelocity(pursuit.baseSpeed,pursuit.maxSpeed,distance);this.pursuitX+=speed*dt;this.pursuitWarning=Math.max(0,this.pursuitWarning-dt);if(distance<180)this.addTrauma(dt*.22);}
    }
    for(const sentry of this.room.sentries??[]){
      const next=this.sentryNext.get(sentry.id)??this.time;if(this.time<next||Math.abs(this.player.x-sentry.x)>sentry.range||!this.inViewX(sentry.x-45,90,190))continue;
      if(this.sentryShots.length>=10){this.sentryNext.set(sentry.id,this.time+.28);continue;}
      this.sentryNext.set(sentry.id,this.time+sentry.period);const source={x:sentry.x,y:sentry.y},target=leadTarget(source,{x:this.player.x+PW/2,y:this.player.y+PH/2},{x:this.player.vx,y:this.player.vy},sentry.projectileSpeed),base=aimedVelocity(source,target,sentry.projectileSpeed),pattern=sentry.pattern??'aimed',shots=buildProjectilePattern(pattern,base),warning=sentry.warning+(this.save.settings.warningBoost?.28:0),color=sentry.shotColor??chapterArt(this.room.chapter).hazard,label=sentry.label??patternLabel(pattern);
      for(const [i,shot] of shots.entries()){const travel=2.15;this.sentryShots.push({id:`${sentry.id}-${Math.floor(this.time*1000)}-${i}`,x:source.x,y:source.y,vx:shot.vx,vy:shot.vy,r:shot.r,gravity:shot.gravity,pattern,label,warning,color,targetX:source.x+shot.vx*travel,targetY:source.y+shot.vy*travel+shot.gravity*travel*travel*.5,life:4.8});}
      this.audio.sentry();
    }
    let shotWrite=0;for(const shot of this.sentryShots){shot.warning-=dt;shot.life-=dt;if(shot.warning<=0){shot.x+=shot.vx*dt;shot.y+=shot.vy*dt;shot.vy+=shot.gravity*dt;}if(shot.life>0&&shot.x>-140&&shot.x<this.worldWidth()+140&&shot.y>-190&&shot.y<H+180)this.sentryShots[shotWrite++]=shot;}this.sentryShots.length=shotWrite;
  }

  private updateContract(dt:number):void{
    if(this.contractFailed||this.contractCleared||this.room.contract?.rule!=='relentless')return;
    if(this.player.grounded&&Math.abs(this.player.vx)<45)this.stillTime+=dt;else this.stillTime=Math.max(0,this.stillTime-dt*2.5);
    if(this.stillTime>2)this.failContract('你停得太久');
  }

  private failContract(reason:string):void{if(!this.room.contract||this.contractFailed||this.contractCleared)return;this.contractFailed=true;this.audio.contractFail();this.callbacks.onToast(`悬赏失效：${reason} · 仍可正常通关`);}
  private addCombo(amount:number):void{if(this.dead)return;const before=comboTier(this.combo);this.combo=Math.min(99,this.combo+amount);this.maxCombo=Math.max(this.maxCombo,this.combo);this.comboTimer=2.65;this.heat=Math.min(100,this.heat+amount*.7);const after=comboTier(this.combo);if(after>before&&after>=2)this.audio.combo(after);}

  private checkPressureDamage():void{
    const pursuit=this.room.pursuit;if(pursuit&&this.pursuitActive&&this.player.x+5<this.pursuitX+(pursuit.width??94)){this.die('被活幕布吞回后台');return;}
    for(const shot of this.sentryShots)if(shot.warning<=0&&this.hit(this.playerRect(3),{x:shot.x-shot.r,y:shot.y-shot.r,w:shot.r*2,h:shot.r*2})){this.die(`被${shot.label}命中`);return;}
  }

  private checkNearMisses():void{
    const player=this.playerRect(2),reward=(id:string,rect:Rect):boolean=>{if((this.nearMissCooldown.get(id)??0)>this.time||!isNearMiss(player,rect,20))return false;this.nearMissCooldown.set(id,this.time+.85);this.nearMissFx=.48;this.addCombo(3);this.audio.nearMiss();this.addTrauma(.12);return true;};
    for(const spike of this.spikes)if(spike.active&&Math.abs(spike.x-this.player.x)<110&&reward(spike.id,this.spikeHitbox(spike)))return;
    for(const laser of this.lasers)if(this.laserActive(laser)&&reward(laser.id,laser))return;
    for(const crusher of this.room.crushers??[])if(crusherPoseAt(crusher,this.time*this.directorCommand.motionScale).dangerous&&reward(crusher.id,this.crusherRect(crusher)))return;
    for(const shot of this.sentryShots)if(shot.warning<=0&&reward(shot.id,{x:shot.x-shot.r,y:shot.y-shot.r,w:shot.r*2,h:shot.r*2}))return;
  }

  private applyWind(dt:number):void{for(const zone of this.room.windZones??[]){if(!this.hit(this.playerRect(),zone))continue;const push=windDelta(zone.forceX,zone.forceY,dt);this.player.vx=Math.max(-470,Math.min(470,this.player.vx+push.x));this.player.vy=Math.max(-850,Math.min(950,this.player.vy+push.y));if(Math.random()<.08*this.save.settings.particles)this.particles.push({x:zone.x+(zone.forceX>0?0:zone.w),y:zone.y+Math.random()*zone.h,vx:zone.forceX*.7,vy:zone.forceY*.3+(Math.random()-.5)*30,life:.5,color:'#efe2c5'});}}

  private checkLaunchers():void{
    for(const launcher of this.room.launchers??[]){
      if((this.launcherCooldown.get(launcher.id)??0)>this.time||!this.hit(this.playerRect(),launcher))continue;
      const result=launcherResult(launcher,this.player.facing);this.launcherCooldown.set(launcher.id,this.time+(launcher.cooldown??.48));this.player.vx=result.vx;this.player.vy=result.vy;this.player.facing=result.facing;this.player.grounded=false;this.player.standing='';this.player.jumps=1;this.player.scaleX=.72;this.player.scaleY=1.34;this.heat=Math.min(100,this.heat+10);this.addTrauma(.28);this.audio.launch();this.addCombo(3);
      for(let i=0;i<this.effectCount(14);i++)this.particles.push({x:launcher.x+launcher.w/2,y:launcher.y+launcher.h*.72,vx:-result.facing*(60+Math.random()*260)+(Math.random()-.5)*80,vy:-80-Math.random()*260,life:.25+Math.random()*.38,color:i%3?'#f1c96f':'#ee6a66'});
      return;
    }
  }


  private crusherRect(def:CrusherDef):Rect{
    const pose=crusherPoseAt(def,this.time*this.directorCommand.motionScale);return{x:def.x+(def.axis==='x'?pose.offset:0),y:def.y+(def.axis==='y'?pose.offset:0),w:def.w,h:def.h};
  }

  private checkCrushers():void{
    for(const crusher of this.room.crushers??[]){
      const absolute=this.time*this.directorCommand.motionScale+(crusher.phase??0),cycle=Math.floor(absolute/Math.max(.2,crusher.period)),pose=crusherPoseAt(crusher,this.time*this.directorCommand.motionScale),rect={x:crusher.x+(crusher.axis==='x'?pose.offset:0),y:crusher.y+(crusher.axis==='y'?pose.offset:0),w:crusher.w,h:crusher.h};
      if(pose.impact>0&&this.crusherImpactCycle.get(crusher.id)!==cycle){this.crusherImpactCycle.set(crusher.id,cycle);this.audio.crusher();this.addTrauma(.5);for(let i=0;i<this.effectCount(12);i++)this.particles.push({x:rect.x+Math.random()*rect.w,y:rect.y+rect.h,vx:(Math.random()-.5)*300,vy:-80-Math.random()*220,life:.22+Math.random()*.32,color:i%3?'#d4b47b':'#f2e3c2'});}
      if(pose.dangerous&&this.hit(this.playerRect(3),rect)){this.die('被舞台压榨机拍扁');return;}
    }
  }

  private checkSpotlights():void{
    for(const spotlight of this.room.spotlights??[]){
      const absolute=this.time+(spotlight.phase??0),cycle=Math.floor(absolute/Math.max(.2,spotlight.period)),state=spotlightStateAt(spotlight,this.time);
      if(state.warning&&this.spotlightWarnCycle.get(spotlight.id)!==cycle){this.spotlightWarnCycle.set(spotlight.id,cycle);this.audio.warning();}
      if(state.active&&this.hit(this.playerRect(2),spotlight)&&spotlightMovementIsUnsafe(this.player.vx,this.player.vy)){this.audio.spotlightLock();this.die('聚光灯亮起时，你动了');return;}
    }
  }

  private checkBeats():void{
    const beats=this.room.beats??[];
    while(this.beatIndex<beats.length&&this.player.x+PW/2>=beats[this.beatIndex].x){
      const beat=beats[this.beatIndex],reward=beatReward(this.heat);this.beatIndex++;if(reward.gold)this.beatGold++;this.beatFx=.8;this.addTrauma(reward.gold ? .32 : .18);this.audio.beatStamp(reward.gold);this.addCombo((reward.gold?5:3)+reward.comboBonus);
      const art=chapterArt(this.room.chapter);for(let i=0;i<Math.round((reward.gold?28:18)*this.save.settings.particles);i++){const angle=Math.random()*Math.PI*2;this.particles.push({x:beat.x,y:this.player.y+PH/2,vx:Math.cos(angle)*(90+Math.random()*260),vy:Math.sin(angle)*(80+Math.random()*220)-80,life:.26+Math.random()*.45,color:i%3?art.accent:art.glow});}
      this.callbacks.onBeat?.({index:this.beatIndex,label:beat.label,gold:reward.gold});
    }
  }

  private moveX(amount:number):void{
    for(const step of splitMotion(amount,3)){
      this.player.x+=step;const body={x:this.player.x,y:this.player.y+3,w:PW,h:PH-6};
      const hits=[...this.blocks.filter(b=>b.active&&b.kind!=='oneway'&&this.hit(body,b)),...this.echoes.filter(e=>this.hit(body,e))];if(!hits.length)continue;
      if(step>0)this.player.x=Math.min(...hits.map(b=>b.x-PW));else this.player.x=Math.max(...hits.map(b=>b.x+b.w));this.player.vx=0;break;
    }
    this.player.x=Math.max(0,Math.min(this.worldWidth()-PW,this.player.x));
  }

  private moveY(amount:number):void{
    const wasGrounded=this.player.grounded;this.player.grounded=false;this.player.standing='';
    for(const step of splitMotion(amount,3)){
      const oldTop=this.player.y,oldBottom=this.player.y+PH;this.player.y+=step;const body=this.playerRect();
      if(step>=0){
        const blockHits=this.blocks.filter(b=>b.active&&this.horizontalOverlap(body,b,3)&&oldBottom<=b.y+4&&body.y+body.h>=b.y);
        const echoHits=this.echoes.map((e,i)=>({...e,index:i})).filter(e=>this.horizontalOverlap(body,e,3)&&oldBottom<=e.y+4&&body.y+body.h>=e.y);
        const top=Math.min(...blockHits.map(b=>b.y),...echoHits.map(e=>e.y));if(Number.isFinite(top)){
          this.player.y=top-PH;const block=blockHits.find(b=>b.y===top),echo=echoHits.find(e=>e.y===top);this.player.vy=0;this.player.grounded=true;this.player.jumps=0;this.player.standing=block?.id??`echo-${echo?.index??0}`;
          if(!wasGrounded){this.player.scaleX=1.18;this.player.scaleY=.82;this.spawnLanding();this.audio.land();this.addTrauma(.08);}
          if(block?.kind==='fake'&&block.touched<0)block.touched=this.time;if(block?.kind==='crumble'&&block.crumbleTouched===null)block.crumbleTouched=this.time;if(block?.kind==='bounce'){this.player.vy=-790;this.player.grounded=false;this.player.jumps=1;this.player.scaleX=.78;this.player.scaleY=1.24;this.audio.jump();}return;
        }
      }else{
        const solids=[...this.blocks.filter(b=>b.active&&b.kind!=='oneway'),...this.echoes],hits=solids.filter(b=>this.horizontalOverlap(body,b,1)&&oldTop>=b.y+b.h-4&&body.y<=b.y+b.h);
        if(hits.length){const correction=findCornerCorrection(body,hits,6);if(correction){this.player.x+=correction;continue;}this.player.y=Math.max(...hits.map(b=>b.y+b.h));this.player.vy=0;return;}
      }
    }
    const support=shouldProbeSupport(amount,wasGrounded)?findSupport(this.playerRect(),[...this.blocks.filter(b=>b.active),...this.echoes],2.5):null;if(support){const blockSupport=this.blocks.find(b=>b===support);this.player.y=support.y-PH;this.player.grounded=true;this.player.jumps=0;this.player.standing=blockSupport?.id??`echo-${this.echoes.findIndex(e=>e===support)}`;if(blockSupport?.kind==='crumble'&&blockSupport.crumbleTouched===null)blockSupport.crumbleTouched=this.time;}
  }

  private activateTraps():void{
    for(const trap of this.room.traps){if(this.triggered.has(trap.id)||!this.hit(this.playerRect(),trap.trigger))continue;this.triggered.add(trap.id);this.audio.trap();this.addTrauma(.16);
      for(const id of trap.targets){const s=this.spikes.find(x=>x.id===id);if(!s)continue;s.active=true;s.reveal=0;if(trap.action==='slide'){const fast=s.w>50?190:560;s.vx=s.direction==='left'?-fast:s.direction==='right'?fast:(s.x>this.player.x?-fast:fast);}if(trap.action==='drop')s.vy=520;}
    }
  }

  private checkButtons():void{
    for(const [index,button] of this.buttons.entries()){if(button.pressed||!this.hit(this.playerRect(),button))continue;if(button.target==='boss'&&index!==this.bossPhase){this.callbacks.onToast(`先关闭阶段 ${this.bossPhase+1} 的机关`);continue;}
      if(button.target==='boss'&&!this.bossStageReady()){
        if((this.buttonHintAt.get(button.id)??0)<=this.time){this.buttonHintAt.set(button.id,this.time+1);this.callbacks.onToast(`阶段机关尚未解锁 · 再躲 ${this.bossWaveRequirement()-this.bossStageWaves} 波攻击`);this.audio.lockReject();}continue;
      }
      if(!requirementMet(button.requires,{grounded:this.player.grounded,vx:this.player.vx,vy:this.player.vy,jumps:this.player.jumps,combo:this.combo})){
        if((this.buttonHintAt.get(button.id)??0)<=this.time){this.buttonHintAt.set(button.id,this.time+.9);this.callbacks.onToast(`导演锁要求：${requirementLabel(button.requires)}触碰`);this.audio.lockReject();}continue;
      }
      button.pressed=true;
      if(button.target==='boss'&&this.room.boss)this.advanceBossStage(button.label??'阶段完成');
      else if(button.target.startsWith('group:')){const group=button.target.slice(6),next=!(this.toggleStates.get(group)??true);this.togglePending.set(group,{state:next,at:this.time+.18});this.callbacks.onToast(button.label??'双色舞台正在交换');}
      else{const gate=this.blocks.find(b=>b.id===button.target);if(gate)gate.active=false;this.callbacks.onToast(button.label??'机关已启动');}
      if(button.requires&&button.requires!=='touch'){this.audio.lockSuccess();this.addCombo(4);this.nearMissFx=.42;this.addTrauma(.2);for(let i=0;i<this.effectCount(10);i++)this.particles.push({x:button.x+button.w/2,y:button.y,vx:(Math.random()-.5)*310,vy:-80-Math.random()*230,life:.25+Math.random()*.3,color:i%2?'#f4cf73':'#70ddce'});}else this.audio.button();this.persist();
    }
  }

  private advanceBossStage(label:string):void{
    if(!this.room.boss||this.bossPhase>=this.bossMax()||!this.bossStageReady())return;this.bossPhase=Math.min(this.bossMax(),this.bossPhase+1);this.save.bossStages[this.room.boss.id]=this.bossPhase;this.bossTimer=0;this.bossStageWaves=0;this.bossShots=[];this.history=[];this.save.respawnRoom=this.save.room;this.save.respawnX=this.player.x;this.save.respawnY=Math.max(80,this.player.y-20);this.audio.stage();this.addTrauma(.55);
    if(this.bossPhase>=this.bossMax()){const gate=this.blocks.find(b=>b.kind==='gate');if(gate)gate.active=false;this.unlock(`boss-${this.room.boss.chapter}`);this.unlock(`chapter-${this.room.boss.chapter}`);}
    this.callbacks.onToast(`${label} · ${this.bossPhase}/${this.bossMax()}${this.bossPhase<this.bossMax()?'，复活点已更新':'，出口开放'}`);this.persist();
  }

  private updateBoss(dt:number):void{
    if(!this.room.boss||this.bossPhase>=this.bossMax())return;this.bossTimer+=dt;this.history.push({x:this.player.x,y:this.player.y});if(this.history.length>420)this.history.shift();
    const chapter=this.room.boss.chapter,interval=Math.max(.62,1.65-this.bossPhase*.25);
    if(this.bossTimer>=interval){this.bossTimer=0;const phase=this.bossPhase+1;this.bossStageWaves++;
      const boost=this.save.settings.warningBoost?.34:0;this.audio.warning();
      this.bossShots.push(...bossVolley(chapter,phase,this.bossVolleyCounter++,this.player.x).map(s=>({...s,warning:s.warning+boost})));
    }
    for(const shot of this.bossShots){shot.warning-=dt;if(shot.warning<=0){shot.x+=shot.vx*dt;shot.y+=shot.vy*dt;if(this.room.boss.chapter===1)shot.vy+=280*dt;}}
    let write=0;for(const shot of this.bossShots)if(shot.x>-100&&shot.x<W+100&&shot.y>-100&&shot.y<H+120)this.bossShots[write++]=shot;this.bossShots.length=write;
  }

  private checkBossDamage():void{
    if(!this.room.boss||this.bossPhase>=this.bossMax())return;for(const shot of this.bossShots)if(shot.warning<=0&&this.hit(this.playerRect(3),{x:shot.x-shot.r,y:shot.y-shot.r,w:shot.r*2,h:shot.r*2})){this.die('Boss 攻击命中');return;}
    if(this.room.boss.chapter===3&&this.history.length>220){const ghost=this.history[this.history.length-220];if(this.hit(this.playerRect(4),{x:ghost.x,y:ghost.y,w:PW,h:PH}))this.die('被两秒前的自己撞上了');}
  }

  private checkSpikes():void{
    for(const s of this.spikes){if(!s.active)continue;const box=this.spikeHitbox(s);if(this.hit(this.playerRect(4),box)){this.die('碰到尖刺');return;}}
  }

  private laserAbsolute(laser:LaserDef):number{return this.time*this.directorCommand.laserScale+(laser.phase??0);}
  private laserActive(laser:LaserDef):boolean{return(this.laserAbsolute(laser)%laser.period)<laser.activeFor;}
  private checkLasers():void{for(const laser of this.lasers){const absolute=this.laserAbsolute(laser),phase=absolute%laser.period,warning=(this.save.settings.warningBoost?.75:.34)+this.directorCommand.spikeWarning,cycle=Math.floor(absolute/laser.period);if(!this.laserActive(laser)&&laser.period-phase<warning&&this.laserWarnCycle.get(laser.id)!==cycle){this.laserWarnCycle.set(laser.id,cycle);this.audio.warning();}if(this.laserActive(laser)&&this.hit(this.playerRect(3),laser)){this.die('被梦境激光切中了');return;}}}

  private checkCheckpoint():void{
    const checkpoints=this.allCheckpoints();for(let i=0;i<checkpoints.length;i++){const cp=checkpoints[i];if(i===this.checkpointIndex||!this.hit(this.playerRect(),cp))continue;this.checkpointIndex=i;this.checkpointActive=true;this.save.respawnRoom=this.save.room;this.save.respawnX=cp.x-4;this.save.respawnY=cp.y+cp.h-PH;this.resetPressureSystems();this.audio.checkpoint();this.callbacks.onToast(`存档点 ${i+1}/${checkpoints.length} · 追逐与弹幕已重置`);this.persist();return;}
  }

  private checkShard():void{
    const shard=this.room.shard;if(!shard||this.collected||!this.hit(this.playerRect(),shard))return;this.collected=true;this.save.shards.push(shard.id);this.audio.collect();this.callbacks.onMemory?.(shard.id);this.unlock('first-memory');if(this.save.shards.length>=12)this.unlock('all-memories');this.persist();
  }

  private checkOptional():void{for(let i=this.optionals.length-1;i>=0;i--){const item=this.optionals[i];if(!this.hit(this.playerRect(),item))continue;this.optionals.splice(i,1);this.save.notes.push(item.id);this.audio.collect();this.callbacks.onOptional?.(item);this.unlock('first-note');if(this.save.notes.length>=rooms.flatMap(r=>r.optional??[]).length)this.unlock('all-notes');this.persist();}}

  private checkExit():void{
    if(this.room.kind==='epilogue'&&this.player.x<=2){const canAccept=this.save.shards.length>=12&&this.save.notes.length>=rooms.flatMap(r=>r.optional??[]).length;this.finish(canAccept?'accept':v2Ending(this.save.shards.length));return;}
    if(!this.hit(this.playerRect(),this.room.exit))return;if(this.room.boss&&this.bossPhase<this.bossMax()){this.callbacks.onToast(`还有阶段未关闭（${this.bossPhase}/${this.bossMax()}）`);return;}
    this.resolveContract();this.recordRoom();
    if(this.save.mode==='bossrush'&&this.room.kind==='boss'){
      const bosses=rooms.map((r,i)=>r.kind==='boss'?i:-1).filter(i=>i>=0),pos=bosses.indexOf(this.save.room);
      if(pos>=0&&pos<bosses.length-1){const nextBoss=bosses[pos+1];this.save.respawnRoom=nextBoss;this.save.respawnX=rooms[nextBoss].spawn.x;this.save.respawnY=rooms[nextBoss].spawn.y;this.loadRoom(nextBoss,false);return;}
      this.completeMode();return;
    }
    const next=this.save.room+1;if(next<rooms.length){this.save.room=next;this.save.unlockedRoom=Math.max(this.save.unlockedRoom,next);this.save.respawnRoom=next;this.save.respawnX=rooms[next].spawn.x;this.save.respawnY=rooms[next].spawn.y;this.loadRoom(next,false);}else this.finish(v2Ending(this.save.shards.length));
  }

  private completeMode():void{this.paused=true;this.save.completed=true;this.save.modeBests[this.save.mode]=this.save.elapsed;this.unlock(`${this.save.mode}-clear`);this.persist();this.callbacks.onModeComplete?.(this.save.mode,this.getSave());}
  private finish(ending:EndingId):void{this.paused=true;this.save.completed=true;if(this.save.mode==='speedrun'||this.save.mode==='mirror')this.save.modeBests[this.save.mode]=this.save.elapsed;if(!this.save.endings.includes(ending))this.save.endings.push(ending);this.unlock(`ending-${ending}`);if(this.save.endings.length>=4)this.unlock('all-endings');if(!this.save.assisted)this.unlock('no-assist-clear');if(this.save.mode!=='story')this.unlock(`${this.save.mode}-clear`);this.persist();this.callbacks.onEnding(ending,this.getSave());}

  private resolveContract():void{
    const contract=this.room.contract;if(!contract)return;const wasCleared=!!this.save.bestRooms[this.room.id]?.contract||this.contractCleared;
    const success=wasCleared||contractSuccess(contract,{failed:this.contractFailed,elapsed:this.time-this.roomStartTime,deaths:this.save.deaths-this.roomStartDeaths,maxHeat:this.maxHeat,maxCombo:this.maxCombo});
    if(success&&!wasCleared){this.contractCleared=true;this.audio.contractClear();this.addCombo(6);this.unlock('first-contract');const seals=Object.values(this.save.bestRooms).filter(record=>record.contract).length+1;if(seals>=12)this.unlock('twelve-contracts');if(seals>=24)this.unlock('all-contracts');this.callbacks.onContract?.({label:contract.label,success:true,seals});}
    else if(!success){this.contractFailed=true;this.audio.contractFail();this.callbacks.onContract?.({label:contract.label,success:false,seals:Object.values(this.save.bestRooms).filter(record=>record.contract).length});}
  }

  private recordRoom():void{
    const duration=this.time-this.roomStartTime,deaths=this.save.deaths-this.roomStartDeaths,scale=Math.max(1,this.worldWidth()/W);
    const rank=this.maxHeat>=62&&duration<32*scale&&deaths===0?'S':duration<58*scale&&deaths<=2?'A':duration<105*scale&&deaths<=6?'B':'C',prev=this.save.bestRooms[this.room.id];
    if(!prev||duration<prev.time||deaths<prev.deaths){
      this.save.bestRooms[this.room.id]={time:prev?Math.min(prev.time,duration):duration,deaths:prev?Math.min(prev.deaths,deaths):deaths,rank,assisted:this.save.assisted,heat:Math.max(prev?.heat??0,Math.round(this.maxHeat)),contract:!!prev?.contract||this.contractCleared,bestCombo:Math.max(prev?.bestCombo??0,this.maxCombo)};
      if(!prev||duration<prev.time)this.save.ghostRooms[this.room.id]=compressGhost(this.ghostSamples,360);
    }else if((this.contractCleared&&!prev.contract)||this.maxCombo>(prev.bestCombo??0))this.save.bestRooms[this.room.id]={...prev,contract:prev.contract||this.contractCleared,bestCombo:Math.max(prev.bestCombo??0,this.maxCombo),heat:Math.max(prev.heat??0,Math.round(this.maxHeat))};
    if(deaths===0)this.unlock('clean-room');if(rank==='S')this.unlock('first-s');this.callbacks.onRoomResult?.({room:this.room.id,time:duration,deaths,rank,heat:Math.round(this.maxHeat)});
  }

  private unlock(id:string):void{if(this.save.achievements.includes(id))return;this.save.achievements.push(id);this.callbacks.onAchievement?.(id);}

  private die(reason:string,leaveEcho=true):void{
    if(this.dead||this.paused)return;this.dead=true;this.deathTimer=.2;this.save.deaths++;this.save.roomDeaths[this.room.id]=(this.save.roomDeaths[this.room.id]??0)+1;this.heat=Math.max(0,this.heat-25);this.combo=0;this.comboTimer=0;if(this.room.contract?.rule==='no-death')this.failContract('本次演出发生死亡');this.addTrauma(.75);if(this.save.deaths===1)this.unlock('first-death');this.audio.death();this.callbacks.onDeath(reason);
    if(leaveEcho){this.echoes.push({x:this.player.x-4,y:Math.min(this.player.y+PH-13,646),w:38,h:15,tilt:(Math.random()-.5)*.18});const echoLimit=this.directorCommand.echoLimit||MAX_ECHOES;if(this.echoes.length>echoLimit)this.echoes.shift();if(this.echoes.length>=3)this.unlock('echo-bridge');}
    const colors=['#fff4e6','#f48bad','#7ee1c1','#ffd466'],count=this.effectCount(10);for(let i=0;i<count;i++)this.particles.push({x:this.player.x+PW/2,y:this.player.y+PH/2,vx:(Math.random()-.5)*520,vy:(Math.random()-.8)*430,life:.35+Math.random()*.35,color:colors[i%colors.length]});if(this.particles.length>70)this.particles.splice(0,this.particles.length-70);this.persist();
  }

  private respawn():void{
    const roomIndex=this.save.respawnRoom;if(roomIndex!==this.save.room){this.loadRoom(roomIndex,true);return;}this.player.x=this.save.respawnX;this.player.y=this.save.respawnY;this.player.vx=this.player.vy=0;this.player.jumps=0;this.dead=false;this.heat=Math.max(0,this.heat-18);this.combo=0;this.comboTimer=0;this.nearMissFx=0;this.stillTime=0;this.ghostSamples=[];this.ghostStartTime=this.time;this.ghostSampleClock=0;this.launcherCooldown.clear();this.crusherImpactCycle.clear();this.beatIndex=(this.room.beats??[]).filter(beat=>beat.x<=this.player.x).length;this.beatGold=0;this.beatFx=0;if(this.room.boss&&this.bossPhase<this.bossMax()){this.bossTimer=0;this.bossStageWaves=0;this.bossShots=[];this.history=[];}this.resetPressureSystems();this.resetRoomObjects();this.snapCamera();
  }

  private clearEchoes():void{this.echoes=[];this.resetRoomObjects();this.player.x=this.save.respawnX;this.player.y=this.save.respawnY;this.player.vx=this.player.vy=0;this.player.jumps=0;this.snapCamera();this.callbacks.onToast('残影已清空');}

  private updateHeat(dt:number,dir:number):void{
    const speed=Math.abs(this.player.vx),active=(!this.player.grounded&&speed>165)||(this.player.grounded&&speed>270);
    if(active)this.heat=Math.min(100,this.heat+dt*20);
    else this.heat=Math.max(0,this.heat-dt*(dir===0?14:4));
    this.maxHeat=Math.max(this.maxHeat,this.heat);this.audio.setIntensity(this.heat/100);
  }

  private captureGhost(dt:number):void{
    this.ghostSampleClock+=dt;if(this.ghostSampleClock>=1/20){this.ghostSampleClock=0;this.ghostSamples.push({t:this.time-this.ghostStartTime,x:this.player.x,y:this.player.y});if(this.ghostSamples.length>1600)this.ghostSamples.shift();}
  }

  private updateCamera(dt:number):void{
    const frame=stableCameraTarget(this.cameraX,this.player.x+PW/2,this.worldWidth(),W);this.cameraX=smoothCamera(this.cameraX,frame.target,dt);this.cameraY=0;
  }
  private snapCamera():void{this.cameraX=snapCameraX(this.player.x+PW/2,this.worldWidth(),W);this.cameraY=0;}
  private inViewX(x:number,w=1,pad=150):boolean{return x+w>=this.cameraX-pad&&x<=this.cameraX+W+pad;}

  private draw():void{
    const c=this.ctx;c.clearRect(0,0,W,H);const papers=['#d9c9aa','#cbb4a5','#b9c0b9','#ab9ba3'];c.fillStyle=papers[(this.room?.chapter??1)-1];c.fillRect(0,0,W,H);
    if(!this.room)return;this.drawBackdrop(c);
    const shake=gentleShake(this.time,this.trauma,this.save.settings.shake,this.save.settings.reducedMotion),art=chapterArt(this.room.chapter),visualTime=this.save.settings.reducedMotion?0:this.time;c.save();c.translate(-this.cameraX+shake.x,-this.cameraY+shake.y);this.drawWorldScenery(c);
    if(this.room.pursuit)this.drawPursuit(c);
    for(const spotlight of this.room.spotlights??[])if(this.inViewX(spotlight.x,spotlight.w))drawSpotlight(c,spotlight,art,this.time);
    for(const zone of this.room.windZones??[])if(this.inViewX(zone.x,zone.w))this.drawWind(c,zone);
    for(const [index,beat] of (this.room.beats??[]).entries())if(this.inViewX(beat.x,1,220))drawBeatMarker(c,beat,index,index<this.beatIndex,index<this.beatGold,art,visualTime);
    for(const b of this.blocks)if(this.inViewX(b.x,b.w)&&(b.active||b.kind==='phase'||b.kind==='toggle'))this.drawBlock(c,b);
    for(const launcher of this.room.launchers??[])if(this.inViewX(launcher.x,launcher.w))drawLauncher(c,launcher,art,visualTime,(this.launcherCooldown.get(launcher.id)??0)<=this.time);
    for(const button of this.buttons)if(this.inViewX(button.x,button.w))this.drawButton(c,button);
    for(const laser of this.lasers)if(this.inViewX(laser.x,laser.w))this.drawLaser(c,laser);
    for(const s of this.spikes)if(this.inViewX(s.x,s.w)){if(s.active)this.drawSpike(c,s);else if(this.save.settings.showHiddenTraps||this.directorCommand.id==='needle')this.drawHiddenSpike(c,s);}
    for(const crusher of this.room.crushers??[]){const rect=this.crusherRect(crusher);if(this.inViewX(rect.x,rect.w))drawCrusher(c,crusher,art,this.time*this.directorCommand.motionScale);}
    for(const sentry of this.room.sentries??[])if(this.inViewX(sentry.x-55,110))this.drawSentry(c,sentry);
    for(const shot of this.sentryShots)if(this.inViewX(shot.x-shot.r,shot.r*2))this.drawDirectorShot(c,shot);
    if(this.save.settings.showGhost&&this.ghostPoints.length){const ghost=ghostPositionAt(this.ghostPoints,this.time-this.ghostStartTime);if(ghost)this.drawGhost(c,ghost.x,ghost.y);}
    for(const echo of this.echoes)if(this.inViewX(echo.x,echo.w))this.drawEcho(c,echo);
    for(const [i,cp] of this.allCheckpoints().entries())if(this.inViewX(cp.x,cp.w))this.drawCheckpoint(c,cp,i===this.checkpointIndex);
    if(this.room.shard&&!this.collected&&this.inViewX(this.room.shard.x,this.room.shard.w))this.drawShard(c,this.room.shard);
    for(const item of this.optionals)if(this.inViewX(item.x,item.w))this.drawOptional(c,item);
    this.drawBoss(c);
    if(this.inViewX(this.room.exit.x,this.room.exit.w))this.drawExit(c,this.room.exit);
    if(this.room.kind==='epilogue')this.drawEpilogueChoice(c);
    if(!this.dead)this.drawPlayer(c);
    for(const p of this.particles)if(this.inViewX(p.x,1,80)){c.globalAlpha=Math.max(0,p.life*2);c.fillStyle=p.color;c.beginPath();c.arc(p.x,p.y,5+p.life*7,0,Math.PI*2);c.fill();}c.globalAlpha=1;
    if(this.debugOverlay)this.drawDebug(c);c.restore();this.drawForeground(c);
    this.drawDirectorOverlay(c);
  }

  private ensureStageCache():HTMLCanvasElement{
    const key=`${this.room.id}:${this.room.chapter}:${this.dpr}:${this.lowDetail}:${this.save.settings.dynamicBackground}`;
    if(this.stageCache&&this.stageCacheKey===key)return this.stageCache;
    const canvas=this.stageCache??document.createElement('canvas');canvas.width=Math.round(W*this.dpr);canvas.height=Math.round(H*this.dpr);const c=canvas.getContext('2d')!,art=chapterArt(this.room.chapter);c.setTransform(this.dpr,0,0,this.dpr,0,0);
    const sky=c.createLinearGradient(0,0,0,H);sky.addColorStop(0,art.skyTop);sky.addColorStop(.58,shade(art.skyBottom,-.08));sky.addColorStop(1,art.skyBottom);c.fillStyle=sky;c.fillRect(0,0,W,H);
    const glow=c.createRadialGradient(W*.52,H*.36,30,W*.52,H*.42,690);glow.addColorStop(0,'rgba(255,239,198,.26)');glow.addColorStop(.48,'rgba(255,225,180,.08)');glow.addColorStop(1,'rgba(17,10,22,.25)');c.fillStyle=glow;c.fillRect(0,0,W,H);
    c.globalCompositeOperation='multiply';c.globalAlpha=.26;c.fillStyle=art.paperShadow;for(let band=0;band<7;band++){const y=72+band*99+(visualSeed(this.save.room,band)-.5)*9;c.beginPath();c.moveTo(0,y);for(let x=0;x<=W;x+=64)c.lineTo(x,y+(visualSeed(this.save.room+band,x)-.5)*9);c.lineTo(W,y+5);c.lineTo(0,y+7);c.closePath();c.fill();}
    c.globalAlpha=.16;c.strokeStyle=art.ink;c.lineWidth=1;for(let i=0;i<260;i++){const seed=visualSeed(this.save.room,i),x=seed*W,y=visualSeed(i,this.save.room+91)*H,len=8+visualSeed(i+19,this.save.room)*38;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+len*.45,y+(seed-.5)*4,x+len,y+(visualSeed(i,42)-.5)*3);c.stroke();}
    c.globalAlpha=.11;c.fillStyle='#fff6df';for(let i=0;i<145;i++){const x=visualSeed(this.save.room+33,i)*W,y=visualSeed(i+8,this.save.room+11)*H,r=.5+visualSeed(i,77)*1.8;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}
    c.globalCompositeOperation='source-over';c.globalAlpha=1;c.fillStyle='rgba(18,12,22,.28)';c.font='900 242px Georgia,serif';c.textAlign='right';c.fillText(String(this.save.room+1).padStart(2,'0'),W-76,268);
    c.strokeStyle='rgba(245,224,184,.14)';c.lineWidth=2;c.strokeRect(93,57,W-186,H-102);this.drawFarLandmarks(c,art);this.drawStageLights(c,art);
    c.globalAlpha=.22;c.fillStyle=shade(art.curtain,-.08);for(let x=-310;x<W+310;x+=310){c.beginPath();c.moveTo(x,650);c.lineTo(x+16,528);c.quadraticCurveTo(x+62,474,x+108,528);c.lineTo(x+128,650);c.closePath();c.fill();}c.globalAlpha=1;
    this.stageCache=canvas;this.stageCacheKey=key;return canvas;
  }

  private drawBackdrop(c:CanvasRenderingContext2D):void{
    const cache=this.ensureStageCache();c.drawImage(cache,0,0,cache.width,cache.height,0,0,W,H);
  }

  private drawFarLandmarks(c:CanvasRenderingContext2D,art:ChapterArt):void{
    const drift=fixedBackdropOffset(this.cameraX);c.save();c.translate(drift,0);c.strokeStyle=shade(art.ink,.06);c.lineWidth=4;c.lineJoin='round';
    if(this.room.chapter===1){
      for(let base=-180;base<W+500;base+=430){const x=base+(this.save.room%3)*57;c.fillStyle=shade(art.paper,-.04);c.fillRect(x,275,310,340);c.strokeRect(x,275,310,340);c.fillStyle=art.accent;for(let i=0;i<6;i++){c.beginPath();c.moveTo(x+i*52,275);c.lineTo(x+i*52+26,330);c.lineTo(x+i*52+52,275);c.closePath();c.fill();}c.fillStyle=shade(art.platform,-.03);c.fillRect(x+36,365,238,155);c.strokeRect(x+36,365,238,155);c.fillStyle=art.glow;c.beginPath();c.arc(x+80,412,22,0,Math.PI*2);c.arc(x+155,440,31,0,Math.PI*2);c.arc(x+230,405,19,0,Math.PI*2);c.fill();}
      c.globalAlpha=.78;for(let i=0;i<5;i++){const x=140+i*285;c.strokeStyle=art.ink;c.lineWidth=7;c.beginPath();c.moveTo(x,610);c.lineTo(x,400+(i%2)*48);c.stroke();c.fillStyle=i%2?art.secondary:art.platformLight;c.beginPath();c.arc(x,366+(i%2)*48,39,0,Math.PI*2);c.fill();c.stroke();c.strokeStyle=art.paper;c.lineWidth=6;c.beginPath();c.arc(x,366+(i%2)*48,18,0,Math.PI*2);c.stroke();}
    }else if(this.room.chapter===2){
      c.fillStyle=shade(art.curtain,.06);c.beginPath();c.moveTo(-80,612);c.lineTo(120,106);c.quadraticCurveTo(640,-48,1160,106);c.lineTo(1380,612);c.lineTo(1120,612);c.quadraticCurveTo(640,52,160,612);c.closePath();c.fill();c.stroke();
      c.fillStyle=shade(art.paperShadow,-.18);for(let y=470;y<625;y+=48)for(let x=-20+(y%96);x<1500;x+=82){c.beginPath();c.arc(x,y,23,Math.PI,0);c.lineTo(x+23,y+19);c.lineTo(x-23,y+19);c.closePath();c.fill();}
      c.globalAlpha=.28;c.fillStyle=art.accent;c.beginPath();c.moveTo(390,40);c.lineTo(545,610);c.lineTo(745,610);c.lineTo(900,40);c.closePath();c.fill();c.globalAlpha=.22;c.fillStyle=art.glow;c.beginPath();c.moveTo(516,0);c.lineTo(590,610);c.lineTo(690,610);c.lineTo(764,0);c.closePath();c.fill();
    }else if(this.room.chapter===3){
      for(let x=-40;x<W+360;x+=265){c.fillStyle=shade(art.paperShadow,-.09);c.beginPath();c.ellipse(x+122,405,105,250,0,0,Math.PI*2);c.fill();c.stroke();c.fillStyle='rgba(205,239,226,.17)';c.beginPath();c.ellipse(x+132,401,74,215,0,0,Math.PI*2);c.fill();c.stroke();c.strokeStyle='rgba(234,255,244,.42)';c.lineWidth=3;c.beginPath();c.moveTo(x+105,212);c.lineTo(x+151,592);c.moveTo(x+164,235);c.lineTo(x+96,520);c.stroke();}
      c.strokeStyle=art.glow;c.globalAlpha=.32;c.setLineDash([13,12]);c.beginPath();c.moveTo(640,45);c.lineTo(640,670);c.stroke();c.setLineDash([]);
    }else{
      c.fillStyle=shade(art.curtain,-.03);for(let x=-30;x<W+260;x+=235){c.fillRect(x,180,72,450);c.beginPath();c.moveTo(x-16,180);c.lineTo(x+36,92);c.lineTo(x+88,180);c.closePath();c.fill();c.stroke();}
      for(let x=145;x<W+200;x+=310){c.fillStyle=art.accent;c.strokeStyle=art.ink;c.lineWidth=5;c.beginPath();c.arc(x,385,58,0,Math.PI*2);c.fill();c.stroke();c.fillStyle=art.ink;for(let i=0;i<12;i++){c.save();c.translate(x,385);c.rotate(i*Math.PI/6);c.fillRect(48,-7,18,14);c.restore();}c.fillStyle=art.paper;c.beginPath();c.arc(x,385,18,0,Math.PI*2);c.fill();c.stroke();}
      c.globalAlpha=.36;for(let x=260;x<W;x+=390){c.fillStyle=x%780?art.secondary:art.platformLight;c.beginPath();c.moveTo(x,215);c.lineTo(x+58,250);c.lineTo(x+42,342);c.lineTo(x-44,342);c.lineTo(x-59,252);c.closePath();c.fill();c.stroke();}
    }
    c.restore();
  }

  private drawStageLights(c:CanvasRenderingContext2D,art:ChapterArt):void{
    if(!this.save.settings.dynamicBackground)return;const t=0;c.save();c.globalCompositeOperation='screen';const positions=this.lowDetail?[350,930]:this.room.chapter===2?[315,640,970]:[235,760,1090];for(let i=0;i<positions.length;i++){const x=positions[i]+Math.sin(t*(.18+i*.04)+i)*(this.lowDetail?14:28);if(this.lowDetail)c.fillStyle='rgba(255,225,166,.075)';else{const gradient=c.createRadialGradient(x,82,5,x,490,310);gradient.addColorStop(0,'rgba(255,238,181,.26)');gradient.addColorStop(.52,'rgba(255,220,150,.11)');gradient.addColorStop(1,'rgba(255,220,150,0)');c.fillStyle=gradient;}c.beginPath();c.moveTo(x-18,0);c.lineTo(x+18,0);c.lineTo(x+(this.lowDetail?225:285),660);c.lineTo(x-(this.lowDetail?225:285),660);c.closePath();c.fill();}
    c.globalCompositeOperation='source-over';c.strokeStyle=art.ink;c.fillStyle=art.glow;c.lineWidth=3;const count=this.lowDetail?3:5;for(let i=0;i<count;i++){const x=150+i*(this.lowDetail?430:250);c.beginPath();c.moveTo(x,0);c.lineTo(x+Math.sin(t*.35+i)*8,86+(i%2)*26);c.stroke();c.beginPath();c.arc(x,96+(i%2)*26,9,0,Math.PI*2);c.fill();c.stroke();}c.restore();
  }

  private ensureSceneryCache():HTMLCanvasElement{
    const width=this.worldWidth(),key=`${this.room.id}:${this.room.chapter}:${width}:${this.dpr}`;
    if(this.sceneryCache&&this.sceneryCacheKey===key)return this.sceneryCache;
    const canvas=this.sceneryCache??document.createElement('canvas');canvas.width=Math.round(width*this.dpr);canvas.height=Math.round(H*this.dpr);const c=canvas.getContext('2d')!,art=chapterArt(this.room.chapter);c.setTransform(this.dpr,0,0,this.dpr,0,0);
    c.clearRect(0,0,width,H);this.paintWorldScenery(c);drawLandmark(c,this.room.landmark,width,art,0);this.sceneryCache=canvas;this.sceneryCacheKey=key;return canvas;
  }

  private drawWorldScenery(c:CanvasRenderingContext2D):void{
    const cache=this.ensureSceneryCache(),width=this.worldWidth(),left=Math.max(0,Math.floor(this.cameraX)-24),right=Math.min(width,Math.ceil(this.cameraX+W)+24),sourceWidth=Math.max(1,right-left);
    c.drawImage(cache,left*this.dpr,0,sourceWidth*this.dpr,H*this.dpr,left,0,sourceWidth,H);
  }

  private paintWorldScenery(c:CanvasRenderingContext2D):void{
    const width=this.worldWidth(),art=chapterArt(this.room.chapter);c.save();c.lineJoin='round';
    c.globalAlpha=.55;c.strokeStyle=shade(art.ink,.06);c.lineWidth=3;for(let x=120;x<width;x+=330){const end=128+(x%5)*17;c.beginPath();c.moveTo(x,0);c.quadraticCurveTo(x+18,end*.55,x+(visualSeed(this.save.room,x)-.5)*24,end);c.stroke();c.fillStyle=x%660?art.accent:art.secondary;c.beginPath();c.arc(x,end+10,10,0,Math.PI*2);c.fill();c.stroke();}
    for(let x=280;x<width;x+=610){c.save();c.translate(x,346+(Math.floor(x/610)%2)*66);c.rotate((visualSeed(this.save.room,x)-.5)*.08);c.shadowColor='rgba(20,12,22,.22)';c.shadowOffsetY=7;c.fillStyle=shade(art.paper,-.03);c.strokeStyle=art.ink;c.lineWidth=3;this.roundRect(c,-84,-43,168,86,5);c.fill();c.shadowColor='transparent';c.stroke();c.fillStyle=art.hazard;c.fillRect(-84,-43,9,86);c.fillStyle=art.ink;c.font='900 13px "PingFang SC",sans-serif';c.textAlign='center';c.fillText(['继续微笑','后台禁止醒来','道具会记仇','演员不是玩家'][Math.floor(x/610+this.room.chapter)%4],4,5);c.strokeStyle=art.paperShadow;c.lineWidth=2;c.beginPath();c.moveTo(-60,17);c.lineTo(56,17);c.stroke();c.restore();}
    if(this.room.chapter===1){for(let x=420;x<width;x+=720){c.save();c.translate(x,590);c.fillStyle=shade(art.platform,-.05);c.strokeStyle=art.ink;c.lineWidth=4;c.fillRect(-84,-72,168,72);c.strokeRect(-84,-72,168,72);c.fillStyle=art.accent;for(let i=-72;i<72;i+=24)c.fillRect(i,-72,12,72);c.fillStyle=art.paper;c.beginPath();c.arc(0,-88,42,Math.PI,0);c.fill();c.stroke();c.restore();}}
    else if(this.room.chapter===2){for(let x=390;x<width;x+=650){c.save();c.translate(x,650);c.fillStyle=shade(art.curtain,.08);c.strokeStyle=art.ink;c.lineWidth=4;c.beginPath();c.moveTo(-90,0);c.lineTo(0,-174);c.lineTo(90,0);c.closePath();c.fill();c.stroke();c.fillStyle=art.accent;c.beginPath();c.moveTo(-46,0);c.lineTo(0,-174);c.lineTo(46,0);c.closePath();c.fill();c.restore();}}
    else if(this.room.chapter===3){for(let x=350;x<width;x+=610){c.save();c.translate(x,600);c.strokeStyle=art.paper;c.lineWidth=9;c.strokeRect(-80,-300,160,300);c.strokeStyle=art.ink;c.lineWidth=3;c.strokeRect(-85,-305,170,310);c.globalAlpha=.22;c.fillStyle=art.glow;c.fillRect(-72,-292,144,285);c.strokeStyle=art.glow;c.lineWidth=2;c.beginPath();c.moveTo(-48,-270);c.lineTo(39,-23);c.moveTo(53,-270);c.lineTo(-25,-92);c.stroke();c.restore();}}
    else{for(let x=350;x<width;x+=680){c.save();c.translate(x,650);c.fillStyle=shade(art.platformDark,-.08);c.strokeStyle=art.ink;c.lineWidth=4;c.fillRect(-38,-355,76,355);c.strokeRect(-38,-355,76,355);c.fillStyle=art.accent;c.beginPath();c.arc(0,-270,44,0,Math.PI*2);c.fill();c.stroke();c.fillStyle=art.ink;c.beginPath();c.arc(-14,-275,5,0,Math.PI*2);c.arc(14,-275,5,0,Math.PI*2);c.fill();c.lineWidth=5;c.beginPath();c.arc(0,-262,24,.2,Math.PI-.2);c.stroke();c.restore();}}
    c.restore();
  }

  private ensureForegroundCache():HTMLCanvasElement{
    const key=`${this.room.chapter}:${this.dpr}:${this.lowDetail}`;if(this.foregroundCache&&this.foregroundCacheKey===key)return this.foregroundCache;
    const canvas=this.foregroundCache??document.createElement('canvas');canvas.width=Math.round(W*this.dpr);canvas.height=Math.round(H*this.dpr);const c=canvas.getContext('2d')!;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.clearRect(0,0,W,H);this.paintForeground(c);this.foregroundCache=canvas;this.foregroundCacheKey=key;return canvas;
  }

  private drawForeground(c:CanvasRenderingContext2D):void{const cache=this.ensureForegroundCache();c.drawImage(cache,0,0,cache.width,cache.height,0,0,W,H);}

  private paintForeground(c:CanvasRenderingContext2D):void{
    const art=chapterArt(this.room.chapter);c.save();const vignette=c.createRadialGradient(W/2,H*.46,245,W/2,H*.48,790);vignette.addColorStop(0,'rgba(17,10,19,0)');vignette.addColorStop(.68,'rgba(17,10,19,.05)');vignette.addColorStop(1,'rgba(17,10,19,.52)');c.fillStyle=vignette;c.fillRect(0,0,W,H);
    c.fillStyle=shade(art.curtain,-.08);c.strokeStyle=art.ink;c.lineWidth=5;c.shadowColor='rgba(0,0,0,.35)';c.shadowBlur=this.lowDetail?7:18;
    c.beginPath();c.moveTo(0,0);c.lineTo(92,0);c.bezierCurveTo(126,175,66,385,112,H);c.lineTo(0,H);c.closePath();c.fill();c.stroke();c.beginPath();c.moveTo(W,0);c.lineTo(W-92,0);c.bezierCurveTo(W-126,175,W-66,385,W-112,H);c.lineTo(W,H);c.closePath();c.fill();c.stroke();
    c.shadowColor='transparent';c.fillStyle=art.accent;c.globalAlpha=.55;c.beginPath();c.moveTo(0,0);c.lineTo(W,0);c.lineTo(W-35,25);c.quadraticCurveTo(W/2,54,35,25);c.closePath();c.fill();c.globalAlpha=.3;c.fillStyle=art.paper;c.fillRect(0,H-13,W,13);c.restore();
  }

  private drawBlock(c:CanvasRenderingContext2D,b:BlockRun):void{
    const art=chapterArt(this.room.chapter),base=b.kind==='bounce'?art.accent:b.kind==='ice'?art.secondary:b.kind==='sticky'?shade(art.accent,-.12):b.kind==='toggle'?(b.activeWhen===false?art.secondary:art.accent):b.kind==='crumble'?shade(art.paperShadow,.08):b.kind==='orbit'?shade(art.platformLight,-.05):b.kind==='gate'?art.platformDark:art.platform,ink=art.ink,depth=Math.min(12,Math.max(5,b.h*.28));c.save();
    if(b.kind==='phase'&&!b.active)c.globalAlpha=.18+.12*Math.sin(this.time*12);
    if(b.kind==='toggle'&&!b.active)c.globalAlpha=.13+.07*Math.sin(this.time*5);
    if(!this.lowDetail){c.shadowColor='rgba(18,10,22,.42)';c.shadowBlur=10;c.shadowOffsetY=9;}c.fillStyle=shade(base,-.34);this.roundRect(c,b.x+3,b.y+depth,b.w-1,Math.max(6,b.h-depth),Math.min(7,b.h/2));c.fill();c.shadowColor='transparent';
    if(this.lowDetail)c.fillStyle=base;else{const face=c.createLinearGradient(0,b.y,0,b.y+b.h);face.addColorStop(0,shade(base,.17));face.addColorStop(.22,base);face.addColorStop(1,shade(base,-.18));c.fillStyle=face;}this.roundRect(c,b.x,b.y,b.w,b.h,Math.min(8,b.h/2));c.fill();c.strokeStyle=ink;c.lineWidth=this.save.settings.thickOutlines?5:3;c.stroke();
    c.fillStyle=shade(base,.38);this.roundRect(c,b.x+4,b.y+4,b.w-8,Math.min(7,b.h*.24),3);c.fill();c.globalAlpha*=.42;c.strokeStyle=shade(ink,.18);c.lineWidth=1;for(let x=b.x+22;x<b.x+b.w-8;x+=45){const skew=(visualSeed(Math.round(b.x),Math.round(x))-.5)*8;c.beginPath();c.moveTo(x,b.y+4);c.lineTo(x+skew,b.y+b.h-5);c.stroke();}c.globalAlpha=b.kind==='phase'&&!b.active?.18+.12*Math.sin(this.time*12):1;
    c.strokeStyle='rgba(30,18,28,.28)';c.lineWidth=2;c.beginPath();c.moveTo(b.x+5,b.y+b.h-5);for(let x=b.x+16;x<b.x+b.w-5;x+=16)c.lineTo(x,b.y+b.h-5+(visualSeed(Math.round(b.y),Math.round(x))-.5)*4);c.stroke();
    if(b.kind==='fake'){c.strokeStyle=shade(ink,.18);c.lineWidth=2;c.setLineDash([7,6]);c.strokeRect(b.x+7,b.y+7,b.w-14,b.h-14);c.setLineDash([]);c.fillStyle='rgba(255,239,207,.36)';c.font='900 11px monospace';c.textAlign='center';c.fillText('PROP',b.x+b.w/2,b.y+b.h/2+4);}
    if(b.kind==='bounce'){c.strokeStyle=shade(art.paper,.06);c.lineWidth=4;for(let x=b.x+14;x<b.x+b.w-8;x+=24){c.beginPath();c.moveTo(x,b.y+b.h-7);c.quadraticCurveTo(x+6,b.y+4,x+12,b.y+b.h-7);c.stroke();}c.fillStyle=shade(art.accent,.32);c.fillRect(b.x+7,b.y+4,b.w-14,4);}
    if(b.kind==='ice'){c.globalAlpha=.55;c.fillStyle=shade(art.glow,.05);for(let x=b.x+18;x<b.x+b.w;x+=62){c.beginPath();c.ellipse(x,b.y+8,23,4,-.12,0,Math.PI*2);c.fill();}c.strokeStyle=art.paper;c.lineWidth=2;c.beginPath();c.moveTo(b.x+8,b.y+b.h*.65);c.lineTo(b.x+b.w*.36,b.y+b.h*.35);c.lineTo(b.x+b.w*.54,b.y+b.h*.72);c.stroke();}
    if(b.kind==='gate'){c.strokeStyle=art.accent;c.lineWidth=5;for(let y=b.y+14;y<b.y+b.h;y+=27){c.beginPath();c.moveTo(b.x+6,y);c.lineTo(b.x+b.w-6,y);c.stroke();}c.fillStyle=art.ink;c.beginPath();c.arc(b.x+b.w/2,b.y+13,4,0,Math.PI*2);c.fill();if(b.id.includes('-lock-')){const mark=b.id.endsWith('-A')?'A':'B';c.shadowColor=art.hazard;c.shadowBlur=12;c.fillStyle=art.paper;c.strokeStyle=art.hazard;c.lineWidth=3;this.roundRect(c,b.x-18,b.y+58,b.w+36,42,4);c.fill();c.shadowColor='transparent';c.stroke();c.fillStyle=art.ink;c.font='900 10px monospace';c.textAlign='center';c.fillText('DIRECTOR',b.x+b.w/2,b.y+74);c.fillStyle=art.hazard;c.font='900 18px monospace';c.fillText(`LOCK ${mark}`,b.x+b.w/2,b.y+94);}}
    if(b.kind==='oneway'){c.strokeStyle=art.paper;c.lineWidth=3;for(let x=b.x+15;x<b.x+b.w-8;x+=28){c.beginPath();c.moveTo(x-7,b.y+19);c.lineTo(x,b.y+9);c.lineTo(x+7,b.y+19);c.stroke();}}
    if(b.kind==='conveyor'){c.fillStyle=shade(base,-.3);this.roundRect(c,b.x+7,b.y+b.h*.35,b.w-14,b.h*.48,5);c.fill();c.strokeStyle=ink;c.lineWidth=2;for(let x=b.x+18;x<b.x+b.w-10;x+=27){c.beginPath();c.arc(x,b.y+b.h*.59,8,0,Math.PI*2);c.stroke();const d=Math.sign(b.forceX??1);c.beginPath();c.moveTo(x-4*d,b.y+b.h*.59-3);c.lineTo(x+4*d,b.y+b.h*.59);c.lineTo(x-4*d,b.y+b.h*.59+3);c.stroke();}}
    if(b.kind==='phase'){c.strokeStyle=art.glow;c.lineWidth=2;c.setLineDash([8,5]);for(let y=b.y+8;y<b.y+b.h;y+=10){c.beginPath();c.moveTo(b.x+7,y);c.lineTo(b.x+b.w-7,y);c.stroke();}c.setLineDash([]);}
    if(b.kind==='sticky'){
      c.globalAlpha=.86;c.fillStyle=shade(art.accent,.08);c.beginPath();c.moveTo(b.x+5,b.y+4);c.lineTo(b.x+b.w-5,b.y+4);for(let x=b.x+b.w-5;x>b.x+5;x-=22){const drip=8+visualSeed(Math.round(x),Math.round(b.y))*12;c.lineTo(x,b.y+9);c.quadraticCurveTo(x-5,b.y+drip,x-10,b.y+8);}c.closePath();c.fill();c.strokeStyle=shade(art.accent,-.35);c.lineWidth=2;c.stroke();c.fillStyle=art.glow;for(let x=b.x+17;x<b.x+b.w;x+=41){c.globalAlpha=.32;c.beginPath();c.ellipse(x,b.y+8,7,2,0,0,Math.PI*2);c.fill();}
    }
    if(b.kind==='crumble'){
      const state=crumbleStateAt(b.crumbleTouched,this.time,b.crumbleDelay,b.crumbleRespawn);c.strokeStyle=state==='warning'?art.hazard:shade(ink,.08);c.lineWidth=2.4;for(let i=0;i<Math.max(2,Math.floor(b.w/55));i++){const x=b.x+18+i*47;c.beginPath();c.moveTo(x,b.y+3);c.lineTo(x+7,b.y+b.h*.4);c.lineTo(x-3,b.y+b.h*.78);c.lineTo(x+10,b.y+b.h-3);c.stroke();}if(state==='warning'){c.globalAlpha=.32+.18*Math.sin(this.time*35);c.fillStyle=art.hazard;c.fillRect(b.x,b.y,b.w,b.h);}
    }
    if(b.kind==='toggle'){
      const channel=b.activeWhen===false?art.secondary:art.accent;c.strokeStyle=channel;c.lineWidth=5;c.setLineDash([12,7]);c.strokeRect(b.x+5,b.y+5,b.w-10,b.h-10);c.setLineDash([]);c.fillStyle=art.ink;c.font='900 8px monospace';c.textAlign='left';c.fillText(b.activeWhen===false?'B':'A',b.x+10,b.y+14);
    }
    if(b.kind==='orbit'){
      c.fillStyle=art.ink;for(const x of [b.x+13,b.x+b.w-13]){c.beginPath();c.arc(x,b.y+b.h/2,4,0,Math.PI*2);c.fill();}c.strokeStyle=art.accent;c.lineWidth=2;c.beginPath();c.arc(b.x+b.w/2,b.y+b.h/2,9,0,Math.PI*2);c.stroke();
    }
    if(b.w>105&&b.h>23&&b.kind!=='conveyor'){c.save();c.translate(b.x+b.w*.72,b.y+3);c.rotate(-.05);c.fillStyle='rgba(239,210,145,.65)';c.fillRect(-22,-3,44,11);c.strokeStyle='rgba(41,31,43,.25)';c.lineWidth=1;c.strokeRect(-22,-3,44,11);c.restore();}
    c.restore();
  }

  private drawWind(c:CanvasRenderingContext2D,z:Rect&{forceX:number;forceY:number}):void{c.save();c.globalAlpha=.14;c.fillStyle='#e9e0c4';c.fillRect(z.x,z.y,z.w,z.h);c.globalAlpha=.48;c.strokeStyle='#eee3c8';c.lineWidth=2;const d=Math.sign(z.forceX||1);for(let y=z.y+24;y<z.y+z.h;y+=48)for(let x=z.x+20;x<z.x+z.w;x+=115){const drift=(this.time*90*d+y)%115;c.beginPath();c.moveTo(x+drift-115,y);c.quadraticCurveTo(x+drift-70,y-9,x+drift-26,y);c.lineTo(x+drift-37*d,y-7);c.moveTo(x+drift-26,y);c.lineTo(x+drift-39*d,y+7);c.stroke();}c.restore();}

  private drawPursuit(c:CanvasRenderingContext2D):void{
    const def=this.room.pursuit;if(!def)return;const art=chapterArt(this.room.chapter),w=def.width??94,x=this.pursuitX,pulse=.5+.5*Math.sin(this.time*9);c.save();
    const swallowed=c.createLinearGradient(x-260,0,x+w,0);swallowed.addColorStop(0,'rgba(18,8,17,.96)');swallowed.addColorStop(.72,'rgba(52,19,38,.94)');swallowed.addColorStop(1,'rgba(129,41,62,.9)');c.fillStyle=swallowed;c.fillRect(-400,0,x+w+400,H);
    c.shadowColor=art.hazard;c.shadowBlur=this.pursuitActive?18+14*pulse:5;c.fillStyle=shade(art.curtain,-.08);c.strokeStyle=art.ink;c.lineWidth=5;c.beginPath();c.moveTo(x,0);for(let y=0;y<=H;y+=42)c.lineTo(x+w+(y/42%2?12:-7)+Math.sin(this.time*7+y)*5,y);c.lineTo(x,720);c.closePath();c.fill();c.stroke();c.shadowColor='transparent';
    for(let y=35;y<H;y+=58){const bite=Math.sin(this.time*5+y*.04)*4;c.fillStyle=y%116?art.paper:art.accent;c.strokeStyle=art.ink;c.lineWidth=2;c.beginPath();c.moveTo(x+w-5,y-15);c.lineTo(x+w+25+bite,y);c.lineTo(x+w-5,y+15);c.closePath();c.fill();c.stroke();}
    c.fillStyle=art.glow;c.globalAlpha=this.pursuitActive?.65+.25*pulse:.18;c.font='900 11px monospace';c.textAlign='center';c.save();c.translate(x+w*.5,350);c.rotate(-Math.PI/2);c.fillText(this.pursuitActive?'KEEP MOVING':'STANDBY',0,0);c.restore();c.restore();
  }

  private drawSentry(c:CanvasRenderingContext2D,s:SentryDef):void{
    const art=chapterArt(this.room.chapter),pattern=s.pattern??'aimed',label=s.label??patternLabel(pattern),pulse=.5+.5*Math.sin(this.time*4+s.x),next=(this.sentryNext.get(s.id)??this.time)-this.time,charging=next<Math.max(.58,s.warning),accent=s.shotColor??art.hazard;c.save();c.translate(s.x,s.y);c.rotate(Math.sin(this.time*1.3+s.x)*.035);c.shadowColor=charging?accent:'rgba(20,10,22,.3)';c.shadowBlur=charging?10:5;c.fillStyle=shade(art.platformDark,-.08);c.strokeStyle=art.ink;c.lineWidth=4;c.beginPath();for(let i=0;i<8;i++){const angle=i*Math.PI/4,r=i%2?29:39;c.lineTo(Math.cos(angle)*r,Math.sin(angle)*r);}c.closePath();c.fill();c.stroke();c.shadowColor='transparent';c.fillStyle=art.paper;c.beginPath();c.ellipse(0,0,23,16,0,0,Math.PI*2);c.fill();c.stroke();const dx=this.player.x+PW/2-s.x,dy=this.player.y+PH/2-s.y,len=Math.hypot(dx,dy)||1;c.fillStyle=charging?accent:art.ink;c.beginPath();c.arc(dx/len*7,dy/len*5,6+2*pulse,0,Math.PI*2);c.fill();c.fillStyle=art.glow;c.beginPath();c.arc(dx/len*7-2,dy/len*5-2,1.8,0,Math.PI*2);c.fill();c.strokeStyle=accent;c.lineWidth=2;c.setLineDash([6,6]);c.beginPath();c.arc(0,0,45+3*pulse,0,Math.PI*2);c.stroke();c.setLineDash([]);
    c.fillStyle=charging?accent:shade(art.paper,-.04);c.strokeStyle=art.ink;c.lineWidth=2;this.roundRect(c,-34,47,68,22,4);c.fill();c.stroke();c.fillStyle=charging?art.glow:art.ink;c.font='900 10px monospace';c.textAlign='center';c.fillText(`${patternGlyph(pattern)} ${label}`,0,62);c.restore();
  }

  private drawDirectorShot(c:CanvasRenderingContext2D,shot:DirectorShot):void{
    const art=chapterArt(this.room.chapter);c.save();if(shot.warning>0){const alpha=.22+.2*Math.sin(this.time*20);c.globalAlpha=alpha;c.strokeStyle=shot.color;c.lineWidth=2.5;c.setLineDash([10,9]);c.beginPath();c.moveTo(shot.x,shot.y);if(shot.pattern==='arc')c.quadraticCurveTo((shot.x+shot.targetX)/2,Math.min(80,shot.y-145),shot.targetX,shot.targetY);else c.lineTo(shot.targetX,shot.targetY);c.stroke();c.setLineDash([]);c.globalAlpha=.78;c.fillStyle=shot.color;c.beginPath();c.arc(shot.x,shot.y,6+Math.sin(this.time*16)*2,0,Math.PI*2);c.fill();}else{c.translate(shot.x,shot.y);c.rotate(this.time*(shot.pattern==='arc'?3:8));c.shadowColor=shot.color;c.shadowBlur=this.lowDetail?4:8;c.fillStyle=shot.color;c.strokeStyle=art.ink;c.lineWidth=2.5;
      if(shot.pattern==='arc'){c.beginPath();c.arc(0,0,shot.r,0,Math.PI*2);c.fill();c.stroke();c.strokeStyle=art.glow;c.lineWidth=2;c.beginPath();c.arc(0,0,shot.r*.52,0,Math.PI*2);c.stroke();}
      else if(shot.pattern==='fan'){c.beginPath();c.moveTo(shot.r+5,0);c.lineTo(-shot.r,-6);c.lineTo(-shot.r,6);c.closePath();c.fill();c.stroke();}
      else if(shot.pattern==='mirror'){c.beginPath();c.moveTo(0,-shot.r-3);c.lineTo(shot.r+3,0);c.lineTo(0,shot.r+3);c.lineTo(-shot.r-3,0);c.closePath();c.fill();c.stroke();}
      else{c.beginPath();for(let i=0;i<10;i++){const r=i%2?5:shot.r+3,angle=i*Math.PI/5;c.lineTo(Math.cos(angle)*r,Math.sin(angle)*r);}c.closePath();c.fill();c.stroke();}
      c.shadowColor='transparent';c.fillStyle=art.glow;c.beginPath();c.arc(0,0,2.5,0,Math.PI*2);c.fill();}c.restore();
  }

  private drawButton(c:CanvasRenderingContext2D,b:ButtonRun):void{
    const art=chapterArt(this.room.chapter),drop=b.pressed?8:0,bossIndex=b.target==='boss'?this.buttons.indexOf(b):-1,bossCurrent=bossIndex===this.bossPhase,bossReady=bossCurrent&&this.bossStageReady();c.save();
    if(b.target==='boss'){
      const label=b.pressed?'阶段完成':bossCurrent?(bossReady?'机关已解锁':`攻势 ${Math.min(this.bossStageWaves,this.bossWaveRequirement())}/${this.bossWaveRequirement()}`):`阶段 ${bossIndex+1}`,width=76;c.fillStyle=b.pressed?art.secondary:bossReady?art.glow:art.paper;c.strokeStyle=bossReady?art.secondary:art.ink;c.lineWidth=2;this.roundRect(c,b.x+b.w/2-width/2,b.y-30,width,22,4);c.fill();c.stroke();c.fillStyle=art.ink;c.font='900 9px "PingFang SC",sans-serif';c.textAlign='center';c.fillText(label,b.x+b.w/2,b.y-15);
    }
    if(b.requires&&b.requires!=='touch'){
      const label=requirementGlyph(b.requires),width=Math.max(54,label.length*7+18);c.shadowColor='rgba(12,8,17,.32)';c.shadowBlur=8;c.shadowOffsetY=4;c.fillStyle=b.pressed?shade(art.secondary,-.12):art.paper;c.strokeStyle=b.pressed?art.secondary:art.hazard;c.lineWidth=2.5;this.roundRect(c,b.x+b.w/2-width/2,b.y-29,width,22,4);c.fill();c.shadowColor='transparent';c.stroke();c.fillStyle=b.pressed?art.ink:art.hazard;c.font='900 10px monospace';c.textAlign='center';c.fillText(b.pressed?'CLEARED':label,b.x+b.w/2,b.y-14);
    }
    c.shadowColor='rgba(16,9,20,.35)';c.shadowOffsetY=5;c.shadowBlur=7;c.fillStyle=shade(art.ink,.08);this.roundRect(c,b.x-5,b.y+b.h-5,b.w+10,13,5);c.fill();c.shadowColor='transparent';c.fillStyle=b.pressed?art.secondary:art.accent;c.strokeStyle=art.ink;c.lineWidth=3;this.roundRect(c,b.x,b.y+drop,b.w,b.pressed?Math.max(8,b.h-drop):b.h,6);c.fill();c.stroke();c.fillStyle=shade(b.pressed?art.secondary:art.accent,.38);this.roundRect(c,b.x+6,b.y+drop+3,b.w-12,5,2);c.fill();c.fillStyle=art.ink;c.beginPath();c.arc(b.x+7,b.y+b.h+1,2,0,Math.PI*2);c.arc(b.x+b.w-7,b.y+b.h+1,2,0,Math.PI*2);c.fill();c.restore();
  }

  private drawLaser(c:CanvasRenderingContext2D,l:LaserDef):void{
    const art=chapterArt(this.room.chapter),active=this.laserActive(l),phase=this.laserAbsolute(l)%l.period,warning=(this.save.settings.warningBoost?.75:.34)+this.directorCommand.spikeWarning,until=l.period-phase,soon=Math.max(0,1-until/warning),horizontal=l.direction==='horizontal',hazard=this.save.settings.colorFriendly?'#ff5f34':this.save.settings.highContrast?'#ff174f':art.hazard;c.save();
    const drawEmitter=(x:number,y:number,angle:number)=>{c.save();c.translate(x,y);c.rotate(angle);c.shadowColor='rgba(14,8,18,.38)';c.shadowBlur=7;c.shadowOffsetY=4;c.fillStyle=shade(art.platformDark,-.05);c.strokeStyle=art.ink;c.lineWidth=3;this.roundRect(c,-15,-19,30,38,6);c.fill();c.shadowColor='transparent';c.stroke();c.fillStyle=art.accent;c.beginPath();c.arc(0,0,7,0,Math.PI*2);c.fill();c.stroke();c.fillStyle=active?'#fff3c3':shade(art.ink,.22);c.beginPath();c.arc(0,0,3,0,Math.PI*2);c.fill();c.restore();};
    if(horizontal){drawEmitter(l.x-4,l.y+l.h/2,Math.PI/2);drawEmitter(l.x+l.w+4,l.y+l.h/2,-Math.PI/2);}else{drawEmitter(l.x+l.w/2,l.y-4,0);drawEmitter(l.x+l.w/2,l.y+l.h+4,Math.PI);}
    if(active){c.shadowColor=hazard;c.shadowBlur=this.lowDetail?5:20;c.globalAlpha=.72;c.fillStyle=hazard;c.fillRect(l.x,l.y,l.w,l.h);c.globalAlpha=1;c.fillStyle='#fff2bf';if(horizontal)c.fillRect(l.x,l.y+l.h/2-2,l.w,4);else c.fillRect(l.x+l.w/2-2,l.y,4,l.h);c.shadowColor='transparent';const sparks=this.lowDetail?2:5;for(let i=0;i<sparks;i++){const t=(this.time*2+i*.21)%1,x=horizontal?l.x+l.w*t:l.x+l.w/2+(i%2?7:-7),y=horizontal?l.y+l.h/2+(i%2?7:-7):l.y+l.h*t;c.fillStyle=art.glow;c.beginPath();c.arc(x,y,2+i%2,0,Math.PI*2);c.fill();}}
    else{c.globalAlpha=.12+soon*(this.save.settings.flash*.5+.28);c.fillStyle=hazard;c.fillRect(l.x,l.y,l.w,l.h);c.globalAlpha=.38+soon*.5;c.strokeStyle=art.glow;c.lineWidth=2;c.setLineDash([9,7]);c.strokeRect(l.x,l.y,l.w,l.h);c.setLineDash([]);}
    c.restore();
  }

  private drawSpike(c:CanvasRenderingContext2D,s:SpikeRun):void{
    const art=chapterArt(this.room.chapter),scale=Math.max(.05,s.reveal),cx=s.x+s.w/2,cy=s.y+s.h/2,hazard=this.save.settings.colorFriendly?'#ff6b35':this.save.settings.highContrast?'#ff174f':art.hazard;c.save();c.translate(cx,cy);if(s.direction==='down')c.rotate(Math.PI);else if(s.direction==='left')c.rotate(-Math.PI/2);else if(s.direction==='right')c.rotate(Math.PI/2);c.scale(1,scale);
    if(!this.lowDetail){c.shadowColor='rgba(19,9,17,.45)';c.shadowBlur=8;c.shadowOffsetY=6;}c.fillStyle=shade(hazard,-.34);this.roundRect(c,-s.w*.48,s.h*.29,s.w*.96,s.h*.22,3);c.fill();c.shadowColor='transparent';c.strokeStyle=art.ink;c.lineWidth=this.save.settings.thickOutlines?5:3;c.stroke();
    if(this.lowDetail)c.fillStyle=hazard;else{const fold=c.createLinearGradient(-s.w/2,0,s.w/2,0);fold.addColorStop(0,shade(hazard,-.2));fold.addColorStop(.47,hazard);fold.addColorStop(.52,shade(hazard,.25));fold.addColorStop(1,shade(hazard,-.08));c.fillStyle=fold;}c.beginPath();c.moveTo(0,-s.h/2);c.quadraticCurveTo(4,-s.h*.08,s.w/2,s.h/2);c.lineTo(-s.w/2,s.h/2);c.quadraticCurveTo(-4,-s.h*.08,0,-s.h/2);c.fill();c.stroke();
    c.strokeStyle=shade(hazard,.43);c.lineWidth=2;c.beginPath();c.moveTo(0,-s.h*.4);c.lineTo(0,s.h*.33);c.stroke();c.fillStyle=art.glow;c.beginPath();c.arc(0,-s.h*.42,2.2,0,Math.PI*2);c.fill();if(this.save.settings.colorFriendly){c.strokeStyle='#fff2c9';c.lineWidth=2;c.beginPath();c.moveTo(-s.w*.16,s.h*.22);c.lineTo(0,s.h*.02);c.lineTo(s.w*.16,s.h*.22);c.stroke();}c.restore();
  }

  private drawHiddenSpike(c:CanvasRenderingContext2D,s:SpikeRun):void{c.save();c.globalAlpha=.22;c.setLineDash([5,5]);c.strokeStyle='#a33e49';c.lineWidth=2;c.strokeRect(s.x+3,s.y+3,s.w-6,s.h-6);c.restore();}

  private drawCheckpoint(c:CanvasRenderingContext2D,r:Rect,active:boolean):void{
    const art=chapterArt(this.room.chapter),x=r.x+r.w/2,y=r.y+6,pulse=.5+.5*Math.sin(this.time*4);c.save();c.shadowColor=active?art.glow:'rgba(20,10,20,.32)';c.shadowBlur=active?18+10*pulse:7;c.strokeStyle=art.ink;c.lineWidth=3;c.fillStyle=shade(art.platformDark,-.04);this.roundRect(c,x-15,y+33,30,12,4);c.fill();c.stroke();c.shadowColor='transparent';c.fillStyle=art.paper;c.fillRect(x-4,y-3,8,39);c.strokeRect(x-4,y-3,8,39);c.fillStyle=active?art.secondary:art.accent;c.beginPath();c.moveTo(x+3,y);c.quadraticCurveTo(x+31,y+5,x+38,y+20);c.quadraticCurveTo(x+23,y+24,x+3,y+18);c.closePath();c.fill();c.stroke();c.fillStyle=active?art.glow:shade(art.paper,-.08);c.beginPath();c.arc(x,y-8,13,0,Math.PI*2);c.fill();c.stroke();c.fillStyle=art.ink;c.font='900 9px monospace';c.textAlign='center';c.fillText(active?'ON':'SAVE',x,y-5);c.restore();
  }

  private drawShard(c:CanvasRenderingContext2D,r:Rect):void{
    const art=chapterArt(this.room.chapter),x=r.x+r.w/2,y=r.y+r.h/2;c.save();c.translate(x,y);c.rotate(Math.sin(this.time*2)*.07-.07);c.shadowColor=art.glow;c.shadowBlur=13+Math.sin(this.time*4)*4;c.fillStyle=shade(art.accent,.15);c.strokeStyle=art.ink;c.lineWidth=3;this.roundRect(c,-23,-14,46,28,4);c.fill();c.shadowColor='transparent';c.stroke();c.fillStyle=art.paper;c.fillRect(-17,-9,34,18);c.strokeStyle=shade(art.paperShadow,-.05);c.lineWidth=1;c.strokeRect(-17,-9,34,18);c.fillStyle=art.ink;c.font='900 9px monospace';c.textAlign='center';c.fillText('MEMORY',0,3);c.beginPath();c.arc(-23,0,5,0,Math.PI*2);c.arc(23,0,5,0,Math.PI*2);c.fill();c.strokeStyle=art.hazard;c.lineWidth=2;c.beginPath();c.moveTo(-8,-8);c.lineTo(-4,8);c.stroke();c.restore();
  }

  private drawOptional(c:CanvasRenderingContext2D,r:OptionalCollectible):void{
    const art=chapterArt(this.room.chapter);c.save();c.translate(r.x+r.w/2,r.y+r.h/2);c.rotate(-.12+Math.sin(this.time+r.x)*.025);c.shadowColor='rgba(18,10,20,.35)';c.shadowOffsetY=5;c.shadowBlur=6;c.fillStyle=art.paper;c.strokeStyle=art.ink;c.lineWidth=2;c.fillRect(-15,-18,30,36);c.shadowColor='transparent';c.strokeRect(-15,-18,30,36);c.fillStyle=shade(art.paper,-.12);c.beginPath();c.moveTo(5,-18);c.lineTo(15,-8);c.lineTo(5,-8);c.closePath();c.fill();c.stroke();c.fillStyle=art.hazard;c.beginPath();c.arc(0,-14,3,0,Math.PI*2);c.fill();c.strokeStyle=art.paperShadow;for(let y=-7;y<13;y+=6){c.beginPath();c.moveTo(-9,y);c.lineTo(9,y);c.stroke();}c.restore();
  }

  private drawBoss(c:CanvasRenderingContext2D):void{
    if(!this.room.boss)return;const phase=this.bossPhase,chapter=this.room.boss.chapter,max=this.bossMax(),art=chapterArt(chapter),sway=Math.sin(this.time*1.65)*8,breath=1+Math.sin(this.time*2.1)*.025;c.save();c.translate(W/2+sway,143);c.scale(breath,1/breath);c.lineJoin='round';c.lineCap='round';
    c.strokeStyle=art.ink;c.lineWidth=3;c.globalAlpha=.52;for(let x=-62;x<=62;x+=31){c.beginPath();c.moveTo(x,-118);c.quadraticCurveTo(x+Math.sin(this.time+x)*7,-60,x*.82,-18);c.stroke();}c.globalAlpha=1;
    const halo=c.createRadialGradient(0,0,24,0,0,105);halo.addColorStop(0,'rgba(255,224,151,.3)');halo.addColorStop(1,'rgba(255,224,151,0)');c.fillStyle=halo;c.beginPath();c.arc(0,0,105,0,Math.PI*2);c.fill();
    if(chapter===1){
      c.fillStyle=art.platform;c.strokeStyle=art.ink;c.lineWidth=5;c.beginPath();c.arc(-46,-38,28,0,Math.PI*2);c.arc(46,-38,28,0,Math.PI*2);c.fill();c.stroke();c.beginPath();c.ellipse(0,12,69,78,0,0,Math.PI*2);c.fill();c.stroke();c.fillStyle=art.paper;c.beginPath();c.ellipse(0,-6,48,54,0,0,Math.PI*2);c.fill();c.stroke();c.fillStyle=art.accent;c.beginPath();c.arc(0,-58,17,0,Math.PI*2);c.fill();c.stroke();c.strokeStyle=art.paper;c.lineWidth=5;c.beginPath();c.arc(0,-58,8,0,Math.PI*2);c.stroke();
    }else if(chapter===2){
      c.fillStyle=shade(art.curtain,.12);c.strokeStyle=art.ink;c.lineWidth=5;c.beginPath();c.moveTo(-72,75);c.lineTo(-45,-5);c.lineTo(0,-34);c.lineTo(45,-5);c.lineTo(72,75);c.closePath();c.fill();c.stroke();c.fillStyle=art.paper;c.beginPath();c.arc(0,-21,47,0,Math.PI*2);c.fill();c.stroke();c.fillStyle=art.curtain;c.fillRect(-48,-77,96,30);c.strokeRect(-48,-77,96,30);c.fillStyle=art.accent;c.fillRect(-58,-51,116,13);c.strokeRect(-58,-51,116,13);c.strokeStyle=art.ink;c.lineWidth=6;c.beginPath();c.moveTo(-30,13);c.quadraticCurveTo(-12,27,0,13);c.quadraticCurveTo(12,27,30,13);c.stroke();
    }else if(chapter===3){
      c.globalAlpha=.46;c.fillStyle=art.secondary;c.strokeStyle=art.glow;c.lineWidth=4;c.beginPath();c.ellipse(18,0,59,76,.12,0,Math.PI*2);c.fill();c.stroke();c.globalAlpha=1;c.fillStyle=art.paper;c.strokeStyle=art.ink;c.lineWidth=5;c.beginPath();c.ellipse(-10,-2,57,74,-.1,0,Math.PI*2);c.fill();c.stroke();c.strokeStyle=art.glow;c.lineWidth=3;c.beginPath();c.moveTo(-22,-58);c.lineTo(16,58);c.moveTo(20,-48);c.lineTo(-35,25);c.stroke();
    }else{
      c.fillStyle=shade(art.platformDark,-.05);c.strokeStyle=art.ink;c.lineWidth=5;c.beginPath();c.moveTo(-78,72);c.lineTo(-65,-31);c.lineTo(-31,-73);c.lineTo(0,-48);c.lineTo(31,-73);c.lineTo(65,-31);c.lineTo(78,72);c.closePath();c.fill();c.stroke();c.fillStyle=art.paper;c.beginPath();c.arc(0,-6,50,0,Math.PI*2);c.fill();c.stroke();c.fillStyle=art.accent;for(let i=0;i<10;i++){c.save();c.rotate(i*Math.PI/5);c.fillRect(52,-6,20,12);c.restore();}c.beginPath();c.arc(0,-6,63,0,Math.PI*2);c.stroke();
    }
    c.fillStyle=art.ink;const eyeY=chapter===2?-27:-14;c.beginPath();c.ellipse(-17,eyeY,5,7,0,0,Math.PI*2);c.ellipse(17,eyeY,5,7,0,0,Math.PI*2);c.fill();c.strokeStyle=art.hazard;c.lineWidth=5;c.beginPath();c.arc(0,eyeY+17,28,.15,Math.PI-.15);c.stroke();c.fillStyle=art.hazard;c.beginPath();c.arc(0,eyeY+18,4,0,Math.PI*2);c.fill();
    if(chapter!==3){c.strokeStyle=art.paper;c.lineWidth=9;c.beginPath();c.moveTo(-58,25);c.quadraticCurveTo(-97,58,-83,93);c.moveTo(58,25);c.quadraticCurveTo(97,58,83,93);c.stroke();c.fillStyle=art.ink;c.beginPath();c.arc(-82,94,7,0,Math.PI*2);c.arc(82,94,7,0,Math.PI*2);c.fill();}
    c.restore();
    c.save();c.fillStyle=shade(art.paper,-.03);c.strokeStyle=art.ink;c.lineWidth=3;const total=max*49;for(let i=0;i<max;i++){const x=W/2-total/2+i*49,y=226;c.shadowColor='rgba(15,8,18,.25)';c.shadowOffsetY=4;c.shadowBlur=5;this.roundRect(c,x,y,38,15,4);c.fill();c.shadowColor='transparent';c.stroke();if(i<phase){c.fillStyle=art.secondary;this.roundRect(c,x+4,y+4,30,7,2);c.fill();c.fillStyle=shade(art.paper,-.03);}else{c.fillStyle=art.hazard;c.beginPath();c.arc(x+19,y+7.5,3,0,Math.PI*2);c.fill();c.fillStyle=shade(art.paper,-.03);}}c.restore();
    for(const shot of this.bossShots){c.save();c.translate(shot.x,shot.y);if(shot.warning>0){c.globalAlpha=.3+.22*Math.sin(this.time*18);c.strokeStyle=shot.color;c.lineWidth=3;c.setLineDash([5,5]);c.beginPath();c.arc(0,0,shot.r+10,0,Math.PI*2);c.stroke();c.setLineDash([]);}else{c.rotate(this.time*4+shot.x*.01);c.shadowColor=shot.color;c.shadowBlur=9;c.fillStyle=shot.color;c.strokeStyle=art.ink;c.lineWidth=3;c.beginPath();for(let i=0;i<8;i++){const r=i%2?shot.r*.62:shot.r,ang=i*Math.PI/4;c.lineTo(Math.cos(ang)*r,Math.sin(ang)*r);}c.closePath();c.fill();c.stroke();c.fillStyle=art.paper;c.beginPath();c.arc(0,0,shot.r*.22,0,Math.PI*2);c.fill();}c.restore();}
    if(chapter===3&&this.history.length>220&&phase<max){const ghost=this.history[this.history.length-220];c.save();c.globalAlpha=.42;c.translate(ghost.x+PW/2,ghost.y+PH/2);c.fillStyle=art.secondary;c.strokeStyle=art.glow;c.lineWidth=2;c.setLineDash([5,4]);this.roundRect(c,-18,-27,36,54,9);c.fill();c.stroke();c.setLineDash([]);c.restore();}
  }

  private drawEpilogueChoice(c:CanvasRenderingContext2D):void{c.save();c.fillStyle='#302632';c.font='900 22px "PingFang SC",sans-serif';c.textAlign='center';c.fillText('带着全部记忆醒来',120,560);c.fillText('关闭循环离开',1120,560);c.font='700 13px monospace';c.fillText('← 完整档案的隐藏选择',120,588);c.fillText('普通选择 →',1120,588);c.restore();}
  private drawDebug(c:CanvasRenderingContext2D):void{c.save();c.lineWidth=1;c.strokeStyle='#00ff9d';c.strokeRect(this.player.x,this.player.y,PW,PH);c.strokeStyle='#ff174f';for(const s of this.spikes)if(s.active){const h=this.spikeHitbox(s);c.strokeRect(h.x,h.y,h.w,h.h);}c.strokeStyle='#ffe600';for(const t of this.room.traps)c.strokeRect(t.trigger.x,t.trigger.y,t.trigger.w,t.trigger.h);const px=950+this.cameraX,py=620+this.cameraY;c.fillStyle='rgba(0,0,0,.72)';c.fillRect(px,py,320,88);c.fillStyle='#fff';c.font='12px monospace';c.fillText(`DEBUG room=${this.save.room} ${this.room.id}`,px+15,py+24);c.fillText(`pos=${this.player.x.toFixed(1)},${this.player.y.toFixed(1)} cam=${this.cameraX.toFixed(0)}`,px+15,py+44);c.fillText('[ / ] 切换房间',px+15,py+64);c.restore();}
  private drawExit(c:CanvasRenderingContext2D,r:Rect):void{
    const art=chapterArt(this.room.chapter),pulse=.5+.5*Math.sin(this.time*3);c.save();c.shadowColor='rgba(16,8,18,.48)';c.shadowBlur=12;c.shadowOffsetY=8;c.fillStyle=shade(art.platformDark,-.12);this.roundRect(c,r.x-11,r.y-16,r.w+22,r.h+16,7);c.fill();c.shadowColor='transparent';c.strokeStyle=art.ink;c.lineWidth=4;c.stroke();c.fillStyle=shade(art.curtain,.12);this.roundRect(c,r.x,r.y,r.w,r.h,4);c.fill();c.stroke();c.globalAlpha=.2+.12*pulse;c.fillStyle=art.glow;this.roundRect(c,r.x+6,r.y+7,r.w-12,r.h-13,2);c.fill();c.globalAlpha=1;c.fillStyle=art.accent;this.roundRect(c,r.x-5,r.y-16,r.w+10,19,4);c.fill();c.stroke();c.fillStyle=art.ink;c.font='900 9px monospace';c.textAlign='center';c.fillText('BACKSTAGE',r.x+r.w/2,r.y-3);c.fillStyle=art.glow;c.beginPath();c.arc(r.x+r.w-9,r.y+r.h*.55,4,0,Math.PI*2);c.fill();c.stroke();c.restore();
  }

  private drawEcho(c:CanvasRenderingContext2D,e:{x:number;y:number;w:number;h:number;tilt:number}):void{
    const art=chapterArt(this.room.chapter);c.save();c.translate(e.x+e.w/2,e.y+e.h/2);c.rotate(e.tilt);c.shadowColor='rgba(15,8,18,.35)';c.shadowBlur=7;c.shadowOffsetY=5;c.fillStyle=shade(art.paperShadow,-.15);c.strokeStyle=art.ink;c.lineWidth=3;this.roundRect(c,-e.w/2-2,-e.h/2-3,e.w+4,e.h+6,8);c.fill();c.shadowColor='transparent';c.stroke();c.globalAlpha=.36;c.fillStyle=art.paper;this.roundRect(c,-e.w/2+4,-e.h/2+4,e.w-8,e.h-9,5);c.fill();c.globalAlpha=1;c.fillStyle=art.ink;c.beginPath();c.moveTo(-8,-10);c.lineTo(-3,-5);c.moveTo(-3,-10);c.lineTo(-8,-5);c.moveTo(3,-10);c.lineTo(8,-5);c.moveTo(8,-10);c.lineTo(3,-5);c.stroke();c.strokeStyle=art.hazard;c.lineWidth=2;c.beginPath();c.moveTo(-7,6);c.quadraticCurveTo(0,1,7,6);c.stroke();c.restore();
  }

  private drawGhost(c:CanvasRenderingContext2D,x:number,y:number):void{
    const art=chapterArt(this.room.chapter);c.save();c.globalAlpha=.22+.08*Math.sin(this.time*11);c.translate(x+PW/2,y+PH/2);c.fillStyle=art.glow;c.strokeStyle=art.paper;c.lineWidth=2;c.setLineDash([5,4]);this.roundRect(c,-17,-26,34,52,9);c.fill();c.stroke();c.setLineDash([]);c.fillStyle=art.ink;c.font='900 7px monospace';c.textAlign='center';c.fillText('BEST',0,3);c.restore();
  }

  private drawDirectorOverlay(c:CanvasRenderingContext2D):void{
    if(this.directorCommand.spotlight){
      const x=this.player.x-this.cameraX+PW/2,y=this.player.y-this.cameraY+PH/2,r=175+(this.save.settings.warningBoost?45:0);c.save();c.fillStyle='rgba(22,17,31,.78)';c.beginPath();c.rect(0,0,W,H);c.arc(x,y,r,0,Math.PI*2);c.fill('evenodd');c.strokeStyle='rgba(242,221,177,.16)';c.lineWidth=18;c.beginPath();c.arc(x,y,r+9,0,Math.PI*2);c.stroke();
      c.globalAlpha=.76;c.strokeStyle='#ff6b5e';c.lineWidth=2;for(const s of this.spikes)if(s.active){const box=this.spikeHitbox(s);c.strokeRect(box.x-this.cameraX,box.y-this.cameraY,box.w,box.h);}for(const l of this.lasers)c.strokeRect(l.x-this.cameraX,l.y-this.cameraY,l.w,l.h);c.restore();
    }
    if(this.beatFx>0){const art=chapterArt(this.room.chapter),strength=Math.min(1,this.beatFx*1.5);c.save();c.globalCompositeOperation='screen';c.globalAlpha=.14*strength;const flash=c.createRadialGradient(this.player.x-this.cameraX+PW/2,this.player.y+PH/2,10,this.player.x-this.cameraX+PW/2,this.player.y+PH/2,430);flash.addColorStop(0,art.glow);flash.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=flash;c.fillRect(0,0,W,H);c.globalCompositeOperation='source-over';c.globalAlpha=.55*strength;c.strokeStyle=art.accent;c.lineWidth=5;c.strokeRect(10+(1-strength)*55,10+(1-strength)*34,W-20-(1-strength)*110,H-20-(1-strength)*68);c.restore();}
    if(this.nearMissFx>0){const strength=Math.min(1,this.nearMissFx*2.3);c.save();c.globalAlpha=.65*strength;c.strokeStyle='#ffe08a';c.lineWidth=3;c.setLineDash([18,9]);c.strokeRect(18+(1-strength)*32,18+(1-strength)*20,W-36-(1-strength)*64,H-36-(1-strength)*40);c.setLineDash([]);c.fillStyle='#fff0b9';c.font='900 15px monospace';c.textAlign='center';c.fillText(`险过 · COMBO ${this.combo}`,W/2,118);c.restore();}
    if(this.room.pursuit&&this.pursuitActive){const distance=this.player.x-(this.pursuitX+(this.room.pursuit.width??94));if(distance<210){c.save();c.globalAlpha=Math.max(0,(210-distance)/420);const danger=c.createLinearGradient(0,0,W,0);danger.addColorStop(0,'#9f2f4d');danger.addColorStop(.45,'rgba(159,47,77,.08)');danger.addColorStop(1,'rgba(159,47,77,0)');c.fillStyle=danger;c.fillRect(0,0,W,H);c.restore();}}
    if(this.heat>55&&!this.save.settings.reducedMotion){c.save();c.globalAlpha=(this.heat-55)/170;c.strokeStyle='#f1cf74';c.lineWidth=3;for(let i=0;i<8;i++){const y=105+i*67,x=(this.time*260+i*173)%W;c.beginPath();c.moveTo(x,y);c.lineTo(Math.min(W,x+90+this.heat),y-7);c.stroke();}c.restore();}
  }

  private drawPlayer(c:CanvasRenderingContext2D):void{
    const art=chapterArt(this.room.chapter),x=this.player.x+PW/2,y=this.player.y+PH/2,speed=Math.min(1,Math.abs(this.player.vx)/330),run=Math.sin(this.time*(10+speed*8)),air=!this.player.grounded,fall=this.player.vy>160,blink=Math.sin(this.time*.83+this.save.room*.71)>.965,lean=this.player.vx/1900,bob=this.player.grounded?Math.sin(this.time*(9+speed*7))*speed*1.5:0,scarf=[art.platformLight,art.accent,art.secondary,art.hazard][this.room.chapter-1]??art.accent;c.save();
    c.globalAlpha=.34;c.fillStyle=art.ink;c.beginPath();c.ellipse(x,y+24,18+speed*7,5,0,0,Math.PI*2);c.fill();c.globalAlpha=1;c.translate(x,y+bob);c.rotate(lean);c.scale(this.player.scaleX,this.player.scaleY);c.lineCap='round';c.lineJoin='round';
    const legSwing=air?(fall?2:-4):run*7*speed;c.strokeStyle=shade(art.paper,-.03);c.lineWidth=8;c.beginPath();c.moveTo(-7,11);c.quadraticCurveTo(-8-legSwing*.35,19,-8-legSwing,27);c.moveTo(7,11);c.quadraticCurveTo(8+legSwing*.35,19,8+legSwing,27);c.stroke();c.strokeStyle=art.ink;c.lineWidth=3;c.beginPath();c.moveTo(-13-legSwing,27);c.lineTo(-5-legSwing,27);c.moveTo(5+legSwing,27);c.lineTo(13+legSwing,27);c.stroke();
    const armSwing=air?-5:run*8*speed;c.strokeStyle=shade(art.paper,-.02);c.lineWidth=7;c.beginPath();c.moveTo(-11,-3);c.quadraticCurveTo(-17,-1-armSwing*.4,-17-armSwing,9);c.moveTo(11,-3);c.quadraticCurveTo(17,-1+armSwing*.4,17+armSwing,9);c.stroke();
    if(!this.lowDetail){c.shadowColor='rgba(17,9,20,.4)';c.shadowBlur=8;c.shadowOffsetY=5;const body=c.createLinearGradient(-15,-14,15,17);body.addColorStop(0,shade(art.paper,.15));body.addColorStop(.55,art.paper);body.addColorStop(1,shade(art.paper,-.16));c.fillStyle=body;}else c.fillStyle=art.paper;c.strokeStyle=art.ink;c.lineWidth=3;this.roundRect(c,-14,-14,28,32,8);c.fill();c.stroke();c.shadowColor='transparent';
    c.fillStyle=shade(art.paper,-.09);this.roundRect(c,-9,9,18,6,3);c.fill();c.strokeStyle=art.paperShadow;c.lineWidth=1;c.beginPath();c.moveTo(-7,-8);c.quadraticCurveTo(0,-5,7,-8);c.stroke();
    c.strokeStyle=scarf;c.lineWidth=6;c.beginPath();c.moveTo(-11,-7);c.quadraticCurveTo(0,-4,12,-7);c.stroke();c.beginPath();c.moveTo(9,-6);c.quadraticCurveTo(18-this.player.facing*3,-1,20-this.player.facing*(8+speed*5),10+run*2);c.stroke();c.strokeStyle=shade(scarf,-.22);c.lineWidth=2;c.beginPath();c.moveTo(10,-4);c.quadraticCurveTo(17,0,18-this.player.facing*8,9);c.stroke();
    if(!this.lowDetail){c.shadowColor='rgba(17,9,20,.3)';c.shadowBlur=5;c.shadowOffsetY=3;const head=c.createRadialGradient(-6,-29,3,0,-23,20);head.addColorStop(0,shade(art.paper,.28));head.addColorStop(.62,art.paper);head.addColorStop(1,shade(art.paper,-.13));c.fillStyle=head;}else c.fillStyle=shade(art.paper,.05);c.strokeStyle=art.ink;c.lineWidth=3;c.beginPath();c.arc(0,-24,17,0,Math.PI*2);c.fill();c.stroke();c.shadowColor='transparent';
    c.fillStyle=art.ink;if(blink){c.strokeStyle=art.ink;c.lineWidth=2;c.beginPath();c.moveTo(-8,-26);c.lineTo(-3,-26);c.moveTo(3,-26);c.lineTo(8,-26);c.stroke();}else{const look=this.player.facing*1.4;c.beginPath();c.ellipse(-6+look,-27,2.4,3,0,0,Math.PI*2);c.ellipse(6+look,-27,2.4,3,0,0,Math.PI*2);c.fill();c.fillStyle=shade(art.paper,.35);c.beginPath();c.arc(-6+look-.6,-28,.7,0,Math.PI*2);c.arc(6+look-.6,-28,.7,0,Math.PI*2);c.fill();}
    c.strokeStyle=fall?art.hazard:shade(scarf,-.12);c.lineWidth=2.6;c.beginPath();if(fall)c.ellipse(0,-17,3.6,5,0,0,Math.PI*2);else c.arc(0,-19,6,.32,Math.PI-.32);c.stroke();c.fillStyle='rgba(210,91,102,.22)';c.beginPath();c.arc(-11,-19,3,0,Math.PI*2);c.arc(11,-19,3,0,Math.PI*2);c.fill();
    c.restore();
  }

  private playerRect(inset=0):Rect{return{x:this.player.x+inset,y:this.player.y+inset,w:PW-inset*2,h:PH-inset*2}}
  private worldWidth():number{return(this.room as RoomDef&{worldWidth?:number})?.worldWidth??W;}
  private allCheckpoints():Rect[]{return this.room?.checkpoints?.length?this.room.checkpoints:(this.room?.checkpoint?[this.room.checkpoint]:[]);}
  private horizontalOverlap(a:Rect,b:Rect,inset=0):boolean{return a.x+a.w-inset>b.x&&a.x+inset<b.x+b.w;}
  private spikeHitbox(s:SpikeRun):Rect{if(s.direction==='up')return{x:s.x+6,y:s.y+8,w:s.w-12,h:s.h-8};if(s.direction==='down')return{x:s.x+6,y:s.y,w:s.w-12,h:s.h-8};if(s.direction==='left')return{x:s.x,y:s.y+6,w:s.w-8,h:s.h-12};return{x:s.x+8,y:s.y+6,w:s.w-8,h:s.h-12};}
  private hit(a:Rect,b:Rect):boolean{return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
  private approach(v:number,target:number,amount:number):number{return v<target?Math.min(v+amount,target):Math.max(v-amount,target)}
  private addTrauma(amount:number):void{this.trauma=Math.max(0,Math.min(1,this.trauma+amount));}
  private effectCount(base:number):number{return Math.max(0,Math.round(base*this.save.settings.particles*(this.lowDetail?.72:1)));}
  private spawnLanding():void{for(let i=0;i<Math.round(5*this.save.settings.particles);i++)this.particles.push({x:this.player.x+PW/2,y:this.player.y+PH,vx:(Math.random()-.5)*180,vy:-40-Math.random()*90,life:.18+Math.random()*.16,color:'#f7dfcb'});}
  private actionForCode(code:string):InputAction|undefined{
    const b=this.save.settings.bindings;if(code===b.left||code==='ArrowLeft')return'left';if(code===b.right||code==='ArrowRight')return'right';if(code===b.jump||code==='KeyZ'||code==='ArrowUp')return'jump';if(code===b.restart)return'restart';return undefined;
  }
  private emitHud(force=false):void{if(!force&&this.time<this.hudNext)return;this.hudNext=this.time+1/15;const contract=this.room.contract,seals=Object.values(this.save.bestRooms).filter(record=>record.contract).length+(this.contractCleared&&!this.save.bestRooms[this.room.id]?.contract?1:0),nextLock=this.buttons.find(button=>button.id.includes('-lock-')&&!button.pressed),remaining=this.buttons.filter(button=>button.id.includes('-lock-')&&!button.pressed).length;this.callbacks.onHud({room:this.save.room+1,deaths:this.save.deaths,shards:this.save.shards.length,elapsed:this.time,progress:Math.max(0,Math.min(1,(this.player.x+PW)/this.worldWidth())),jumps:Math.max(0,2-this.player.jumps),heat:Math.round(this.heat),echoes:this.echoes.length,mode:this.save.mode,director:this.directorCommand,beats:{current:this.beatIndex,total:this.room.beats?.length??0,gold:this.beatGold},combo:{value:this.combo,tier:comboTier(this.combo),nearMiss:this.nearMissFx>0},lock:{remaining,next:nextLock?requirementLabel(nextLock.requires):'已解除'},contract:{label:contract?.label??'无悬赏',description:contract?.description??'',state:!contract?'none':this.contractCleared?'cleared':this.contractFailed?'failed':'active',seals},boss:{active:!!this.room.boss&&this.bossPhase<this.bossMax(),phase:this.bossPhase+1,max:this.bossMax(),waves:this.bossStageWaves,required:this.bossWaveRequirement()}});}
  private persist():void{this.save.elapsed=this.time;this.callbacks.onSave(this.getSave());}
  private touchCapable():boolean{return navigator.maxTouchPoints>0||window.matchMedia('(pointer:coarse)').matches;}
  private resize():void{const parent=this.canvas.parentElement;if(!parent)return;const ratio=Math.min(parent.clientWidth/W,parent.clientHeight/H),compact=compactTouchViewport(parent.clientWidth,parent.clientHeight,this.touchCapable()),quality=preferredRenderScale(parent.clientWidth,parent.clientHeight,W,H,compact);if(Math.abs(quality-this.dpr)>.01){this.dpr=quality;this.canvas.width=Math.round(W*this.dpr);this.canvas.height=Math.round(H*this.dpr);this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);this.stageCacheKey='';this.sceneryCacheKey='';this.foregroundCacheKey='';}this.canvas.style.width=`${W*ratio}px`;this.canvas.style.height=`${H*ratio}px`;}
  private roundRect(c:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number):void{c.beginPath();c.roundRect(x,y,w,h,Math.max(0,Math.min(r,w/2,h/2)));}
  private darken(hex:string,amount:number):string{const value=parseInt(hex.slice(1),16),r=Math.max(0,((value>>16)&255)*(1-amount)),g=Math.max(0,((value>>8)&255)*(1-amount)),b=Math.max(0,(value&255)*(1-amount));return`rgb(${r},${g},${b})`;}
}
