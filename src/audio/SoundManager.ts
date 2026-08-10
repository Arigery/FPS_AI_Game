const STAGE4_SAMPLE_URLS={
  railCharge:new URL('../assets/audio/stage4/source/electric-charge-hum.mp3',import.meta.url).href,
  railShockwave:new URL('../assets/audio/stage4/source/electric-shockwave.mp3',import.meta.url).href,
  railDebris:new URL('../assets/audio/stage4/source/shatter-explosion.mp3',import.meta.url).href,
  missileBody:new URL('../assets/audio/stage4/source/battle-explosion.mp3',import.meta.url).href,
  missileCrack:new URL('../assets/audio/stage4/source/short-explosion.mp3',import.meta.url).href,
} as const;

type Stage4Sample=keyof typeof STAGE4_SAMPLE_URLS;

export class SoundManager{
  private context:AudioContext|null=null;private master:GainNode|null=null;private sfx:GainNode|null=null;private music:GainNode|null=null;private noiseBuffer:AudioBuffer|null=null;
  private reloadTimer:number|null=null;private reloadStep=0;private footsteps=0;private footSide=false;
  private bgmTimer:number|null=null;private bgmNextBar=0;private bgmBar=0;private bgmActive=false;
  private sampleData=new Map<Stage4Sample,Promise<ArrayBuffer|null>>();private sampleBuffers=new Map<Stage4Sample,AudioBuffer>();private sampleDecoding=new Set<Stage4Sample>();
  constructor(private sfxVolume:()=>number,private bgmVolume:()=>number){
    for(const [name,url] of Object.entries(STAGE4_SAMPLE_URLS) as [Stage4Sample,string][])this.sampleData.set(name,fetch(url).then(response=>response.ok?response.arrayBuffer():null).catch(()=>null));
  }
  private ensure(){
    if(!this.context){const AudioContextClass=window.AudioContext;this.context=new AudioContextClass();this.master=this.context.createGain();this.sfx=this.context.createGain();this.music=this.context.createGain();const compressor=this.context.createDynamicsCompressor();this.master.gain.value=1;this.sfx.gain.value=this.sfxLevel();this.music.gain.value=.0001;compressor.threshold.value=-13;compressor.knee.value=9;compressor.ratio.value=4;compressor.attack.value=.003;compressor.release.value=.18;this.sfx.connect(this.master);this.music.connect(this.master);this.master.connect(compressor).connect(this.context.destination);this.makeNoise();this.decodeStage4Samples();}
    this.sfx!.gain.setTargetAtTime(this.sfxLevel(),this.context.currentTime,.015);if(this.context.state==='suspended')void this.context.resume();return this.context;
  }
  private level(value:number){const step=Math.max(0,Math.min(10,value));return step===0?0:Math.pow(step/10,1.55)*.72;}
  private sfxLevel(){return 1.7*this.level(this.sfxVolume());}
  private bgmLevel(){return .95*this.level(this.bgmVolume());}
  refreshSfxVolume(){if(!this.context||!this.sfx)return;this.sfx.gain.setTargetAtTime(this.sfxLevel(),this.context.currentTime,.02);}
  refreshBgmVolume(){if(!this.context||!this.music||!this.bgmActive)return;this.music.gain.setTargetAtTime(Math.max(.0001,this.bgmLevel()),this.context.currentTime,.04);}
  private makeNoise(){const ctx=this.context!,length=Math.floor(ctx.sampleRate),buffer=ctx.createBuffer(1,length,ctx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<length;i++)data[i]=Math.random()*2-1;this.noiseBuffer=buffer;}
  private tone(frequency:number,endFrequency:number,duration:number,gain:number,type:OscillatorType='sine',delay=0){const ctx=this.ensure(),start=ctx.currentTime+delay,osc=ctx.createOscillator(),amp=ctx.createGain();osc.type=type;osc.frequency.setValueAtTime(Math.max(1,frequency),start);osc.frequency.exponentialRampToValueAtTime(Math.max(1,endFrequency),start+duration);amp.gain.setValueAtTime(.0001,start);amp.gain.exponentialRampToValueAtTime(gain,start+.006);amp.gain.exponentialRampToValueAtTime(.0001,start+duration);osc.connect(amp).connect(this.sfx!);osc.start(start);osc.stop(start+duration+.02);}
  private noise(duration:number,gain:number,filterFrequency:number,filterType:BiquadFilterType='lowpass',delay=0){const ctx=this.ensure(),start=ctx.currentTime+delay,source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),amp=ctx.createGain();source.buffer=this.noiseBuffer;filter.type=filterType;filter.frequency.value=filterFrequency;filter.Q.value=.7;amp.gain.setValueAtTime(.0001,start);amp.gain.exponentialRampToValueAtTime(gain,start+.004);amp.gain.exponentialRampToValueAtTime(.0001,start+duration);source.connect(filter).connect(amp).connect(this.sfx!);source.start(start);source.stop(start+duration+.02);}
  private decodeStage4Samples(){
    if(!this.context)return;const context=this.context;
    for(const [name,dataPromise] of this.sampleData){
      if(this.sampleBuffers.has(name)||this.sampleDecoding.has(name))continue;this.sampleDecoding.add(name);
      void dataPromise.then(data=>data?context.decodeAudioData(data.slice(0)):null).then(buffer=>{if(buffer)this.sampleBuffers.set(name,buffer);}).catch(()=>undefined).finally(()=>this.sampleDecoding.delete(name));
    }
  }
  private sample(name:Stage4Sample,options:{gain:number;delay?:number;duration?:number;rate?:number;endRate?:number;loop?:boolean;filterType?:BiquadFilterType;filterFrequency?:number;fadeOut?:number}){
    const ctx=this.ensure(),buffer=this.sampleBuffers.get(name);if(!buffer){this.decodeStage4Samples();return false;}
    const start=ctx.currentTime+(options.delay??0),duration=options.duration??buffer.duration/(options.rate??1),source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),amp=ctx.createGain(),rate=Math.max(.05,options.rate??1);
    source.buffer=buffer;source.loop=options.loop??false;source.playbackRate.setValueAtTime(rate,start);if(options.endRate)source.playbackRate.exponentialRampToValueAtTime(Math.max(.05,options.endRate),start+duration);
    filter.type=options.filterType??'lowpass';filter.frequency.value=options.filterFrequency??18000;filter.Q.value=.55;
    amp.gain.setValueAtTime(.0001,start);amp.gain.exponentialRampToValueAtTime(options.gain,start+.008);amp.gain.setValueAtTime(options.gain,Math.max(start+.009,start+duration-(options.fadeOut??.035)));amp.gain.exponentialRampToValueAtTime(.0001,start+duration);
    source.connect(filter).connect(amp).connect(this.sfx!);source.start(start);source.stop(start+duration+.025);return true;
  }
  private musicTone(frequency:number,endFrequency:number,duration:number,gain:number,type:OscillatorType,start:number,attack=.02){const ctx=this.context!,osc=ctx.createOscillator(),filter=ctx.createBiquadFilter(),amp=ctx.createGain();osc.type=type;osc.frequency.setValueAtTime(frequency,start);osc.frequency.exponentialRampToValueAtTime(endFrequency,start+duration);filter.type='lowpass';filter.frequency.value=2800;amp.gain.setValueAtTime(.0001,start);amp.gain.exponentialRampToValueAtTime(gain,start+attack);amp.gain.exponentialRampToValueAtTime(.0001,start+duration);osc.connect(filter).connect(amp).connect(this.music!);osc.start(start);osc.stop(start+duration+.03);}
  private musicNoise(start:number,duration:number,gain:number,frequency:number,type:BiquadFilterType){const ctx=this.context!,source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),amp=ctx.createGain();source.buffer=this.noiseBuffer;filter.type=type;filter.frequency.value=frequency;filter.Q.value=.8;amp.gain.setValueAtTime(.0001,start);amp.gain.exponentialRampToValueAtTime(gain,start+.004);amp.gain.exponentialRampToValueAtTime(.0001,start+duration);source.connect(filter).connect(amp).connect(this.music!);source.start(start);source.stop(start+duration+.02);}
  private scheduleBgmBar(start:number,index:number){
    const beat=60/104,bar=beat*4,chords=[[146.83,174.61,220],[116.54,146.83,174.61],[130.81,164.81,196],[130.81,155.56,196]],roots=[73.42,58.27,65.41,65.41],chord=chords[index%4],root=roots[index%4];
    for(const note of chord)this.musicTone(note,note*.997,bar*.97,.014,'sawtooth',start,.12);
    for(let step=0;step<8;step++){const at=start+step*beat*.5,note=chord[[0,2,1,2,0,2,1,2][step]]*(step===6?2:1);this.musicTone(note,note*.995,.19,.017,'triangle',at,.012);this.musicNoise(at,.035,.009,5400,'highpass');}
    for(const step of [0,2]){const at=start+step*beat;this.musicTone(root,root*.985,.38,.052,'triangle',at,.012);this.musicTone(72,44,.13,.05,'sine',at,.004);this.musicNoise(at,.075,.018,260,'lowpass');}
    for(const step of [1,3])this.musicNoise(start+step*beat,.085,.026,2200,'highpass');
  }
  private scheduleBgm(){if(!this.bgmActive||!this.context)return;const bar=60/104*4;while(this.bgmNextBar<this.context.currentTime+1.2){this.scheduleBgmBar(this.bgmNextBar,this.bgmBar++);this.bgmNextBar+=bar;}}
  setBgmActive(active:boolean){
    if(active===this.bgmActive)return;this.bgmActive=active;
    if(active){const ctx=this.ensure();this.music!.gain.cancelScheduledValues(ctx.currentTime);this.music!.gain.setValueAtTime(Math.max(.0001,this.music!.gain.value),ctx.currentTime);this.music!.gain.exponentialRampToValueAtTime(Math.max(.0001,this.bgmLevel()),ctx.currentTime+.28);this.bgmNextBar=ctx.currentTime+.06;this.bgmBar=0;this.scheduleBgm();this.bgmTimer=window.setInterval(()=>this.scheduleBgm(),250);return;}
    if(this.bgmTimer!==null){clearInterval(this.bgmTimer);this.bgmTimer=null;}if(this.context&&this.music){const now=this.context.currentTime;this.music.gain.cancelScheduledValues(now);this.music.gain.setValueAtTime(Math.max(.0001,this.music.gain.value),now);this.music.gain.exponentialRampToValueAtTime(.0001,now+.18);}
  }
  uiClick(){this.tone(920,620,.055,.095,'square');this.tone(1450,900,.035,.035,'sine',.012);}
  dialogueTick(index:number){if(index%2)return;this.tone(720+(index%5)*38,640+(index%3)*30,.025,.025,'square');}
  dialogueAdvance(){this.tone(520,760,.055,.06,'triangle');this.tone(980,720,.04,.025,'square',.02);}
  escape(){this.tone(430,300,.09,.09,'triangle');this.tone(260,170,.12,.07,'sine',.045);}
  rifle(){
    // A real-rifle crack and pressure wave, kept shorter and cleaner than a military sim sniper.
    this.noise(.045,.27,6500,'highpass');this.noise(.11,.36,1250,'bandpass');
    this.noise(.24,.3,320,'lowpass');this.tone(112,47,.2,.22,'sine',.004);
    this.noise(.34,.11,700,'bandpass',.055);this.tone(920,370,.035,.045,'triangle',.072);
  }
  grappleFire(){this.noise(.14,.105,2850,'highpass');this.noise(.07,.09,1650,'bandpass');this.tone(235,720,.14,.075,'triangle');this.tone(1580,690,.085,.045,'square',.018);}
  grappleAttach(){this.noise(.075,.13,2100,'bandpass');this.tone(185,108,.09,.13,'triangle');this.tone(790,500,.085,.085,'triangle',.008);this.tone(1260,820,.06,.045,'sine',.018);}
  hit(){this.tone(1550,860,.055,.11,'square');this.noise(.04,.07,4200,'bandpass');}
  playerHit(){this.noise(.13,.18,680,'lowpass');this.tone(120,74,.16,.15,'sawtooth');}
  bossRailCharge(){
    // Sample-led electrical spin-up. Procedural layers only reinforce the rising coil pitch.
    const sampled=this.sample('railCharge',{gain:.72,duration:2,rate:.66,endRate:1.52,loop:true,filterType:'highpass',filterFrequency:85,fadeOut:.07});
    this.tone(74,132,1.96,.06,'triangle');this.tone(155,1260,1.9,.03,'sawtooth',.04);
    if(!sampled)this.noise(1.82,.032,2700,'bandpass',.08);
    for(let index=0;index<7;index++){const delay=.28+index*.235,frequency=410*Math.pow(1.2,index);this.tone(frequency,frequency*1.4,.05,.014,'square',delay);}
  }
  bossRailFire(){
    // Real impact sources carry the transient and body; the sine layer supplies sci-fi sub pressure.
    const sampled=this.sample('railShockwave',{gain:.92,duration:1.18,rate:.9,filterType:'lowpass',filterFrequency:7200,fadeOut:.15});
    this.sample('railDebris',{gain:.38,delay:.025,duration:.68,rate:.78,filterType:'bandpass',filterFrequency:1750,fadeOut:.12});
    this.tone(118,29,.82,.31,'sine',.008);this.tone(430,72,.42,.11,'sawtooth',.018);
    if(!sampled){this.noise(.055,.32,6900,'highpass');this.noise(.52,.28,780,'lowpass',.018);}
  }
  bossSlamCharge(){this.tone(92,54,1.7,.14,'triangle');this.noise(1.45,.08,460,'lowpass',.08);}
  bossSlamImpact(){this.noise(.28,.42,520,'lowpass');this.noise(.16,.24,2100,'bandpass');this.tone(74,31,.55,.28,'sine');}
  bossFloorCharge(){this.tone(180,760,1.9,.1,'sawtooth');this.tone(88,190,1.8,.11,'triangle',.12);}
  bossFloorImpact(){this.noise(.42,.31,720,'lowpass');this.tone(118,36,.65,.25,'sawtooth');this.tone(520,115,.36,.09,'square',.025);}
  bossMissileLaunch(){this.noise(.13,.11,2600,'highpass');this.tone(210,640,.16,.08,'sawtooth');}
  bossMissileExplosion(){
    // Two recorded explosion sources provide the crack, debris and air movement.
    const sampled=this.sample('missileBody',{gain:.441,duration:.92,rate:1.04,filterType:'lowpass',filterFrequency:7600,fadeOut:.16});
    this.sample('missileCrack',{gain:.304,delay:.006,duration:.48,rate:.94,filterType:'highpass',filterFrequency:125,fadeOut:.08});
    this.tone(98,35,.38,.123,'sine',.01);
    if(!sampled){this.noise(.04,.206,7200,'highpass');this.noise(.3,.221,430,'lowpass',.01);}
  }
  private reloadTick(){
    const base=[205,165,235,135][this.reloadStep%4];
    this.noise(.06,.09,1750,'bandpass');this.tone(base,base*.52,.075,.12,'triangle');
    this.tone(1050,470,.04,.045,'square',.012);
    if(this.reloadStep%4===3){this.noise(.105,.08,520,'lowpass',.025);this.tone(105,62,.11,.075,'sine',.025);}
    this.reloadStep++;
  }
  setReloadActive(active:boolean){if(active){if(this.reloadTimer!==null)return;this.reloadStep=0;this.reloadTick();this.reloadTimer=window.setInterval(()=>this.reloadTick(),310);}else this.stopReload();}
  stopReload(){if(this.reloadTimer!==null){clearInterval(this.reloadTimer);this.reloadTimer=null;}this.reloadStep=0;}
  missionSuccess(){for(const [index,frequency] of [660,880,1320].entries())this.tone(frequency,frequency*1.04,.12,.105,'triangle',index*.075);}
  footstep(){this.noise(.06,.045,520,'lowpass');this.tone(this.footSide?92:82,66,.065,.035,'sine');this.footSide=!this.footSide;}
  updateFootsteps(dt:number,grounded:boolean,speed:number){if(!grounded||speed<1){this.footsteps=0;return;}this.footsteps+=dt;const interval=Math.max(.24,.48-speed*.018);if(this.footsteps>=interval){this.footsteps%=interval;this.footstep();}}
  land(impactSpeed:number){const strength=Math.min(1,Math.max(.35,impactSpeed/18));this.noise(.11,.11*strength,480,'lowpass');this.tone(105,58,.12,.075*strength,'sine');}
  failure(){
    // Shared exaggerated failure cue: impact, falling sweep and a short distorted tail. No voice asset.
    this.noise(.18,.25,720,'lowpass');this.noise(.5,.11,1850,'bandpass',.025);
    this.tone(390,72,.62,.18,'sawtooth');this.tone(145,43,.7,.2,'sine',.018);
    this.tone(690,180,.28,.075,'square',.14);
  }
}
