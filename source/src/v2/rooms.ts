import type { BlockDef, RoomDef, SpikeDef } from './types';
import { directedCampaign } from '../v6/campaign';
import { crusherSafeWindow } from '../v6/stage-mechanics';
import { buttonHazardConflicts, spikeObstacleConflicts } from '../v15/level-safety';

const ground = (id: string, x: number, w: number, color = '#f2a7bd'): BlockDef => ({ id, x, y: 660, w, h: 60, color });
const block = (id: string, x: number, y: number, w: number, h = 28, color = '#f2a7bd'): BlockDef => ({ id, x, y, w, h, color });
const spikes = (prefix: string, x: number, y: number, count: number, direction: SpikeDef['direction'] = 'up', hidden = false): SpikeDef[] =>
  Array.from({ length: count }, (_, i) => ({ id: `${prefix}-${i}`, x: x + i * 34, y, w: 34, h: 34, direction, hidden }));

const legacyRooms: RoomDef[] = [
  {
    id:'sweet-entry',chapter:1,name:'01 · 第一次排练',hint:'死亡会留下可踩的残影；退格键可以全部清空。',background:['#604891','#d47aa7'],spawn:{x:76,y:610},exit:{x:1218,y:566,w:42,h:94},
    blocks:[ground('g0',0,390),ground('g1',520,760),block('p0',402,552,106),block('p1',765,515,130,28)],
    spikes:[...spikes('s0',390,626,4)],traps:[],checkpoint:{x:690,y:600,w:34,h:60},shard:{id:'memory-01',x:432,y:492,w:34,h:44},message:'园长说这里很安全。他还说自己从不说谎。'
  },
  {
    id:'polite-floor',chapter:1,name:'02 · 旧演员',hint:'倒在刺上的残影，有时正好是一块安全踏板。',background:['#715093','#e890a9'],spawn:{x:60,y:610},exit:{x:1218,y:566,w:42,h:94},
    blocks:[ground('g0',0,1280),block('p0',420,530,150),block('p1',790,470,140),block('p2',1030,555,95)],
    spikes:[...spikes('visible',245,626,2),...spikes('pop-a',530,626,3,'up',true),...spikes('pop-b',910,626,3,'up',true)],
    traps:[{id:'t0',trigger:{x:455,y:0,w:70,h:720},action:'reveal',targets:['pop-a-0','pop-a-1','pop-a-2']},{id:'t1',trigger:{x:835,y:0,w:65,h:720},action:'reveal',targets:['pop-b-0','pop-b-1','pop-b-2']}],
    shard:{id:'memory-02',x:842,y:410,w:34,h:44}
  },
  {
    id:'sugar-gap',chapter:1,name:'03 · 糖浆断层',hint:'移动平台不会等你，尖刺倒是很有耐心。',background:['#554182','#cf6f9f'],spawn:{x:55,y:610},exit:{x:1218,y:566,w:42,h:94},
    blocks:[ground('g0',0,240),ground('g1',1040,240),{...block('m0',290,545,130),kind:'moving',toY:405,speed:1.35},{...block('m1',530,420,130),kind:'moving',toX:700,speed:1.1},{...block('m2',820,535,130),kind:'moving',toY:380,speed:1.55}],
    spikes:[...spikes('pit',240,686,24,'up')],traps:[],checkpoint:{x:1090,y:600,w:34,h:60},shard:{id:'memory-03',x:590,y:348,w:34,h:44}
  },
  {
    id:'circus-shot',chapter:2,name:'04 · 开场炮',hint:'别站在红线前。也别站在红线后。',background:['#342c63','#983e70'],spawn:{x:62,y:610},exit:{x:1218,y:566,w:42,h:94},
    blocks:[ground('g0',0,1280),block('p0',310,510,125),block('p1',600,430,145),block('p2',900,520,125),{...block('gate',1110,470,34,190,'#7f537f'),kind:'gate'}],
    spikes:[...spikes('floor-a',225,626,2),{id:'shot-0',x:500,y:590,w:34,h:34,direction:'right',hidden:true},{id:'shot-1',x:790,y:590,w:34,h:34,direction:'left',hidden:true},...spikes('floor-b',1050,626,2)],
    traps:[{id:'t0',trigger:{x:420,y:0,w:40,h:720},action:'slide',targets:['shot-0']},{id:'t1',trigger:{x:720,y:0,w:40,h:720},action:'slide',targets:['shot-1']}],buttons:[{id:'button-0',x:944,y:500,w:44,h:20,target:'gate',label:'舞台门已打开'}],shard:{id:'memory-04',x:655,y:365,w:34,h:44}
  },
  {
    id:'applause-up',chapter:2,name:'05 · 掌声向上',hint:'这次终点在上面。',background:['#2d2a5a','#7f3d70'],spawn:{x:62,y:610},exit:{x:1160,y:96,w:48,h:94},
    blocks:[ground('g0',0,1280),{...block('p0',220,555,150,28,'#ffd36a'),kind:'bounce'},block('p1',460,470,145),{...block('p2',700,380,145,28,'#ffd36a'),kind:'bounce'},block('p3',940,285,145),block('p4',1125,190,120)],
    spikes:[...spikes('a',380,626,3),...spikes('b',635,626,3),...spikes('c',880,626,3),...spikes('ceil',1010,0,4,'down')],
    traps:[{id:'t0',trigger:{x:760,y:300,w:50,h:150},action:'reveal',targets:[]}],checkpoint:{x:735,y:320,w:34,h:60},shard:{id:'memory-05',x:970,y:220,w:34,h:44}
  },
  {
    id:'fake-stage',chapter:2,name:'06 · 临时舞台',hint:'白色平台会塌，残影不会。失败的位置也能成为路线。',background:['#3b2b60','#a84873'],spawn:{x:55,y:610},exit:{x:1218,y:566,w:42,h:94},
    blocks:[ground('g0',0,230),ground('g1',1060,220),{...block('f0',280,555,135,26,'#fff2e6'),kind:'fake'},{...block('f1',480,475,135,26,'#fff2e6'),kind:'fake'},{...block('f2',680,555,135,26,'#fff2e6'),kind:'fake'},{...block('f3',880,455,135,26,'#fff2e6'),kind:'fake'}],
    spikes:[...spikes('pit',230,686,25)],traps:[],checkpoint:{x:1090,y:600,w:34,h:60},shard:{id:'memory-06',x:925,y:390,w:34,h:44}
  },
  {
    id:'mirror-teeth',chapter:3,name:'07 · 镜子的牙齿',hint:'冰面不会替你刹车，反向轻点可以快速修正。',background:['#24233e','#50527d'],spawn:{x:58,y:610},exit:{x:1218,y:566,w:42,h:94},
    blocks:[{...ground('g0',0,1280,'#9bd5dc'),kind:'ice'},block('roof',170,315,920,28,'#817ca5'),block('p0',360,535,130,28),block('p1',720,500,130,28)],
    spikes:[...spikes('floor-a',250,626,3),...spikes('roof-a',420,343,4,'down'),...spikes('floor-b',620,626,3),...spikes('roof-b',820,343,4,'down'),...spikes('floor-c',1040,626,2)],traps:[],shard:{id:'memory-07',x:612,y:370,w:34,h:44}
  },
  {
    id:'reflection-lies',chapter:3,name:'08 · 倒影说谎',hint:'看似稳固，并不等于真的存在。',background:['#202039','#666387'],spawn:{x:55,y:610},exit:{x:1218,y:166,w:42,h:94},
    blocks:[ground('g0',0,245),ground('g1',1080,200),block('p0',270,555,125),{...block('f0',450,480,125,26,'#c6dcdf'),kind:'fake'},block('p1',630,405,125),{...block('f1',810,330,125,26,'#c6dcdf'),kind:'fake'},block('p2',990,255,125)],
    spikes:[...spikes('pit',245,686,25),...spikes('ceiling',650,0,5,'down',true)],traps:[{id:'t0',trigger:{x:750,y:250,w:50,h:250},action:'reveal',targets:['ceiling-0','ceiling-1','ceiling-2','ceiling-3','ceiling-4']}],lasers:[{id:'laser-0',x:568,y:0,w:16,h:405,period:2.5,activeFor:1.15,phase:.3,direction:'vertical'}],checkpoint:{x:665,y:345,w:34,h:60},shard:{id:'memory-08',x:842,y:266,w:34,h:44}
  },
  {
    id:'moving-truth',chapter:3,name:'09 · 移动的真相',hint:'房间不动，是你对房间最后的幻想。',background:['#1b1b32','#4d4d70'],spawn:{x:55,y:610},exit:{x:1218,y:566,w:42,h:94},
    blocks:[ground('g0',0,210),ground('g1',1070,210),{...block('m0',250,555,150),kind:'moving',toX:430,speed:1.6},{...block('m1',540,430,150),kind:'moving',toY:570,speed:1.3},{...block('m2',800,520,150),kind:'moving',toX:930,speed:1.8}],
    spikes:[...spikes('pit',210,686,26),{id:'move-spike',x:615,y:365,w:34,h:34,direction:'down',moving:{axis:'x',distance:150,speed:2.2}}],traps:[],lasers:[{id:'laser-0',x:735,y:300,w:335,h:14,period:2.2,activeFor:.9,phase:1.1,direction:'horizontal'}],shard:{id:'memory-09',x:595,y:370,w:34,h:44}
  },
  {
    id:'castle-greeting',chapter:4,name:'10 · 城堡问候',hint:'尖刺从哪里出现，取决于你看向哪里。',background:['#171329','#4d294e'],spawn:{x:55,y:610},exit:{x:1218,y:566,w:42,h:94},
    blocks:[ground('g0',0,1280),block('p0',260,520,120),block('p1',520,440,120),block('p2',780,520,120),block('p3',1030,440,120),{...block('gate',1160,430,34,230,'#765074'),kind:'gate'}],
    spikes:[...spikes('floor',380,626,3),...spikes('pop-a',635,626,3,'up',true),...spikes('pop-b',910,626,3,'up',true),{id:'wall',x:1130,y:530,w:34,h:100,direction:'left',hidden:true}],
    traps:[{id:'t0',trigger:{x:560,y:0,w:50,h:720},action:'reveal',targets:['pop-a-0','pop-a-1','pop-a-2']},{id:'t1',trigger:{x:830,y:0,w:50,h:720},action:'reveal',targets:['pop-b-0','pop-b-1','pop-b-2']},{id:'t2',trigger:{x:1040,y:0,w:50,h:720},action:'slide',targets:['wall']}],buttons:[{id:'button-0',x:1060,y:410,w:42,h:22,target:'gate',label:'城门解除'}],lasers:[{id:'laser-0',x:735,y:300,w:14,h:360,period:2.8,activeFor:1.2,phase:.7,direction:'vertical'}],checkpoint:{x:510,y:600,w:34,h:60},shard:{id:'memory-10',x:560,y:375,w:34,h:44}
  },
  {
    id:'directors-wall',chapter:4,name:'11 · 园长的手',hint:'墙会追你。停下来，它就赢了。',background:['#130f22','#422342'],spawn:{x:55,y:610},exit:{x:1218,y:126,w:42,h:94},
    blocks:[ground('g0',0,1280),{...block('p0',220,555,120,28,'#ffd36a'),kind:'bounce'},block('p1',420,470,120),{...block('p2',620,385,120),kind:'moving',toX:740,speed:1.7},block('p3',820,300,120),block('p4',1020,215,150)],
    spikes:[...spikes('floor-a',340,626,2),...spikes('floor-b',735,626,2),{id:'chaser',x:-90,y:80,w:70,h:580,direction:'right',hidden:true}],
    traps:[{id:'t0',trigger:{x:120,y:0,w:40,h:720},action:'slide',targets:['chaser']}],checkpoint:{x:55,y:600,w:34,h:60},shard:{id:'memory-11',x:865,y:235,w:34,h:44}
  },
  {
    id:'last-smile',chapter:4,name:'12 · 最后的笑脸',hint:'终点是真的。终点前的地板不一定。',background:['#100d1e','#5a253f'],spawn:{x:55,y:610},exit:{x:1210,y:90,w:52,h:110},
    blocks:[ground('g0',0,220),ground('g1',1080,200),{...block('f0',270,555,125,26,'#f7e7d8'),kind:'fake'},block('p0',450,480,125),{...block('f1',630,405,125,26,'#f7e7d8'),kind:'fake'},{...block('p1',810,330,125,28,'#ffd36a'),kind:'bounce'},block('p2',990,245,125),block('final',1170,200,100),{...block('gate',1135,92,30,108,'#724561'),kind:'gate'}],
    spikes:[...spikes('pit',220,686,26),...spikes('last-pop',1000,211,3,'up',true)],traps:[{id:'t0',trigger:{x:920,y:160,w:60,h:220},action:'reveal',targets:['last-pop-0','last-pop-1','last-pop-2']}],buttons:[{id:'button-0',x:1018,y:218,w:42,h:20,target:'gate',label:'最终门锁解除'}],lasers:[{id:'laser-0',x:762,y:0,w:14,h:405,period:2.4,activeFor:1,phase:.8,direction:'vertical'}],checkpoint:{x:845,y:270,w:34,h:60},shard:{id:'memory-12',x:1030,y:174,w:34,h:44},message:'十二张票根都在这里。园长在后台等最后一次谢幕。'
  }
];

