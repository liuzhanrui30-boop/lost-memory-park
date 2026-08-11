import './style.css';
import { IWannaGame } from './v2/IWannaGame';
import { rooms, validateRooms } from './v2/rooms';
import type { EndingId, OptionalCollectible, V2Save } from './v2/types';
import { defaultSettings, newV2Save } from './v2/types';
import { formatTime } from './types';
import { directionForPointer,touchControlsEnabled,type TouchMode } from './v12/touch-ui';

const $=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const remasterKey='lost-memory-park-remaster-slots-v1',directorKey='lost-memory-park-directors-slots-v1',superKey='lost-memory-park-super-slots-v1',oldKey='lost-memory-park-v2';
const roomErrors=validateRooms();if(roomErrors.length){console.error('关卡数据校验失败',roomErrors);throw new Error(roomErrors.join('\n'));}
const title=$('title-screen'),hud=$('hud'),pause=$('pause-screen'),settings=$('settings-screen'),ending=$('ending-screen');
const slotsScreen=$('slots-screen'),chaptersScreen=$('chapters-screen'),archiveScreen=$('archive-screen'),moreScreen=$('more-screen'),memoryFlash=$('memory-flash');
const continueButton=$('continue-game') as HTMLButtonElement;
let inTitle=true,settingsReturn:'title'|'pause'='title',currentSlot=0,flashOpen=false,memoryTimer=0,beatFlashTimer=0,toastTimer=0,roomCardTimer=0;
const coarsePointer=window.matchMedia('(pointer:coarse)');
const touchCapable=():boolean=>navigator.maxTouchPoints>0||coarsePointer.matches;

const memories:Record<string,{title:string;text:string}>={
  'memory-01':{title:'01 · 第一次开园',text:'你站在剪彩台上说：如果记忆会伤人，就把它做成游戏。'},
  'memory-02':{title:'02 · 礼貌协议',text:'实验对象被要求微笑。你发现服从比镇静剂更便宜。'},
  'memory-03':{title:'03 · 失败记录',text:'第一位玩家死了四百次，仍然相信终点后会有人道歉。'},
  'memory-04':{title:'04 · 演员名单',text:'所有演员都来自同一份脑扫描，包括笑脸园长。'},
  'memory-05':{title:'05 · 掌声测试',text:'观众席从未坐过真人。掌声是机器给你的奖励信号。'},
  'memory-06':{title:'06 · 临时舞台',text:'你曾试图关闭项目，但系统把你的权限解释成新的关卡。'},
  'memory-07':{title:'07 · 镜中旧版',text:'镜子保存了你删除前的性格：会犹豫，也会反对。'},
  'memory-08':{title:'08 · 第二个你',text:'园长不是敌人。他是你为了继续实验而留下的执行人格。'},
  'memory-09':{title:'09 · 现实来信',text:'有人在外面等你醒来。她从没要求你忘掉痛苦。'},
  'memory-10':{title:'10 · 焚化许可',text:'销毁记忆的许可书上，是你自己的签字。'},
  'memory-11':{title:'11 · 最后一次启动',text:'你主动躺进机器，因为你无法面对实验造成的伤害。'},
  'memory-12':{title:'12 · 真正的出口',text:'关闭循环不会让过去消失，只会让你重新拥有选择。'},
};
const achievementNames:Record<string,string>={
  'first-death':'第一次谢幕','first-memory':'找回一段核心记忆','all-memories':'完整的十二段记忆','first-note':'捡到员工记录','all-notes':'档案管理员','clean-room':'无死亡通过房间','first-s':'首次获得 S 评级','boss-1':'拆掉迎宾程序','boss-2':'拒绝掌声','boss-3':'甩开倒影','boss-4':'园长下班','ending-escape':'解锁逃离结局','ending-takeover':'解锁接管结局','ending-destroy':'解锁真结局','ending-accept':'解锁隐藏结局',
  'echo-bridge':'让过去成为踏板','first-contract':'第一枚导演封印','twelve-contracts':'十二枚导演封印','all-contracts':'全悬赏制霸','chapter-1':'第一章谢幕','chapter-2':'第二章谢幕','chapter-3':'第三章谢幕','chapter-4':'第四章谢幕','all-endings':'四种回答','no-assist-clear':'不靠辅助完成','speedrun-clear':'计时挑战完成','bossrush-clear':'Boss Rush 完成','mirror-clear':'镜像模式完成','director-clear':'导演失控完成',
};

