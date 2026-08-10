export class AudioSystem {
  private context?: AudioContext;
  private master?: GainNode;
  private musicGain?: GainNode;
  private sfxGain?: GainNode;
  private ambientGain?: GainNode;
  private timer?: number;
  private beat = 0;
  private chapter = 0;
  private boss = false;
  private intensity = 0;
  private suspended = false;
  private masterVolume = .8;
  private musicVolume = .7;
  private sfxVolume = .8;
  private ambientVolume = .45;
  musicEnabled = true;
  sfxEnabled = true;

  async unlock(): Promise<void> {
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.musicGain = this.context.createGain();
      this.sfxGain = this.context.createGain();
      this.ambientGain = this.context.createGain();
      this.master.gain.value = this.masterVolume;
      this.musicGain.gain.value = this.musicEnabled ? 0.22*this.musicVolume : 0;
      this.sfxGain.gain.value = this.sfxEnabled ? 0.55*this.sfxVolume : 0;
      this.ambientGain.gain.value = .08*this.ambientVolume;
      this.musicGain.connect(this.master);
      this.sfxGain.connect(this.master);
      this.ambientGain.connect(this.master);
      this.master.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') await this.context.resume();
    if (!this.timer) this.startMusicLoop();
  }

  setChapter(index: number,boss=false): void { this.chapter = index; this.boss=boss; this.beat = 0; }
  setIntensity(value:number):void{this.intensity=Math.max(0,Math.min(1,value));}

  setMusic(enabled: boolean): void {
    this.musicEnabled = enabled;
    if (this.context && this.musicGain) this.musicGain.gain.setTargetAtTime(enabled && !this.suspended ? .22*this.musicVolume : 0, this.context.currentTime, .05);
  }

  setSfx(enabled: boolean): void {
    this.sfxEnabled = enabled;
    if (this.context && this.sfxGain) this.sfxGain.gain.setTargetAtTime(enabled ? .55*this.sfxVolume : 0, this.context.currentTime, .05);
  }

  setSuspended(suspended: boolean): void {
    this.suspended = suspended;
    if (this.context && this.musicGain) {
      this.musicGain.gain.setTargetAtTime(this.musicEnabled && !suspended ? .22*this.musicVolume : 0, this.context.currentTime, .04);
    }
    if(this.context&&this.ambientGain)this.ambientGain.gain.setTargetAtTime(!suspended?.08*this.ambientVolume:0,this.context.currentTime,.08);
  }

  setVolumes(master:number,music:number,sfx:number,ambient:number):void{
    this.masterVolume=Math.max(0,Math.min(1,master));this.musicVolume=Math.max(0,Math.min(1,music));this.sfxVolume=Math.max(0,Math.min(1,sfx));this.ambientVolume=Math.max(0,Math.min(1,ambient));
    if(this.context&&this.master)this.master.gain.setTargetAtTime(this.masterVolume,this.context.currentTime,.04);
    if(this.context&&this.musicGain)this.musicGain.gain.setTargetAtTime(this.musicEnabled&&!this.suspended?.22*this.musicVolume:0,this.context.currentTime,.04);
    if(this.context&&this.sfxGain)this.sfxGain.gain.setTargetAtTime(this.sfxEnabled?.55*this.sfxVolume:0,this.context.currentTime,.04);
    if(this.context&&this.ambientGain)this.ambientGain.gain.setTargetAtTime(!this.suspended?.08*this.ambientVolume:0,this.context.currentTime,.08);
  }

  private startMusicLoop(): void {
    const tick = () => {
      if (this.context && this.musicEnabled) {
        const scales = [
          [261.6, 329.6, 392, 523.3, 392, 329.6, 293.7, 392],
          [220, 330, 392, 440, 349.2, 392, 261.6, 330],
          [246.9, 293.7, 370, 293.7, 233.1, 277.2, 349.2, 261.6],
          [196, 233.1, 311.1, 261.6, 185, 220, 277.2, 207.7],
        ];
        const scale = scales[this.chapter] ?? scales[0];
        const note = scale[this.beat % scale.length];
        const detune = this.chapter * (this.beat % 3 === 0 ? -17 : 8);
        this.tone(note, .16, this.chapter < 2 ? 'triangle' : 'sine', .08, detune, this.musicGain);
        if (this.beat % 4 === 0) this.tone(note / 2, .32, 'sine', .05, -this.chapter * 6, this.musicGain);
        if(this.boss&&this.beat%2===0){this.tone(68,.075,'square',.035,-this.beat*3,this.musicGain);this.tone(note*Math.pow(2,1/12),.09,'sawtooth',.025,-11,this.musicGain);}
        if(this.intensity>.45&&this.beat%2===0)this.tone(92+this.intensity*34,.045,'square',.018+this.intensity*.022,-35,this.musicGain);
        if(this.intensity>.78)this.tone(note*2,.045,'triangle',.018,this.beat%2?12:-12,this.musicGain);
        if (this.beat % 8 === 0) this.tone(48 + this.chapter * 5, 1.7, 'sine', .035, -18, this.ambientGain);
        this.beat++;
      }
      this.timer = window.setTimeout(tick, (265 + this.chapter * 24)*(this.boss?.78:1));
    };
    tick();
  }

  private tone(frequency: number, duration: number, type: OscillatorType, volume: number, detune = 0, output = this.sfxGain): void {
    if (!this.context || !output) return;
    const now = this.context.currentTime;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    osc.detune.value = detune;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(.001, volume), now + .012);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    osc.connect(gain); gain.connect(output);
    osc.start(now); osc.stop(now + duration + .03);
  }

  jump(): void { if (this.sfxEnabled) { this.tone(330,.08,'square',.12); setTimeout(()=>this.tone(500,.09,'triangle',.08),45); } }
  collect(): void { if (this.sfxEnabled) [660,880,1100].forEach((n,i)=>setTimeout(()=>this.tone(n,.16,'sine',.12),i*70)); }
  button(): void { if (this.sfxEnabled) { this.tone(150,.08,'square',.13); setTimeout(()=>this.tone(260,.12,'square',.09),70); } }
  lockSuccess():void{if(this.sfxEnabled)[294,440,659,988].forEach((n,i)=>setTimeout(()=>this.tone(n,.12,'triangle',.07+i*.008),i*42));}
  lockReject():void{if(this.sfxEnabled){this.tone(118,.09,'square',.07,-55);setTimeout(()=>this.tone(92,.12,'sawtooth',.055,-80),48);}}
  death(): void { if (this.sfxEnabled) [380,270,160,90].forEach((n,i)=>setTimeout(()=>this.tone(n,.15,'sawtooth',.09,-i*18),i*55)); }
  checkpoint(): void { if (this.sfxEnabled) [440,554,659].forEach((n,i)=>setTimeout(()=>this.tone(n,.2,'triangle',.08),i*90)); }
  trap(): void { if (this.sfxEnabled) this.tone(75,.22,'sawtooth',.14,-50); }
  warning(): void { if(this.sfxEnabled){this.tone(880,.055,'square',.045);setTimeout(()=>this.tone(660,.07,'square',.035),65);} }
  land(): void { if(this.sfxEnabled)this.tone(115,.055,'triangle',.045); }
  stage():void{if(this.sfxEnabled)[164,246,329,493].forEach((n,i)=>setTimeout(()=>this.tone(n,.16,'square',.065),i*58));}
  launch():void{if(this.sfxEnabled){this.tone(92,.18,'sawtooth',.13,-40);[210,340,560].forEach((n,i)=>setTimeout(()=>this.tone(n,.11,'square',.075,i*9),i*34));}}
  portal():void{if(this.sfxEnabled){[780,620,920,510].forEach((n,i)=>setTimeout(()=>this.tone(n,.095,'sine',.07,-i*19),i*26));}}
  crusher():void{if(this.sfxEnabled){this.tone(52,.24,'sawtooth',.16,-90);this.tone(84,.12,'square',.11,-35);setTimeout(()=>this.tone(43,.26,'triangle',.09,-70),42);}}
  spotlightLock():void{if(this.sfxEnabled){this.tone(1220,.055,'square',.08);setTimeout(()=>this.tone(305,.14,'sawtooth',.11,-60),48);}}
  toggle():void{if(this.sfxEnabled){this.tone(245,.08,'square',.08);setTimeout(()=>this.tone(490,.12,'triangle',.09),72);}}
  beatStamp(gold:boolean):void{if(this.sfxEnabled){const notes=gold?[523,784,1047]:[330,440,587];notes.forEach((n,i)=>setTimeout(()=>this.tone(n,.14,'triangle',gold ? .105 : .075,i*5),i*46));if(gold)setTimeout(()=>this.tone(1319,.24,'sine',.08),140);}}
  pursuit():void{if(this.sfxEnabled){this.tone(58,.28,'sawtooth',.11,-70);setTimeout(()=>this.tone(116,.18,'square',.06,-35),75);}}
  sentry():void{if(this.sfxEnabled){this.tone(980,.045,'square',.055);setTimeout(()=>this.tone(1320,.055,'square',.045),70);}}
  nearMiss():void{if(this.sfxEnabled){this.tone(720,.055,'triangle',.06);setTimeout(()=>this.tone(1080,.09,'sine',.075),34);}}
  combo(tier:number):void{if(this.sfxEnabled){const root=420+tier*95;[root,root*1.25].forEach((n,i)=>setTimeout(()=>this.tone(n,.08,'triangle',.05+tier*.008),i*35));}}
  contractClear():void{if(this.sfxEnabled)[392,523,659,988].forEach((n,i)=>setTimeout(()=>this.tone(n,.15,'triangle',.08+i*.008),i*56));}
  contractFail():void{if(this.sfxEnabled){this.tone(185,.13,'sawtooth',.075,-45);setTimeout(()=>this.tone(92,.2,'square',.07,-70),70);}}
}