const optional = (id:string,x:number,y:number,title:string,text:string) => ({id,x,y,w:28,h:34,title,text});

const legacy = legacyRooms.map((room,index):RoomDef=>({
  ...room,
  kind:'normal',
  optional:[optional(`note-legacy-${index+1}`,1080-(index%3)*210,570-(index%2)*110,
    ['皱掉的门票','值班记录','广播抄本','演员证','拒绝鼓掌','道具清单','镜后便签','旧玩家刻字','维修单','园长批注','核心日志','未寄出的信'][index],
    ['票面印着你的名字，但日期比你出生还早。','今日实验对象仍把这里称作“游戏”。','请保持微笑。观众更相信微笑的人。','照片上的脸被撕掉了，只剩你的签名。','木偶说：沉默也是一种回答。','“疼痛可以删除，行为会保留。”','镜子延迟了三秒，像在等另一个你。','如果你看到这行字，说明我又失败了。','残影数量超过六个时，舞台开始记住他们。','不要叫他玩家。他是设计者。','关闭机器不会删除痛苦，只会停止循环。','等你愿意记得，我就在现实里等你。'][index])]
}));

const extraRooms:RoomDef[] = [
  {
    id:'syrup-promises',chapter:1,name:'糖浆承诺',hint:'黏住你的不是糖，是“再试一次”的念头。',background:['#7d526c','#d49a9c'],spawn:{x:50,y:610},exit:{x:1218,y:566,w:42,h:94},kind:'normal',
    blocks:[ground('g0',0,1280,'#c88576'),{...block('ice0',250,600,240,60,'#9f6b68'),kind:'ice'},block('p0',560,520,120),{...block('m0',760,440,130),kind:'moving',toY:570,speed:1.4},block('p1',1010,530,120)],
    spikes:[...spikes('s0',500,626,2),...spikes('s1',900,626,3)],traps:[],checkpoint:{x:650,y:600,w:34,h:60},optional:[optional('note-syrup',795,380,'糖浆配方','原料栏只有两项：奖励预期，与未完成感。')]
  },
  {
    id:'lollipop-watch',chapter:1,name:'棒棒糖在看',hint:'旋转物先给影子，再给危险。',background:['#704f72','#c7869a'],spawn:{x:50,y:610},exit:{x:1218,y:566,w:42,h:94},kind:'normal',
    blocks:[ground('g0',0,1280),block('p0',260,520,130),block('p1',540,440,130),block('p2',820,520,130),block('p3',1050,440,110)],
    spikes:[{id:'rot0',x:400,y:470,w:38,h:38,direction:'down',moving:{axis:'y',distance:130,speed:2.1}},{id:'rot1',x:690,y:500,w:38,h:38,direction:'up',moving:{axis:'x',distance:110,speed:1.8}},...spikes('end',970,626,2)],traps:[],optional:[optional('note-lollipop',1080,370,'迎宾守则','笑脸转向你时，不要让它发现你停下。')]
  },
  {
    id:'gift-mouth',chapter:1,name:'礼物盒的胃',hint:'礼盒张开前，缎带会先绷紧。',background:['#744c67','#c97982'],spawn:{x:50,y:610},exit:{x:1218,y:566,w:42,h:94},kind:'normal',
    blocks:[ground('g0',0,220),ground('g1',1050,230),{...block('gift0',280,560,150,30,'#d8b45b'),kind:'fake'},{...block('gift1',510,470,150,30,'#d8b45b'),kind:'bounce'},{...block('gift2',760,555,150,30,'#d8b45b'),kind:'fake'}],
    spikes:[...spikes('pit',220,686,25),...spikes('pop',870,521,2,'up',true)],traps:[{id:'gift-trap',trigger:{x:790,y:450,w:80,h:170},action:'reveal',targets:['pop-0','pop-1']}],checkpoint:{x:1080,y:600,w:34,h:60},optional:[optional('note-gift',560,410,'退货单','收件人：过去的你。退货原因：拒绝遗忘。')]
  },
  {
    id:'red-line-rehearsal',chapter:2,name:'红线排练',hint:'红线亮起后先等半拍，再用助跑双跳穿过炮弹轨迹。',background:['#483342','#9a5860'],spawn:{x:50,y:610},exit:{x:1218,y:566,w:42,h:94},kind:'normal',
    blocks:[ground('g0',0,1280,'#8c6660'),block('p0',330,520,120),block('p1',650,430,120),block('p2',960,520,120)],
    spikes:[{id:'shot0',x:0,y:580,w:40,h:40,direction:'right',hidden:true},{id:'shot1',x:1240,y:390,w:40,h:40,direction:'left',hidden:true}],traps:[{id:'fire0',trigger:{x:220,y:0,w:40,h:720},action:'slide',targets:['shot0']},{id:'fire1',trigger:{x:760,y:0,w:40,h:720},action:'slide',targets:['shot1']}],lasers:[{id:'redline',x:560,y:0,w:10,h:660,period:2.8,activeFor:.9,phase:1.2,direction:'vertical'}],optional:[optional('note-redline',680,365,'炮手口令','红线不是警告，是给观众准备的节拍器。')]
  },
  {
    id:'applause-meter',chapter:2,name:'掌声计量器',hint:'灯灭时前进，灯亮时让残影替你站着。',background:['#433140','#875364'],spawn:{x:50,y:610},exit:{x:1218,y:566,w:42,h:94},kind:'normal',
    blocks:[ground('g0',0,1280),{...block('m0',260,520,120),kind:'moving',toY:380,speed:2},{...block('m1',520,430,120),kind:'moving',toY:560,speed:2},{...block('m2',780,520,120),kind:'moving',toY:360,speed:2},block('p0',1040,480,120)],
    spikes:[...spikes('floor',390,626,3),...spikes('floor2',880,626,3)],traps:[],lasers:[{id:'beat0',x:700,y:0,w:12,h:430,period:2,activeFor:.72,phase:0,direction:'vertical'}],checkpoint:{x:580,y:600,w:34,h:60},optional:[optional('note-applause',1080,415,'观众调查','九成观众无法分辨掌声与求救，只要节拍整齐。')]
  },
  {
    id:'curtain-call',chapter:2,name:'帷幕落下',hint:'幕布的阴影会先遮住安全区。',background:['#3c293b','#754452'],spawn:{x:50,y:610},exit:{x:1218,y:160,w:42,h:94},kind:'normal',
    blocks:[ground('g0',0,1280),{...block('lift0',210,560,150),kind:'moving',toY:380,speed:1.2},block('p0',470,400,150),{...block('lift1',730,510,150),kind:'moving',toY:280,speed:1.35},block('p1',1010,255,150)],
    spikes:[...spikes('floor',380,626,4),...spikes('ceil',780,0,5,'down')],traps:[],lasers:[{id:'curtain',x:630,y:0,w:18,h:660,period:3.2,activeFor:1.15,phase:.6,direction:'vertical'}],optional:[optional('note-curtain',1030,195,'幕布背面','上面写满了每个演员失败时的第一句话。你的那句是：再来。')]
  },
  {
    id:'mirror-delay',chapter:3,name:'迟到的倒影',hint:'危险复制你两秒前的位置。别原路返回。',background:['#35404a','#6b7378'],spawn:{x:50,y:610},exit:{x:1218,y:566,w:42,h:94},kind:'normal',
    blocks:[ground('g0',0,1280,'#7e8584'),block('p0',300,520,130),block('p1',570,430,130),block('p2',840,520,130)],spikes:[...spikes('s0',430,626,3),...spikes('s1',970,626,3)],traps:[],lasers:[{id:'mirrorline',x:700,y:250,w:12,h:410,period:3,activeFor:1.2,phase:.2,direction:'vertical'}],optional:[optional('note-delay',610,365,'镜后刻字','如果倒影追上你，说明你犹豫得和上一次一样久。')]
  },
  {
    id:'phase-floor',chapter:3,name:'相位地板',hint:'透明不等于不存在；实心也不保证长久。',background:['#303a45','#606b72'],spawn:{x:50,y:610},exit:{x:1218,y:566,w:42,h:94},kind:'normal',
    blocks:[ground('g0',0,220),ground('g1',1080,200),{...block('f0',270,550,130,26,'#a8c4c6'),kind:'fake'},{...block('m0',480,470,130),kind:'moving',toX:650,speed:1.5},{...block('f1',750,390,130,26,'#a8c4c6'),kind:'fake'},block('p0',960,510,100)],spikes:[...spikes('pit',220,686,26)],traps:[],checkpoint:{x:990,y:450,w:34,h:60},optional:[optional('note-phase',790,330,'相位测试','物体消失后，受试者仍会绕开它。记忆比碰撞更持久。')]
  },
  {
    id:'false-exit',chapter:3,name:'错误出口',hint:'真正的出口没有灯，只有磨损的门把。',background:['#2b3540','#586369'],spawn:{x:50,y:610},exit:{x:1218,y:180,w:42,h:94},kind:'normal',
    blocks:[ground('g0',0,1280),block('p0',260,520,120),block('p1',500,430,120),block('p2',740,340,120),block('p3',980,250,150)],spikes:[...spikes('s0',360,626,3),...spikes('s1',820,626,3),...spikes('pop',1030,216,2,'up',true)],traps:[{id:'false',trigger:{x:930,y:180,w:60,h:180},action:'reveal',targets:['pop-0','pop-1']}],optional:[optional('note-exit',530,365,'出口维护','发光门用于测试服从性。真正的出口从不主动吸引你。')]
  },
  {
    id:'core-conveyor',chapter:4,name:'核心输送带',hint:'速度会累积，反向键不是刹车而是选择。',background:['#3a2e3b','#6c4851'],spawn:{x:50,y:610},exit:{x:1218,y:566,w:42,h:94},kind:'normal',
    blocks:[{...ground('g0',0,1280,'#8f6d69'),kind:'ice'},block('p0',330,500,120),{...block('m0',600,410,140),kind:'moving',toX:780,speed:1.8},block('p1',980,500,130)],spikes:[...spikes('s0',470,626,3),...spikes('s1',840,626,3)],traps:[],lasers:[{id:'coreline',x:760,y:0,w:12,h:410,period:2.2,activeFor:.82,phase:.4,direction:'vertical'}],optional:[optional('note-corebelt',640,345,'核心运输单','目的地：记忆焚化炉。发件人签名与你完全一致。')]
  },
  {
    id:'collapse-order',chapter:4,name:'坍塌顺序',hint:'平台按编号坠落，背景里的粉笔记着顺序。',background:['#332936','#62434b'],spawn:{x:50,y:610},exit:{x:1218,y:566,w:42,h:94},kind:'normal',
    blocks:[ground('g0',0,200),ground('g1',1100,180),{...block('f0',250,560,130),kind:'fake'},{...block('f1',450,480,130),kind:'fake'},{...block('f2',650,400,130),kind:'fake'},{...block('f3',850,480,130),kind:'fake'}],spikes:[...spikes('pit',200,686,27)],traps:[],checkpoint:{x:1120,y:600,w:34,h:60},optional:[optional('note-collapse',685,335,'拆除顺序','3、1、4、2。园长喜欢把正确答案写在没人看的地方。')]
  },
  {
    id:'choice-machine',chapter:4,name:'选择机器',hint:'两个按钮都能开门，但只有一个不会启动追逐墙。',background:['#302530','#593842'],spawn:{x:50,y:610},exit:{x:1218,y:566,w:42,h:94},kind:'normal',
    blocks:[ground('g0',0,1280),block('p0',300,520,130),block('p1',600,430,130),block('p2',900,520,130),{...block('gate',1140,470,34,190,'#6d4a50'),kind:'gate'}],spikes:[{id:'chaser',x:-100,y:90,w:70,h:570,direction:'right',hidden:true},...spikes('s0',740,626,3)],traps:[{id:'badchoice',trigger:{x:500,y:520,w:50,h:140},action:'slide',targets:['chaser']}],buttons:[{id:'good',x:930,y:495,w:44,h:22,target:'gate',label:'机器停止'}],optional:[optional('note-choice',640,365,'选择实验','所谓自由意志，只是我们没有告诉受试者第三个按钮在哪里。')]
  }
];