function normalize(value:Partial<V2Save>|undefined,slot:number):V2Save{
  const base=newV2Save(),v=value??{},legacySettings=(v.settings??{}) as Partial<V2Save['settings']>&{skipBossStage?:boolean;bonusRewind?:boolean;extraDash?:boolean;bindings?:Record<string,string>},touchMode=legacySettings.touchMode??(legacySettings.touch===true?'on':'auto'),settings={...defaultSettings(),...legacySettings,touchMode,bindings:{...defaultSettings().bindings,...(legacySettings.bindings??{})}} as V2Save['settings'];
  delete (settings as unknown as Record<string,unknown>).skipBossStage;delete (settings as unknown as Record<string,unknown>).bonusRewind;delete (settings as unknown as Record<string,unknown>).extraDash;delete (settings.bindings as Record<string,string>).rewind;delete (settings.bindings as Record<string,string>).anchor;delete (settings.bindings as Record<string,string>).dash;
  return{...base,...v,version:5,slot,settings,notes:[...(v.notes??[])],achievements:[...(v.achievements??[])],endings:[...(v.endings??[])],bestRooms:{...(v.bestRooms??{})},roomDeaths:{...(v.roomDeaths??{})},bossStages:{...(v.bossStages??{})},modeBests:{...(v.modeBests??{})},ghostRooms:{...(v.ghostRooms??{})},directorCommandHistory:{...(v.directorCommandHistory??{})},exploredRooms:{...(v.exploredRooms??{})}};
}
function loadSlots():V2Save[]{
  try{const remaster=localStorage.getItem(remasterKey);if(remaster){const parsed=JSON.parse(remaster) as V2Save[];return [0,1,2].map(i=>normalize(parsed[i],i));}
    const raw=localStorage.getItem(directorKey);if(raw){const parsed=JSON.parse(raw) as V2Save[];return [0,1,2].map(i=>normalize(parsed[i],i));}
    const legacySuper=localStorage.getItem(superKey);if(legacySuper){const parsed=JSON.parse(legacySuper) as V2Save[];return [0,1,2].map(i=>normalize(parsed[i],i));}
    const old=localStorage.getItem(oldKey);if(old){const migrated=normalize(JSON.parse(old),0);migrated.unlockedRoom=Math.max(migrated.unlockedRoom,migrated.room);return[migrated,normalize(undefined,1),normalize(undefined,2)];}
  }catch{}return[0,1,2].map(i=>normalize(undefined,i));
}
let saves=loadSlots(),current=saves[currentSlot];
function writeSlots():void{localStorage.setItem(remasterKey,JSON.stringify(saves));}
function store(save:V2Save):void{current=normalize(save,currentSlot);saves[currentSlot]=current;writeSlots();refreshContinue();}
function refreshContinue():void{continueButton.disabled=!current.started;continueButton.textContent=current.started?`继续 · ${rooms[current.room]?.name??'未知房间'}`:'暂无存档';}
function stageBill(value:string):string{const labels:Record<string,string>={launcher:'大炮',crumble:'崩塌台',sticky:'黏性糖浆',crusher:'压榨机',toggle:'双色舞台',hidden:'伏击尖刺',switch:'机关开关',orbit:'轨道台',moving:'移动台',wind:'风幕',fake:'道具假台',bounce:'弹床',spotlight:'静止聚光灯',laser:'红线',phase:'相位台',ice:'冰面',conveyor:'输送带',applause:'掌声灯阵',curtain:'活幕布',追逐幕墙:'追逐幕墙',哨兵:'导演哨兵'};return value.split('→').map(act=>act.split('+').map(id=>labels[id]??id).join(' × ')).join(' → ');}
function setText(id:string,value:string):void{const el=$(id);if(el.textContent!==value)el.textContent=value;}
function setWidth(id:string,value:string):void{const el=$(id);if(el.style.width!==value)el.style.width=value;}
function toast(text:string):void{const el=$('toast');window.clearTimeout(toastTimer);el.textContent=text;el.classList.remove('hidden');el.style.animation='none';void el.offsetHeight;el.style.animation='';toastTimer=window.setTimeout(()=>el.classList.add('hidden'),1800);}
function deathFeedback():void{const root=$('game-root');if(current.settings.shake>0&&!current.settings.reducedMotion){root.style.setProperty('--shake-distance',`${Math.max(1,Math.round(current.settings.shake*3))}px`);root.classList.remove('shake');void root.offsetHeight;root.classList.add('shake');}if(current.settings.gamepad&&current.settings.haptics){const pad=navigator.getGamepads?.()[0] as (Gamepad&{vibrationActuator?:{playEffect:(type:string,options:unknown)=>Promise<unknown>}})|null;pad?.vibrationActuator?.playEffect('dual-rumble',{duration:120,strongMagnitude:.35,weakMagnitude:.6}).catch(()=>{});}}

