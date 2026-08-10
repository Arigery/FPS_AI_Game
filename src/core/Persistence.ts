export interface GameSettings { sfx:number; bgm:number; mouse:number; zoomMouse:number; }
export interface Stage2Record { score:number; clearTime:number; kills:number; accuracy:number; shotsFired:number; legacy?:boolean; }
export interface Stage3Record { score:number; kills:number; accuracy:number; siegeKills:number; crystalHP:number; shotsFired:number; legacy?:boolean; }
export interface GameProgress {
  tutorialComplete:boolean;stage2Complete:boolean;stage3Complete:boolean;stage4Complete:boolean;stage3ThanksShown:boolean;stage2Score:number;stage3Score:number;
  stage2Records:Stage2Record[];stage3Records:Stage3Record[];
}

import { PROGRESSION } from './ProgressionConfig';

const SETTINGS_KEY='hyper_fps_settings_v1';
const LEGACY_PROGRESS_KEYS=['hyper_fps_progress_v1'] as const;
const PROGRESS_KEY='hyper_fps_progress_v2';
export const DEFAULT_SETTINGS:GameSettings={sfx:7,bgm:7,mouse:7,zoomMouse:7};
export const DEFAULT_PROGRESS:GameProgress={tutorialComplete:false,stage2Complete:false,stage3Complete:false,stage4Complete:false,stage3ThanksShown:false,stage2Score:0,stage3Score:0,stage2Records:[],stage3Records:[]};

function read<T>(key:string,fallback:T):T{try{return {...fallback,...JSON.parse(localStorage.getItem(key)??'{}')}}catch{return {...fallback}}}
export const loadSettings=()=>{try{const stored=JSON.parse(localStorage.getItem(SETTINGS_KEY)??'{}') as Partial<GameSettings>&{sound?:number};const {sound,...current}=stored,legacy=sound??7;return {...DEFAULT_SETTINGS,...current,sfx:current.sfx??legacy,bgm:current.bgm??legacy};}catch{return {...DEFAULT_SETTINGS}}};
export const saveSettings=(value:GameSettings)=>localStorage.setItem(SETTINGS_KEY,JSON.stringify(value));
export const loadProgress=()=>{
  for(const key of LEGACY_PROGRESS_KEYS)localStorage.removeItem(key);
  const value=read(PROGRESS_KEY,DEFAULT_PROGRESS),stage2Records=Array.isArray(value.stage2Records)?value.stage2Records:[],stage3Records=Array.isArray(value.stage3Records)?value.stage3Records:[];
  // Old saves only had one best score. Preserve unlocks and show that score without inventing unavailable stats.
  if(!stage2Records.length&&value.stage2Score>0)stage2Records.push({score:value.stage2Score,clearTime:0,kills:0,accuracy:0,shotsFired:0,legacy:true});
  if(!stage3Records.length&&value.stage3Score>0)stage3Records.push({score:value.stage3Score,kills:0,accuracy:0,siegeKills:0,crystalHP:0,shotsFired:0,legacy:true});
  return {...value,stage2Complete:value.stage2Complete||value.stage2Score>0,stage3Complete:value.stage3Complete||value.stage3Score>0,stage4Complete:value.stage4Complete??false,stage3ThanksShown:value.stage3ThanksShown??false,stage2Records,stage3Records};
};
export const saveProgress=(value:GameProgress)=>localStorage.setItem(PROGRESS_KEY,JSON.stringify(value));
const topTen=<T extends {score:number}>(records:T[],tieBreak:(a:T,b:T)=>number)=>[...records].sort((a,b)=>b.score-a.score||tieBreak(a,b)).slice(0,PROGRESSION.leaderboardLimit);
export const addStage2Record=(progress:GameProgress,record:Stage2Record)=>{progress.stage2Complete=true;progress.stage2Score=Math.max(progress.stage2Score,record.score);progress.stage2Records=topTen([...progress.stage2Records,record],(a,b)=>a.clearTime-b.clearTime);saveProgress(progress);};
export const addStage3Record=(progress:GameProgress,record:Stage3Record)=>{progress.stage3Complete=true;progress.stage3Score=Math.max(progress.stage3Score,record.score);progress.stage3Records=topTen([...progress.stage3Records,record],(a,b)=>b.kills-a.kills);saveProgress(progress);};
export const completeStage4=(progress:GameProgress)=>{progress.stage4Complete=true;saveProgress(progress);};

// 0-10 steps. Mouse level 7 preserves the previous baseline; the total span is about 1.3x wider.
export const MOUSE_SENSITIVITY=[.00033,.00049,.00065,.00081,.00096,.00112,.00128,.00144,.0017,.00196,.00222] as const;
// Zoom level 7 is 1.2x the previous level-7 value, with an approximately 1.3x wider total span.
export const ZOOM_SENSITIVITY=[.36,.48,.6,.72,.84,.96,1.08,1.2,1.29,1.38,1.465] as const;