const bossRoom=(chapter:number,id:string,name:string,intro:string,color:string):RoomDef=>({
  id,chapter,name:`终局 · ${name}`,hint:`${chapter===4?'四个':'三个'}阶段必须依次完成；每阶段先躲过完整攻势，机关才会解锁。`,background:[color,'#2d2330'],spawn:{x:55,y:610},exit:{x:1218,y:566,w:42,h:94},kind:'boss',boss:{id,name,chapter,intro,stages:chapter===4?4:3},
  blocks:[ground('g0',0,1280,'#806563'),block('p0',240,520,130),{...block('p1',510,410,140),kind:'moving',toY:560,speed:1.35},block('p2',790,500,130),...(chapter===4?[block('p3',1010,410,110)]:[]),{...block('gate',1150,430,34,230,'#6d4a50'),kind:'gate'}],
  spikes:[...spikes('floor0',380,626,3),...spikes('floor1',930,626,3)],traps:[],buttons:[{id:'phase-a',x:285,y:494,w:44,h:22,target:'boss',label:'阶段一完成'},{id:'phase-b',x:560,y:382,w:44,h:22,target:'boss',label:'阶段二完成'},{id:'phase-c',x:835,y:474,w:44,h:22,target:'boss',label:'阶段三完成'},...(chapter===4?[{id:'phase-d',x:1042,y:382,w:44,h:22,target:'boss',label:'核心崩塌完成'}]:[])],checkpoint:{x:70,y:600,w:34,h:60},optional:[optional(`boss-note-${chapter}`,1030,560,`${name}的节目单`,'最后一行被反复涂改：请让他相信，这一切都是自己选择的。')]
});