const game=new IWannaGame($('game-root'),{
  onHud:data=>{
    setText('room-number',`${String(data.room).padStart(2,'0')} / ${rooms.length}`);setWidth('map-progress',`${Math.round(data.progress*100)}%`);
    const stamps=data.beats.total?'★'.repeat(data.beats.gold)+'●'.repeat(Math.max(0,data.beats.current-data.beats.gold))+'○'.repeat(Math.max(0,data.beats.total-data.beats.current)):'—';setText('beat-stamps',stamps);const stampTitle=`${data.beats.current}/${data.beats.total} 幕完成 · ${data.beats.gold} 枚金票`;if($('beat-stamps').title!==stampTitle)$('beat-stamps').title=stampTitle;
    setText('jumps','●'.repeat(data.jumps)+'○'.repeat(2-data.jumps));setText('echoes',`${data.echoes} / ${data.director.echoLimit}`);setText('shards',`${data.shards} / 12`);setText('deaths',String(data.deaths));setText('timer',formatTime(data.elapsed));setText('heat-value',String(data.heat));setWidth('heat-bar',`${data.heat}%`);
    const contractChip=$('contract-chip');if(contractChip.dataset.state!==data.contract.state)contractChip.dataset.state=data.contract.state;if(contractChip.title!==data.contract.description)contractChip.title=data.contract.description;setText('contract-state',data.contract.state==='cleared'?`✓ ${data.contract.label}`:data.contract.state==='failed'?`× ${data.contract.label}`:data.contract.label);setText('contract-seals',`${data.contract.seals} / 24`);
    const comboChip=$('combo-chip');if(comboChip.dataset.tier!==String(data.combo.tier))comboChip.dataset.tier=String(data.combo.tier);comboChip.classList.toggle('near',data.combo.nearMiss);setText('combo-value',`×${data.combo.value}`);
    setText('director-command',data.boss.active?`Boss ${data.boss.phase}/${data.boss.max} · 攻势 ${Math.min(data.boss.waves,data.boss.required)}/${data.boss.required}`:data.lock.remaining?`${data.lock.next}锁 · ${data.director.label}`:`导演：${data.director.label}`);if(hud.dataset.mode!==data.mode)hud.dataset.mode=data.mode;hud.classList.toggle('hidden',current.settings.hudMode==='hidden');hud.classList.toggle('heat-off',!current.settings.heatHud);
  },
  onRoom:room=>{const card=$('room-card');window.clearTimeout(roomCardTimer);$('chapter-label').textContent=room.kind==='boss'?'章节终局 · 完整阶段战':room.kind==='prologue'?'序章 · 清晰路线试演':room.kind==='epilogue'?'终章':`第 ${room.chapter} 章 · ${room.attackTheme??'高压障碍课题'}`;$('room-title').textContent=room.name;const bill=room.remixKind?stageBill(room.remixKind):'';$('room-hint').textContent=room.kind==='boss'?`${room.hint}｜每阶段先躲过规定攻击波，机关才会解锁。`:room.attackTheme?`${room.hint}｜远程威胁：${room.attackTheme}`:room.hint;$('pause-objective').textContent=room.kind==='boss'?'Boss 阶段不能跳过：观察顶部攻势计数，躲满两至三波攻击，再按顺序触发当前阶段机关。':room.attackTheme?`本章只围绕「${room.attackTheme}」展开。看清炮台标签与预警线，再处理动作锁。${bill?`本关机关：${bill}。`:''}`:'目标：沿唯一清晰路线抵达后台门。';card.classList.remove('hidden');card.style.animation='none';void card.offsetHeight;card.style.animation='';roomCardTimer=window.setTimeout(()=>card.classList.add('hidden'),1900);},
  onDirector:command=>{const chip=$('director-command');chip.textContent=`导演：${command.label}`;chip.setAttribute('title',command.description);chip.style.setProperty('--director-color',command.color);const title=$('director-title');if(title)title.textContent=`导演指令 · ${command.label}`;const copy=$('director-copy');if(copy)copy.textContent=command.description;},
  onToast:toast,
  onDeath:reason=>{toast(reason);deathFeedback();if(current.settings.flash>0){const flash=$('death-flash');flash.style.setProperty('--flash-opacity',String(current.settings.flash*.72));flash.classList.remove('active');void flash.offsetHeight;flash.classList.add('active');}},
  onSave:store,
  onMemory:id=>current.mode==='speedrun'?toast(`计时收录：${memories[id]?.title??id}`):openMemory(id),
  onOptional:item=>toast(`档案已收录：${item.title}`),
  onAchievement:id=>toast(`成就：${achievementNames[id]??id}`),
  onRoomResult:r=>toast(`${r.rank} 评级 · ${formatTime(r.time)} · 热度 ${r.heat??0} · ${r.deaths} 死亡`),
  onContract:result=>toast(result.success?`悬赏完成：${result.label} · 封印 ${result.seals}/24`:`悬赏未完成：${result.label}`),
  onBeat:result=>{const flash=$('beat-flash');window.clearTimeout(beatFlashTimer);$('beat-flash-label').textContent=`第 ${result.index} 幕 · ${result.label}`;$('beat-flash-rank').textContent=result.gold?'GOLD TAKE · 连拍奖励':'TAKE CLEAR · 检查点记录';flash.classList.toggle('gold',result.gold);flash.classList.remove('hidden');flash.style.animation='none';void flash.offsetHeight;flash.style.animation='';beatFlashTimer=window.setTimeout(()=>flash.classList.add('hidden'),1250);},
  onModeComplete:(mode,save)=>showModeComplete(mode,save),
  onEnding:(kind,save)=>showEnding(kind,save),
});
game.setSave(current);refreshContinue();
if(new URLSearchParams(location.search).get('debug')==='1')Object.assign(window,{__lostMemoryParkDebug:{snapshot:()=>game.debugSnapshot(),startRoom:(index:number)=>game.startAtRoom(index),teleport:(x:number,y:number)=>game.debugTeleport(x,y),echo:(x:number,y:number)=>game.debugAddEcho(x,y),bossPhase:(phase:number)=>game.debugForceBossPhase(phase),bossWaves:(waves:number)=>game.debugSetBossWaves(waves),win:()=>game.debugWinCurrentRoom(),setCollections:(shards:number,notes:number)=>game.debugSetCollections(shards,notes),choose:(side:'left'|'right')=>game.debugChooseEnding(side),overlay:(visible:boolean)=>game.debugSetOverlay(visible),down:(action:'left'|'right'|'jump'|'drop'|'restart')=>game.actionDown(action),up:(action:'left'|'right'|'jump'|'drop')=>game.actionUp(action),save:()=>game.getSave()}});

