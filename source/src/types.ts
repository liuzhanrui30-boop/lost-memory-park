export type ChapterTheme = 'candy' | 'circus' | 'mirror' | 'castle';
export type PlatformKind = 'solid' | 'moving' | 'bounce' | 'fake' | 'sticky' | 'bite';
export type HazardKind = 'spikes' | 'cannon' | 'spotlight' | 'pendulum' | 'chomper';
export type TrapAction = 'spawnSpikes' | 'moveExit' | 'invertControls' | 'dropCeiling' | 'fakeVictory';

export interface Vec2 { x: number; y: number }

export interface PlatformDefinition {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  kind?: PlatformKind;
  color?: number;
  moveTo?: Vec2;
  speed?: number;
  phase?: number;
}

export interface HazardDefinition {
  id: string;
  kind: HazardKind;
  x: number;
  y: number;
  width?: number;
  height?: number;
  range?: number;
  speed?: number;
  phase?: number;
  disabledBy?: string;
}

export interface TrapDefinition {
  id: string;
  trigger: { x: number; y: number; width: number; height: number };
  action: TrapAction;
  chance?: number;
  once?: boolean;
  data?: Record<string, number | string | boolean>;
}

export interface ButtonDefinition {
  id: string;
  x: number;
  y: number;
  targetId: string;
  label?: string;
}

export interface ShardDefinition { id: string; x: number; y: number }

export interface DialogueLine {
  speaker: string;
  text: string;
  mood?: 'smile' | 'fear' | 'angry' | 'blank';
}

export interface DialogueSequence {
  id: string;
  lines: DialogueLine[];
}

export interface LevelDefinition {
  id: string;
  chapter: number;
  title: string;
  subtitle: string;
  theme: ChapterTheme;
  length: number;
  spawn: Vec2;
  checkpoints: Vec2[];
  exit: Vec2;
  platforms: PlatformDefinition[];
  hazards: HazardDefinition[];
  traps: TrapDefinition[];
  buttons: ButtonDefinition[];
  shards: ShardDefinition[];
  intro: DialogueSequence;
}

export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  grounded: boolean;
  lives: number;
  deaths: number;
  currentLevel: number;
  checkpoint: number;
}

export interface SaveData {
  version: 1;
  hasStarted: boolean;
  currentLevel: number;
  checkpoint: number;
  lives: number;
  shards: string[];
  deaths: number;
  elapsedSeconds: number;
  bestSections: Record<string, number>;
  endings: string[];
  settings: { music: boolean; sfx: boolean };
}

export const defaultSave = (): SaveData => ({
  version: 1,
  hasStarted: false,
  currentLevel: 0,
  checkpoint: 0,
  lives: 5,
  shards: [],
  deaths: 0,
  elapsedSeconds: 0,
  bestSections: {},
  endings: [],
  settings: { music: true, sfx: true },
});

export function endingForShardCount(count: number): 'escape' | 'takeover' | 'destroy' {
  if (count >= 12) return 'destroy';
  if (count >= 6) return 'takeover';
  return 'escape';
}

export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const tenths = Math.floor((seconds % 1) * 10);
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
}