const prologue:RoomDef={id:'prologue',chapter:1,name:'序章 · 关灯以后',hint:'走到舞台中央。这里暂时不会伤害你。',background:['#352c36','#67504e'],spawn:{x:70,y:610},exit:{x:1218,y:566,w:42,h:94},kind:'prologue',blocks:[ground('g0',0,1280,'#8f766d'),block('stage',430,540,420,30,'#b59075')],spikes:[],traps:[],message:'广播：欢迎回来，首席设计师。今晚仍由你扮演“玩家”。'};
const epilogue:RoomDef={id:'epilogue',chapter:4,name:'终章 · 天亮以前',hint:'向右关闭循环；若档案已经完整，也许还能向左作出另一种回答。',background:['#d3c6ad','#78656b'],spawn:{x:625,y:610},exit:{x:1218,y:566,w:42,h:94},kind:'epilogue',blocks:[ground('g0',0,1280,'#b99a7f')],spikes:[],traps:[],message:'机器已经停下。现在决定该怎样带着这些记忆离开。'};

const baseRooms:RoomDef[]=[
  prologue,
  ...legacy.slice(0,3),...extraRooms.slice(0,3),bossRoom(1,'welcome-mascot','迎宾吉祥物','它仍在重复欢迎动作，只是怀里已经没有孩子。','#7c4d62'),
  ...legacy.slice(3,6),...extraRooms.slice(3,6),bossRoom(2,'ringmaster','提线团长','他向空座位鞠躬，等一个永远不会结束的掌声。','#5d3746'),
  ...legacy.slice(6,9),...extraRooms.slice(6,9),bossRoom(3,'mirror-self','镜像玩家','镜子里的你比你早一步害怕，也晚一步后悔。','#3f4a55'),
  ...legacy.slice(9,12),...extraRooms.slice(9,12),bossRoom(4,'smile-director','笑脸园长','他摘下面具。下面不是脸，是你第一次启动机器时的录像。','#4c303d'),
  epilogue
];
export const rooms:RoomDef[]=directedCampaign(baseRooms);