type TouchAction='left'|'right'|'jump'|'drop';
const touchControls=$('touch-controls'),touchMove=touchControls.querySelector<HTMLElement>('.touch-move')!;
const touchPointerActions=new Map<number,TouchAction>(),touchActionCounts=new Map<TouchAction,number>();
function effectiveTouchMode():TouchMode{return current.settings.touchMode??(current.settings.touch?'on':'auto');}
function syncTouchPressed():void{touchControls.querySelectorAll<HTMLButtonElement>('button[data-action]').forEach(button=>button.classList.toggle('is-pressed',(touchActionCounts.get(button.dataset.action as TouchAction)??0)>0));}
function setPointerAction(pointerId:number,action:TouchAction):void{
  const previous=touchPointerActions.get(pointerId);if(previous===action)return;
  if(previous){const count=(touchActionCounts.get(previous)??1)-1;if(count<=0){touchActionCounts.delete(previous);game.actionUp(previous);}else touchActionCounts.set(previous,count);}
  const count=touchActionCounts.get(action)??0;touchActionCounts.set(action,count+1);touchPointerActions.set(pointerId,action);if(count===0)game.actionDown(action);syncTouchPressed();
}
function releasePointerAction(pointerId:number):void{const action=touchPointerActions.get(pointerId);if(!action)return;touchPointerActions.delete(pointerId);const count=(touchActionCounts.get(action)??1)-1;if(count<=0){touchActionCounts.delete(action);game.actionUp(action);}else touchActionCounts.set(action,count);syncTouchPressed();}
function releaseAllTouchActions():void{for(const action of touchActionCounts.keys())game.actionUp(action);touchPointerActions.clear();touchActionCounts.clear();syncTouchPressed();}
function updateTouchControls():void{
  const enabled=touchControlsEnabled(effectiveTouchMode(),touchCapable());
  const blocked=inTitle||game.isPaused()||flashOpen||!settings.classList.contains('hidden')||!ending.classList.contains('hidden');
  const active=enabled&&!blocked;
  document.documentElement.classList.toggle('touch-capable',touchCapable());document.documentElement.classList.toggle('touch-enabled',enabled);document.documentElement.classList.toggle('touch-active',active);
  touchControls.classList.toggle('hidden',!active);touchControls.setAttribute('aria-hidden',String(!active));
  if(!active)releaseAllTouchActions();
}
function updateInputEnvironment():void{document.documentElement.classList.toggle('touch-capable',touchCapable());updateTouchControls();}

async function enter(kind:'new'|'continue',room?:number):Promise<void>{await game.audio.unlock();inTitle=false;hide(title);hide(ending);hide(moreScreen);hud.classList.remove('hidden');if(kind==='new'){const fresh=normalize(undefined,currentSlot);fresh.started=true;fresh.settings={...current.settings,bindings:{...current.settings.bindings}};saves[currentSlot]=fresh;current=fresh;game.setSave(current);game.startNew();}else if(room!==undefined)game.startAtRoom(room);else game.continueGame();updateTouchControls();}
async function enterMode(mode:V2Save['mode']):Promise<void>{await game.audio.unlock();inTitle=false;hide(title);hide(ending);hide(moreScreen);hide($('modes-screen'));hud.classList.remove('hidden');game.startMode(mode);updateTouchControls();}
function backTitle():void{releaseAllTouchActions();game.returnToTitle();inTitle=true;hide(pause);hide(ending);hide(moreScreen);hud.classList.add('hidden');show(title);refreshContinue();updateTouchControls();}
function show(el:HTMLElement):void{el.classList.remove('hidden');el.classList.add('visible');requestAnimationFrame(()=>el.querySelector<HTMLButtonElement>('button:not([disabled])')?.focus({preventScroll:true}));}
function hide(el:HTMLElement):void{el.classList.add('hidden');el.classList.remove('visible')}
function togglePause():void{if(inTitle||flashOpen||!ending.classList.contains('hidden'))return;const value=!game.isPaused();if(value)releaseAllTouchActions();game.setPaused(value);value?show(pause):hide(pause);updateTouchControls();}

