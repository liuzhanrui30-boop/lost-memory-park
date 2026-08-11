import { createRunSeed } from './director';
export type SpikeDirection = 'up' | 'down' | 'left' | 'right';
export type TrapAction = 'reveal' | 'drop' | 'slide' | 'launch';
export const MAX_ECHOES = 6;
export type EndingId = 'escape' | 'takeover' | 'destroy' | 'accept';
export type GhostPoint=[number,number,number];

export interface Rect { x: number; y: number; w: number; h: number }

export interface OrbitPlatformSpec {centerX:number;centerY:number;radiusX:number;radiusY:number;speed:number;phase?:number}

export interface LauncherDef extends Rect {id:string;vx:number;vy:number;facing?:-1|1;cooldown?:number}
export interface PortalDef extends Rect {id:string;target:string;exitDirection:-1|1;color?:string}
export interface CrusherDef extends Rect {id:string;axis:'x'|'y';distance:number;period:number;phase?:number}
export interface SpotlightDef extends Rect {id:string;period:number;activeFor:number;phase?:number;warning?:number}
export interface BeatDefinition {x:number;label:string;intensity:number;checkpoint?:boolean}
export interface PursuitDef {id:string;startX:number;triggerX:number;baseSpeed:number;maxSpeed:number;width?:number;color?:string}
export type SentryPattern='aimed'|'arc'|'fan'|'mirror'|'burst';
export interface SentryDef {id:string;x:number;y:number;range:number;period:number;projectileSpeed:number;warning:number;phase?:number;burst?:number;pattern?:SentryPattern;label?:string;shotColor?:string}
export type ContractRule='relentless'|'no-death'|'speed'|'heat'|'combo';
export interface ContractDefinition {id:string;label:string;description:string;rule:ContractRule;target?:number}
export type LandmarkId='candy-press'|'lollipop-gears'|'gift-jaw'|'cannon-stack'|'applause-eye'|'living-curtain'|'broken-mirror'|'twin-shadow'|'rotating-room'|'clock-hand'|'memory-furnace'|'choice-engine';

export interface BlockDef extends Rect {
  id: string;
  kind?: 'solid' | 'moving' | 'fake' | 'bounce' | 'ice' | 'gate' | 'oneway' | 'conveyor' | 'phase' | 'crumble' | 'toggle' | 'sticky' | 'orbit';
  toX?: number;
  toY?: number;
  speed?: number;
  color?: string;
  forceX?:number;
  phasePeriod?:number;
  phaseActiveFor?:number;
  phaseOffset?:number;
  group?:string;
  activeWhen?:boolean;
  crumbleDelay?:number;
  crumbleRespawn?:number;
  orbit?:OrbitPlatformSpec;
}

export type ButtonRequirement='touch'|'airborne'|'reverse'|'still'|'double-jump'|'combo'|'momentum'|'rising'|'falling';
export interface ButtonDef extends Rect {
  id: string;
  target: string;
  label?: string;
  requires?:ButtonRequirement;
}

export interface LaserDef extends Rect {
  id: string;
  period: number;
  activeFor: number;
  phase?: number;
  direction?: 'horizontal' | 'vertical';
}

export interface OptionalCollectible extends Rect {
  id: string;
  title: string;
  text: string;
}

export interface TutorialSignDef extends Rect {
  id:string;
  title:string;
  rows:Array<{keys:string;label:string}>;
}

export interface BossDef {
  id: string;
  name: string;
  chapter: number;
  intro: string;
  stages: number;
}

export interface SpikeDef extends Rect {
  id: string;
  direction: SpikeDirection;
  hidden?: boolean;
  moving?: { axis: 'x' | 'y'; distance: number; speed: number };
  orbit?:{centerX:number;centerY:number;radiusX:number;radiusY:number;speed:number;phase?:number};
}

export interface WindZoneDef extends Rect {id:string;forceX:number;forceY:number}

export interface TrapDef {
  id: string;
  trigger: Rect;
  action: TrapAction;
  targets: string[];
}