export function validateRooms(data:RoomDef[]=rooms):string[]{
  const errors:string[]=[],roomIds=new Set<string>(),collectibleIds=new Set<string>(),bossIds=new Set<string>();
  for(const room of data){
    const worldWidth=room.worldWidth??1280,worldHeight=room.worldHeight??720;
    if(roomIds.has(room.id))errors.push(`重复房间 ID: ${room.id}`);roomIds.add(room.id);
    if(room.spawn.x<0||room.spawn.y<0||room.spawn.x+30>worldWidth||room.spawn.y+42>worldHeight)errors.push(`${room.id}: 出生点越界`);
    if(room.exit.x<0||room.exit.y<0||room.exit.x+room.exit.w>worldWidth||room.exit.y+room.exit.h>worldHeight)errors.push(`${room.id}: 出口越界`);
    for(const cp of room.checkpoints??(room.checkpoint?[room.checkpoint]:[]))if(cp.x<0||cp.y<0||cp.x+cp.w>worldWidth||cp.y+cp.h>worldHeight)errors.push(`${room.id}: 检查点越界`);
    const entityIds=new Set<string>();
    for(const entity of [...room.blocks,...room.spikes,...(room.buttons??[]),...(room.lasers??[]),...(room.launchers??[]),...(room.portals??[]),...(room.crushers??[]),...(room.spotlights??[])]){if(entityIds.has(entity.id))errors.push(`${room.id}: 重复实体 ID ${entity.id}`);entityIds.add(entity.id);if(entity.w<=0||entity.h<=0)errors.push(`${room.id}: 非法尺寸 ${entity.id}`);}
    const trapIds=new Set<string>();for(const trap of room.traps){if(trapIds.has(trap.id))errors.push(`${room.id}: 重复陷阱 ID ${trap.id}`);trapIds.add(trap.id);if(trap.trigger.w<=0||trap.trigger.h<=0)errors.push(`${room.id}: 非法触发区 ${trap.id}`);}
    const spikeIds=new Set(room.spikes.map(s=>s.id)),blockIds=new Set(room.blocks.map(b=>b.id)),groups=new Set(room.blocks.filter(b=>b.group).map(b=>b.group!)),portalIds=new Set((room.portals??[]).map(portal=>portal.id));
    for(const trap of room.traps)for(const target of trap.targets)if(!spikeIds.has(target))errors.push(`${room.id}: 陷阱目标不存在 ${target}`);
    for(const button of room.buttons??[]){if(button.target==='boss')continue;if(button.target.startsWith('group:')){if(!groups.has(button.target.slice(6)))errors.push(`${room.id}: 按钮分组不存在 ${button.target}`);}else if(!blockIds.has(button.target))errors.push(`${room.id}: 按钮目标不存在 ${button.target}`);}
    for(const conflict of buttonHazardConflicts(room))errors.push(`${room.id}: 按钮 ${conflict.buttonId} 与${conflict.kind} ${conflict.hazardId} 重叠`);
    for(const conflict of spikeObstacleConflicts(room))errors.push(`${room.id}: 尖刺 ${conflict.spikeId} 与平台 ${conflict.blockId} 重叠`);
    for(const portal of room.portals??[])if(!portalIds.has(portal.target))errors.push(`${room.id}: 传送门目标不存在 ${portal.target}`);
    for(const crusher of room.crushers??[]){if(crusher.period<=0||crusherSafeWindow(crusher)<.55)errors.push(`${room.id}: 压台机安全窗口不足 ${crusher.id}`);}
    for(const sentry of room.sentries??[]){if(entityIds.has(sentry.id))errors.push(`${room.id}: 重复实体 ID ${sentry.id}`);entityIds.add(sentry.id);if(sentry.x<0||sentry.x>worldWidth||sentry.y<0||sentry.y>worldHeight||sentry.range<=0||sentry.period<1.1||sentry.projectileSpeed<=0||sentry.warning<.35)errors.push(`${room.id}: 导演哨兵参数非法 ${sentry.id}`);}
    if(room.pursuit&&(room.pursuit.baseSpeed<=0||room.pursuit.maxSpeed<room.pursuit.baseSpeed||room.pursuit.triggerX<0||room.pursuit.triggerX>worldWidth))errors.push(`${room.id}: 追逐幕墙参数非法`);
    if(room.contract&&room.contract.target!==undefined&&room.contract.target<=0)errors.push(`${room.id}: 悬赏目标非法`);
    if(room.beats?.length){let previous=-Infinity;for(const beat of room.beats){if(beat.x<=previous||beat.x<0||beat.x>worldWidth)errors.push(`${room.id}: 幕间标记顺序非法`);previous=beat.x;}}
    for(const item of [...(room.shard?[room.shard]:[]),...(room.optional??[])]){if(collectibleIds.has(item.id))errors.push(`重复收集物 ID: ${item.id}`);collectibleIds.add(item.id);if(item.x<0||item.y<0||item.x+item.w>worldWidth||item.y+item.h>worldHeight)errors.push(`${room.id}: 收集物越界 ${item.id}`);}
    if(room.boss){if(bossIds.has(room.boss.id))errors.push(`重复 Boss ID: ${room.boss.id}`);bossIds.add(room.boss.id);if(room.kind!=='boss')errors.push(`${room.id}: Boss 数据与房间类型不符`);if(room.boss.stages<3||!Number.isInteger(room.boss.stages))errors.push(`${room.id}: Boss 阶段数非法`);}
  }
  return errors;
}