function openMemory(id:string):void{const data=memories[id];if(!data)return;releaseAllTouchActions();flashOpen=true;game.setPaused(true);$('memory-title').textContent=data.title;$('memory-text').textContent=data.text;memoryFlash.classList.remove('hidden');window.clearTimeout(memoryTimer);memoryTimer=window.setTimeout(closeMemory,Math.max(1800,3600/current.settings.dialogueSpeed));updateTouchControls();}
function closeMemory():void{if(!flashOpen)return;window.clearTimeout(memoryTimer);flashOpen=false;memoryFlash.classList.add('hidden');game.setPaused(false);updateTouchControls();}
memoryFlash.onclick=closeMemory;

function showEnding(kind:EndingId,save:V2Save):void{releaseAllTouchActions();hud.classList.add('hidden');show(ending);const copy={escape:['逃离结局','你离开了乐园，但园长仍在广播里练习你的声音。循环没有结束，只是换了一名玩家。'],takeover:['接管结局','你接受园长的胸牌，重新打开灯光。下一位玩家已经在入口醒来。'],destroy:['真结局','十二段核心记忆让你找到总电闸。机器关闭，你第一次完整地记住自己做过什么。'],accept:['隐藏结局 · 带着记忆生活','你没有删除痛苦，也没有继续扮演园长。你带着全部记录走向现实，让过去成为责任，而不是牢笼。']}[kind];$('ending-title').textContent=copy[0];$('ending-text').textContent=copy[1];$('ending-stats').innerHTML=`<div><b>${save.shards.length}/12</b>核心记忆</div><div><b>${save.notes.length}</b>可选档案</div><div><b>${formatTime(save.elapsed)}</b>总时间</div>`;updateTouchControls();}
function showModeComplete(mode:V2Save['mode'],save:V2Save):void{releaseAllTouchActions();hud.classList.add('hidden');show(ending);const labels:Record<V2Save['mode'],string>={story:'故事模式',speedrun:'计时挑战',bossrush:'Boss Rush',mirror:'镜像模式',director:'导演失控'};$('ending-title').textContent=`${labels[mode]}完成`;$('ending-text').textContent=mode==='bossrush'?'四位舞台主人已经连续谢幕。你证明自己记住了每一次读招。':mode==='director'?'你在同一套舞台里活过了五种被篡改的物理规则。现在，导演也不知道下一幕是什么。':'这一轮不改写故事结局，只记录你的执行。';$('ending-stats').innerHTML=`<div><b>${formatTime(save.elapsed)}</b>本轮时间</div><div><b>${save.deaths}</b>本轮死亡</div><div><b>${save.assisted?'辅助开启':'标准规则'}</b>规则</div>`;updateTouchControls();}