export interface RoomDef {
  id: string;
  chapter: number;
  name: string;
  hint: string;
  background: [string, string];
  spawn: { x: number; y: number };
  exit: Rect;
  blocks: BlockDef[];
  spikes: SpikeDef[];
  traps: TrapDef[];
  buttons?: ButtonDef[];
  lasers?: LaserDef[];
  checkpoint?: Rect;
  shard?: Rect & { id: string };
  optional?: OptionalCollectible[];
  kind?: 'prologue' | 'normal' | 'boss' | 'epilogue';
  boss?: BossDef;
  message?: string;
  worldWidth?:number;
  worldHeight?:number;
  checkpoints?:Rect[];
  windZones?:WindZoneDef[];
  remixKind?:string;
  launchers?:LauncherDef[];
  portals?:PortalDef[];
  crushers?:CrusherDef[];
  spotlights?:SpotlightDef[];
  beats?:BeatDefinition[];
  landmark?:LandmarkId;
  pursuit?:PursuitDef;
  sentries?:SentryDef[];
  attackTheme?:string;
  contract?:ContractDefinition;
  tutorialSigns?:TutorialSignDef[];
}

export interface AccessibilitySettings {
  master: number;
  muted: boolean;
  music: number;
  sfx: number;
  ambient: number;
  shake: number;
  flash: number;
  particles: number;
  dynamicBackground: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  thickOutlines: boolean;
  hudMode: 'full' | 'compact' | 'hidden';
  textScale: number;
  gameSpeed: number;
  warningBoost: boolean;
  showHiddenTraps: boolean;
  gamepad: boolean;
  touch: boolean;
  touchMode: 'auto'|'on'|'off';
  touchScale: number;
  touchJumpScale: number;
  touchOpacity: number;
  touchInset: number;
  touchLeftHanded: boolean;
  haptics: boolean;
  colorFriendly: boolean;
  dialogueSpeed: number;
  showGhost:boolean;
  heatHud:boolean;
  bindings: Record<'left'|'right'|'jump'|'drop'|'restart'|'pause', string>;
}

export const defaultSettings = (): AccessibilitySettings => ({
  master: .8, muted: false, music: .7, sfx: .8, ambient: .45, shake: .2, flash: .65, particles: .35,
  dynamicBackground: true, reducedMotion: false, highContrast: false, thickOutlines: false,
  hudMode: 'full', textScale: 1, gameSpeed: 1, warningBoost: false,
  showHiddenTraps: false, gamepad: true, touch: false, touchMode: 'auto', touchScale: 1, touchJumpScale: 1.12, touchOpacity: .72, touchInset: 18,
  touchLeftHanded: false, haptics: true, colorFriendly: false, dialogueSpeed: 1,
  showGhost: false, heatHud: true,
  bindings: { left:'KeyA', right:'KeyD', jump:'Space', drop:'KeyS', restart:'KeyR', pause:'Escape' },
});

export interface V2Save {
  version: 5;
  started: boolean;
  room: number;
  respawnRoom: number;
  respawnX: number;
  respawnY: number;
  shards: string[];
  deaths: number;
  elapsed: number;
  music: boolean;
  sfx: boolean;
  completed: boolean;
  slot: number;
  notes: string[];
  achievements: string[];
  endings: string[];
  unlockedRoom: number;
  bestRooms: Record<string,{time:number;deaths:number;rank:string;assisted:boolean;heat?:number;contract?:boolean;bestCombo?:number}>;
  roomDeaths: Record<string,number>;
  bossStages: Record<string,number>;
  mode: 'story' | 'speedrun' | 'bossrush' | 'mirror' | 'director';
  assisted: boolean;
  modeBests: Partial<Record<'story'|'speedrun'|'bossrush'|'mirror'|'director',number>>;
  ghostRooms:Record<string,GhostPoint[]>;
  runSeed:number;
  directorUnlocked:boolean;
  directorCommandHistory:Record<string,string>;
  exploredRooms:Record<string,number>;
  settings: AccessibilitySettings;
}

export const newV2Save = (): V2Save => ({
  version: 5,
  started: false,
  room: 0,
  respawnRoom: 0,
  respawnX: 76,
  respawnY: 600,
  shards: [],
  deaths: 0,
  elapsed: 0,
  music: true,
  sfx: true,
  completed: false,
  slot: 0,
  notes: [],
  achievements: [],
  endings: [],
  unlockedRoom: 0,
  bestRooms: {},
  roomDeaths: {},
  bossStages: {},
  mode: 'story',
  assisted: false,
  modeBests: {},
  ghostRooms: {},
  runSeed: createRunSeed(0),
  directorUnlocked: false,
  directorCommandHistory: {},
  exploredRooms: {},
  settings: defaultSettings(),
});

export function v2Ending(shards: number): Exclude<EndingId,'accept'> {
  if (shards >= 12) return 'destroy';
  if (shards >= 6) return 'takeover';
  return 'escape';
}