function renderSlots():void{$('slot-list').innerHTML=saves.map((s,i)=>`<div class="slot-row"><span><b>槽位 ${i+1}</b><br>${s.started?`${rooms[s.room]?.name??'未知'} · ${s.shards.length}/12 记忆`:'空白存档'}</span><button data-select="${i}">选择</button><button data-delete="${i}">删除</button></div>`).join('');$('slot-list').querySelectorAll<HTMLButtonElement>('[data-select]').forEach(b=>b.onclick=()=>{currentSlot=Number(b.dataset.select);current=saves[currentSlot];game.setSave(current);applySettingsUI();renderSlots();toast(`已选择槽位 ${currentSlot+1}`)});$('slot-list').querySelectorAll<HTMLButtonElement>('[data-delete]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.delete);if(confirm(`删除槽位 ${i+1}？此操作无法撤销。`)){saves[i]=normalize(undefined,i);if(i===currentSlot){current=saves[i];game.setSave(current)}writeSlots();renderSlots();refreshContinue();}});}
function renderChapters():void{const starts=[1,8,15,22],names=['糖果迎宾区','马戏舞台区','镜厅与失真区','园长城堡'];$('chapter-list').innerHTML=starts.map((start,i)=>`<button data-room="${start}" ${current.unlockedRoom<start?'disabled':''}>第 ${i+1} 章 · ${names[i]}${current.unlockedRoom<start?'（未到达）':''}</button>`).join('');$('chapter-list').querySelectorAll<HTMLButtonElement>('[data-room]').forEach(b=>b.onclick=()=>{hide(chaptersScreen);hide(moreScreen);enter('continue',Number(b.dataset.room))});}
function renderArchive():void{const notes=rooms.flatMap(r=>r.optional??[]),records=Object.entries(current.bestRooms).sort((a,b)=>a[0].localeCompare(b[0]));$('archive-list').innerHTML=[
  '<h3 class="archive-heading">核心记忆 · 12</h3>',...Object.entries(memories).map(([id,m])=>`<div class="archive-entry ${current.shards.includes(id)?'':'locked'}"><b>${current.shards.includes(id)?m.title:'核心记忆 · 未获得'}</b>${current.shards.includes(id)?m.text:'继续探索乐园。'}</div>`),
  `<h3 class="archive-heading">员工档案 · ${notes.length}</h3>`,...notes.map(n=>`<div class="archive-entry ${current.notes.includes(n.id)?'':'locked'}"><b>${current.notes.includes(n.id)?n.title:'可选档案 · 未获得'}</b>${current.notes.includes(n.id)?n.text:'隐藏在舞台角落。'}</div>`),
  `<h3 class="archive-heading">成就 · ${current.achievements.length}/${Object.keys(achievementNames).length}</h3>`,...Object.entries(achievementNames).map(([id,name])=>`<div class="archive-entry achievement ${current.achievements.includes(id)?'':'locked'}"><b>${current.achievements.includes(id)?'✓':'?'} ${name}</b>${current.achievements.includes(id)?'已记录在本存档。':'尚未完成。'}</div>`),
  '<h3 class="archive-heading">房间成绩与最佳残影</h3>',...(records.length?records.map(([id,r])=>`<div class="archive-entry"><b>${rooms.find(x=>x.id===id)?.name??id} · ${r.rank}</b>${formatTime(r.time)} · 热度 ${r.heat??0} · 最高连拍 ${r.bestCombo??0} · 最少 ${r.deaths} 死亡${r.contract?' · ✓ 导演封印':''}${current.ghostRooms[id]?.length?' · 已记录残影':''}${r.assisted?' · 辅助':''}</div>`):['<div class="archive-entry locked"><b>暂无成绩</b>通过房间后会记录评级与最佳路线残影。</div>'])
].join('');}

const bindingLabels:Record<string,string>={left:'向左',right:'向右',jump:'跳跃',drop:'下穿薄板',restart:'重开',pause:'暂停'};
function keyLabel(code:string):string{return code.replace('Arrow','方向').replace('Key','').replace('ShiftLeft','左 Shift').replace('ShiftRight','右 Shift').replace('Space','空格').replace('Escape','Esc');}
function renderBindings():void{const list=$('binding-list');list.innerHTML=(Object.keys(bindingLabels) as Array<keyof V2Save['settings']['bindings']>).map(action=>`<button data-bind="${action}">${bindingLabels[action]}：${keyLabel(current.settings.bindings[action])}</button>`).join('');list.querySelectorAll<HTMLButtonElement>('[data-bind]').forEach(button=>button.onclick=()=>{const action=button.dataset.bind as keyof V2Save['settings']['bindings'];button.textContent=`${bindingLabels[action]}：请按键`;button.classList.add('waiting');const handler=(event:KeyboardEvent)=>{event.preventDefault();event.stopPropagation();if(event.code==='Escape'){current.settings.bindings[action]=defaultSettings().bindings[action];}else current.settings.bindings[action]=event.code;saveSettings();renderBindings();};window.addEventListener('keydown',handler,{once:true,capture:true});});}
function applySettingsUI():void{
  const s=current.settings;const set=(id:string,value:string)=>{const el=$(id) as HTMLInputElement|HTMLSelectElement;if(el.type==='checkbox')(el as HTMLInputElement).checked=value==='true';else el.value=value;};
  set('master-volume',String(s.master));set('mute-toggle',String(s.muted));set('music-volume',String(s.music));set('sfx-volume',String(s.sfx));set('ambient-volume',String(s.ambient));set('shake-strength',String(s.shake));set('flash-strength',String(s.flash));set('particle-count',String(s.particles));set('dynamic-background',String(s.dynamicBackground));set('reduced-motion',String(s.reducedMotion));set('high-contrast',String(s.highContrast));set('color-friendly',String(s.colorFriendly));set('thick-outlines',String(s.thickOutlines));set('gamepad-toggle',String(s.gamepad));set('haptics-toggle',String(s.haptics));
  set('touch-mode',effectiveTouchMode());set('touch-scale',String(s.touchScale));set('touch-jump-scale',String(s.touchJumpScale));set('touch-opacity',String(s.touchOpacity));set('touch-inset',String(s.touchInset));set('touch-left-handed',String(s.touchLeftHanded));
  set('hud-mode',s.hudMode);set('text-scale',String(s.textScale));set('dialogue-speed',String(s.dialogueSpeed));set('assist-speed',String(s.gameSpeed));set('warning-boost',String(s.warningBoost));set('show-traps',String(s.showHiddenTraps));set('show-ghost',String(s.showGhost));set('heat-hud',String(s.heatHud));
  document.documentElement.style.fontSize=`${s.textScale*100}%`;document.documentElement.style.setProperty('--touch-opacity',String(s.touchOpacity));document.documentElement.style.setProperty('--touch-scale',String(s.touchScale));document.documentElement.style.setProperty('--touch-jump-scale',String(s.touchJumpScale));document.documentElement.style.setProperty('--touch-inset',`${s.touchInset}px`);touchControls.classList.toggle('left-handed',s.touchLeftHanded);hud.classList.toggle('hud-compact',s.hudMode==='compact');hud.classList.toggle('heat-off',!s.heatHud);renderBindings();updateTouchControls();
}
function saveSettings():void{
  const el=(id:string)=>$(id) as HTMLInputElement|HTMLSelectElement,touchMode=(el('touch-mode') as HTMLSelectElement).value as TouchMode;
  const s={...current.settings,master:Number((el('master-volume') as HTMLInputElement).value),muted:(el('mute-toggle') as HTMLInputElement).checked,music:Number((el('music-volume') as HTMLInputElement).value),sfx:Number((el('sfx-volume') as HTMLInputElement).value),ambient:Number((el('ambient-volume') as HTMLInputElement).value),shake:Number((el('shake-strength') as HTMLInputElement).value),flash:Number((el('flash-strength') as HTMLInputElement).value),particles:Number((el('particle-count') as HTMLInputElement).value),dynamicBackground:(el('dynamic-background') as HTMLInputElement).checked,reducedMotion:(el('reduced-motion') as HTMLInputElement).checked,highContrast:(el('high-contrast') as HTMLInputElement).checked,colorFriendly:(el('color-friendly') as HTMLInputElement).checked,thickOutlines:(el('thick-outlines') as HTMLInputElement).checked,gamepad:(el('gamepad-toggle') as HTMLInputElement).checked,haptics:(el('haptics-toggle') as HTMLInputElement).checked,touch:touchMode==='on',touchMode,touchScale:Number((el('touch-scale') as HTMLInputElement).value),touchJumpScale:Number((el('touch-jump-scale') as HTMLInputElement).value),touchOpacity:Number((el('touch-opacity') as HTMLInputElement).value),touchInset:Number((el('touch-inset') as HTMLInputElement).value),touchLeftHanded:(el('touch-left-handed') as HTMLInputElement).checked,hudMode:(el('hud-mode') as HTMLSelectElement).value as V2Save['settings']['hudMode'],textScale:Number((el('text-scale') as HTMLInputElement).value),dialogueSpeed:Number((el('dialogue-speed') as HTMLInputElement).value),gameSpeed:Number((el('assist-speed') as HTMLInputElement).value),warningBoost:(el('warning-boost') as HTMLInputElement).checked,showHiddenTraps:(el('show-traps') as HTMLInputElement).checked,showGhost:(el('show-ghost') as HTMLInputElement).checked,heatHud:(el('heat-hud') as HTMLInputElement).checked};
  current.settings=s;game.applySettings(s);applySettingsUI();
}

$('new-game').onclick=()=>enter('new');continueButton.onclick=()=>{if(current.started)enter('continue')};
$('open-more').onclick=()=>show(moreScreen);$('close-more').onclick=()=>hide(moreScreen);
$('open-slots').onclick=()=>{renderSlots();show(slotsScreen)};$('close-slots').onclick=()=>hide(slotsScreen);
$('open-chapters').onclick=()=>{renderChapters();show(chaptersScreen)};$('close-chapters').onclick=()=>hide(chaptersScreen);
$('start-speedrun').onclick=()=>enterMode('speedrun');
$('open-modes').onclick=()=>show($('modes-screen'));$('close-modes').onclick=()=>hide($('modes-screen'));
$('start-bossrush').onclick=()=>current.completed?enterMode('bossrush'):toast('先完成一次故事模式');$('start-mirror').onclick=()=>current.completed?enterMode('mirror'):toast('先完成一次故事模式');
$('start-director').onclick=()=>current.completed?enterMode('director'):toast('先完成一次故事模式');
$('open-archive').onclick=()=>{renderArchive();show(archiveScreen)};$('close-archive').onclick=()=>hide(archiveScreen);
$('open-credits').onclick=()=>show($('credits-screen'));$('close-credits').onclick=()=>hide($('credits-screen'));
$('open-settings').onclick=()=>{settingsReturn='title';applySettingsUI();show(settings);updateTouchControls()};$('pause-settings').onclick=()=>{settingsReturn='pause';releaseAllTouchActions();hide(pause);applySettingsUI();show(settings);updateTouchControls()};
$('close-settings').onclick=()=>{saveSettings();hide(settings);if(settingsReturn==='pause')show(pause);updateTouchControls()};$('reset-settings').onclick=()=>{current.settings=defaultSettings();applySettingsUI();game.applySettings(current.settings);updateInputEnvironment()};
$('resume-game').onclick=()=>{hide(pause);game.setPaused(false);updateTouchControls()};$('restart-room').onclick=()=>{hide(pause);game.setPaused(false);game.actionDown('restart');updateTouchControls()};$('back-title').onclick=backTitle;$('ending-title-button').onclick=backTitle;$('replay').onclick=()=>enter('new');
$('export-save').onclick=()=>{const blob=new Blob([JSON.stringify(saves,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='失忆乐园-存档.json';a.click();URL.revokeObjectURL(a.href)};
$('import-save').onclick=()=>($('import-file') as HTMLInputElement).click();($('import-file') as HTMLInputElement).onchange=async e=>{const file=(e.target as HTMLInputElement).files?.[0];if(!file)return;try{const parsed=JSON.parse(await file.text()) as V2Save[];saves=[0,1,2].map(i=>normalize(parsed[i],i));current=saves[currentSlot];game.setSave(current);writeSlots();renderSlots();toast('存档导入成功');}catch{alert('存档文件无效')}};

window.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','Backspace'].includes(e.code))e.preventDefault();if(flashOpen&&(e.code==='Space'||e.code==='Enter')){closeMemory();return;}if(e.code==='Escape'||e.code===current.settings.bindings.pause){togglePause();return;}if(!inTitle&&settings.classList.contains('hidden'))game.keyDown(e.code)},{passive:false});
window.addEventListener('keyup',e=>game.keyUp(e.code));window.addEventListener('blur',()=>{releaseAllTouchActions();game.audio.setSuspended(true);if(!inTitle&&!game.isPaused())togglePause()});window.addEventListener('focus',()=>{if(!inTitle&&pause.classList.contains('hidden')&&settings.classList.contains('hidden')&&ending.classList.contains('hidden'))game.audio.setSuspended(false);updateInputEnvironment()});document.addEventListener('visibilitychange',()=>{if(document.hidden){releaseAllTouchActions();game.audio.setSuspended(true);if(!inTitle&&!game.isPaused())togglePause()}});

let gpState={left:false,right:false,jump:false,drop:false,pause:false};function pollGamepad(){if(current.settings.gamepad&&!inTitle){const pad=navigator.getGamepads?.()[0];if(pad){const next={left:pad.axes[0]<-.25||pad.buttons[14]?.pressed,right:pad.axes[0]>.25||pad.buttons[15]?.pressed,jump:pad.buttons[0]?.pressed,drop:pad.axes[1]>.55||pad.buttons[13]?.pressed,pause:pad.buttons[9]?.pressed??false};for(const [key,action] of [['left','left'],['right','right'],['jump','jump'],['drop','drop']] as const){if(next[key]&&!gpState[key])game.actionDown(action);if(!next[key]&&gpState[key])game.actionUp(action);}if(next.pause&&!gpState.pause)togglePause();gpState=next;}}requestAnimationFrame(pollGamepad)}pollGamepad();

touchControls.querySelectorAll<HTMLButtonElement>('button[data-action]').forEach(button=>{
  const action=button.dataset.action as TouchAction|'pause';
  button.addEventListener('pointerdown',event=>{event.preventDefault();button.setPointerCapture(event.pointerId);if(action==='pause'){releaseAllTouchActions();togglePause();return;}setPointerAction(event.pointerId,action);if(current.settings.haptics&&navigator.vibrate)navigator.vibrate(action==='jump'?12:7);});
  button.addEventListener('pointermove',event=>{if(!touchPointerActions.has(event.pointerId)||!['left','right'].includes(action))return;event.preventDefault();const rect=touchMove.getBoundingClientRect();setPointerAction(event.pointerId,directionForPointer(event.clientX,rect.left,rect.width));});
  const release=(event:PointerEvent)=>{event.preventDefault();releasePointerAction(event.pointerId);};button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
});
touchControls.addEventListener('contextmenu',event=>event.preventDefault());
$('game-root').addEventListener('contextmenu',event=>{if(inTitle||game.isPaused()||!settings.classList.contains('hidden')||!ending.classList.contains('hidden'))return;event.preventDefault();if(!game.removeEchoAtScreen(event.clientX,event.clientY))toast('右键点在死亡残影上，可只删除这一具');});
const coarseEvents=coarsePointer as unknown as{addEventListener?:(type:string,listener:()=>void)=>void;addListener?:(listener:()=>void)=>void};if(coarseEvents.addEventListener)coarseEvents.addEventListener('change',updateInputEnvironment);else coarseEvents.addListener?.(updateInputEnvironment);window.addEventListener('resize',updateInputEnvironment,{passive:true});

document.querySelectorAll('#settings-screen input,#settings-screen select').forEach(el=>{el.addEventListener('input',()=>saveSettings());el.addEventListener('change',()=>saveSettings());});
applySettingsUI();updateInputEnvironment();
