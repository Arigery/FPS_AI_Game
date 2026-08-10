import { GameProgress,GameSettings,saveSettings,type Stage2Record,type Stage3Record } from '../core/Persistence';
import { isStage2Unlocked,isStage3Unlocked,isStage4Unlocked } from '../core/ProgressionConfig';

export interface MenuActions { tutorial:()=>void; stage:(stage:2|3|4)=>void; }

const formatTime=(seconds:number)=>{const ms=Math.max(0,Math.floor(seconds*1000)),m=Math.floor(ms/60000),s=Math.floor(ms%60000/1000),r=ms%1000;return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(r).padStart(3,'0')}`;};
const value=(record:{legacy?:boolean},content:string|number)=>record.legacy?'—':content;

export class MenuUI {
  root=document.createElement('div');settings:GameSettings;progress:GameProgress;
  constructor(settings:GameSettings,progress:GameProgress,private actions:MenuActions){this.settings=settings;this.progress=progress;this.root.id='menu-root';document.body.append(this.root);this.showMain();}
  panel(title:string,body:string){this.root.style.display='grid';this.root.innerHTML=`<section class="menu-panel"><h1>${title}</h1>${body}</section>`;}
  bindBack(selector='.back'){this.root.querySelector(selector)?.addEventListener('click',()=>this.showMain());}
  showMain(){this.panel('HYPER FPS','<div class="menu-buttons"><button id="play">게임 시작</button><button id="options">옵션</button><button id="scores">점수 확인</button></div>');this.root.querySelector('#play')!.addEventListener('click',()=>this.showStages());this.root.querySelector('#options')!.addEventListener('click',()=>this.showOptions());this.root.querySelector('#scores')!.addEventListener('click',()=>this.showScores());}
  showStages(){
    const tutorialDone=this.progress.tutorialComplete,stage2Open=isStage2Unlocked(this.progress),stage3Open=isStage3Unlocked(this.progress),stage4Open=isStage4Unlocked(this.progress);
    this.panel('스테이지 선택',`<div class="stage-grid"><button id="tutorial" class="stage-card"><b>튜토리얼</b><span>기초 전투 및 그래플 훈련</span><em>${tutorialDone?'완료':'필수'}</em></button><button id="stage2" class="stage-card" ${stage2Open?'':'disabled'}><b>STAGE 2</b><span>이동 · 사격 타임어택</span><em>${stage2Open?'해금됨':'튜토리얼 완료 필요'}</em></button><button id="stage3" class="stage-card" ${stage3Open?'':'disabled'}><b>STAGE 3</b><span>기동형 공성 방어 · 3분</span><em>${stage3Open?'해금됨':'STAGE 2 완료 필요'}</em></button><button id="stage4" class="stage-card" ${stage4Open?'':'disabled'}><b>STAGE 4</b><span>거대 병기 보스전</span><em>${stage4Open?'해금됨':'STAGE 3 완료 필요'}</em></button></div><button class="back secondary">돌아가기</button>`);
    this.root.querySelector('#tutorial')!.addEventListener('click',this.actions.tutorial);if(stage2Open)this.root.querySelector('#stage2')!.addEventListener('click',()=>this.actions.stage(2));if(stage3Open)this.root.querySelector('#stage3')!.addEventListener('click',()=>this.actions.stage(3));if(stage4Open)this.root.querySelector('#stage4')!.addEventListener('click',()=>this.actions.stage(4));this.bindBack();
  }
  slider(key:keyof GameSettings,label:string){const value=this.settings[key],min=key==='sfx'||key==='bgm'?1:0;return `<label class="setting"><span>${label}</span><input data-key="${key}" type="range" min="${min}" max="10" step="1" value="${value}"><output>${value}</output><small>${min}</small><small>10</small></label>`;}
  showOptions(){this.panel('옵션',`<div class="settings">${this.slider('sfx','효과음 · UI')}${this.slider('bgm','BGM')}${this.slider('mouse','마우스 감도')}${this.slider('zoomMouse','줌 마우스 감도')}</div><button class="back secondary">저장하고 돌아가기</button>`);this.root.querySelectorAll<HTMLInputElement>('input[type=range]').forEach(input=>input.addEventListener('input',()=>{const key=input.dataset.key as keyof GameSettings;this.settings[key]=Number(input.value);input.parentElement!.querySelector('output')!.value=input.value;saveSettings(this.settings);}));this.bindBack();}
  showScores(){this.panel('점수 확인','<div class="score-stage-select"><button id="score-stage2"><b>STAGE 2</b><span>타임어택 상위 10개 기록</span></button><button id="score-stage3"><b>STAGE 3</b><span>공성 방어 상위 10개 기록</span></button></div><p class="score-note">상위 10개 기록을 점수 오름차순으로 표시합니다.</p><button class="back secondary">돌아가기</button>');this.root.querySelector('#score-stage2')!.addEventListener('click',()=>this.showLeaderboard(2));this.root.querySelector('#score-stage3')!.addEventListener('click',()=>this.showLeaderboard(3));this.bindBack();}
  stage2Rows(records:Stage2Record[]){return records.map((record,index)=>`<tr><td>${index+1}</td><td>${record.score.toLocaleString()}</td><td>${value(record,formatTime(record.clearTime))}</td><td>${value(record,record.kills)}</td><td>${value(record,`${record.accuracy.toFixed(1)}%`)}</td><td>${value(record,record.shotsFired)}</td></tr>`).join('');}
  stage3Rows(records:Stage3Record[]){return records.map((record,index)=>`<tr><td>${index+1}</td><td>${record.score.toLocaleString()}</td><td>${value(record,record.kills)}</td><td>${value(record,`${record.accuracy.toFixed(1)}%`)}</td><td>${value(record,record.siegeKills)}</td><td>${value(record,Math.ceil(record.crystalHP))}</td></tr>`).join('');}
  showLeaderboard(stage:2|3){
    const records=stage===2?[...this.progress.stage2Records].sort((a,b)=>a.score-b.score||a.clearTime-b.clearTime):[...this.progress.stage3Records].sort((a,b)=>a.score-b.score||a.kills-b.kills);
    const headers=stage===2?'<th>#</th><th>점수</th><th>클리어 시간</th><th>처치</th><th>명중률</th><th>사격 수</th>':'<th>#</th><th>점수</th><th>처치</th><th>명중률</th><th>공성병 처치</th><th>크리스탈 HP</th>';
    const rows=stage===2?this.stage2Rows(records as Stage2Record[]):this.stage3Rows(records as Stage3Record[]),content=records.length?`<div class="leaderboard-wrap"><table class="leaderboard"><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table></div>`:'<div class="empty-records">아직 저장된 클리어 기록이 없습니다.</div>';
    this.panel(`STAGE ${stage} 기록`,`${content}<button id="score-stage-back" class="secondary">스테이지 기록 선택으로</button><button class="back secondary">메인 메뉴로</button>`);this.root.querySelector('#score-stage-back')!.addEventListener('click',()=>this.showScores());this.bindBack();
  }
  hide(){this.root.style.display='none';}
  showThanks(confirm:()=>void){this.panel('\ud6c8\ub828 \uc644\ub8cc','<div class="thanks-message"><small>THANK YOU FOR PLAYING</small><p>Hyper FPS\ub97c \ud50c\ub808\uc774\ud574\uc8fc\uc154\uc11c \uac10\uc0ac\ud569\ub2c8\ub2e4</p><b>\uac1c\ubc1c\uc790 : Nick_Hong</b><small>TO BE CONTINUED...</small></div><button id="thanks-confirm">\ud655\uc778</button>');this.root.querySelector('#thanks-confirm')!.addEventListener('click',confirm);}
  showStageMessage(stage:2|3|4){this.panel(`STAGE ${stage}`,`<p class="coming-soon">스테이지가 해금되었습니다.</p><button id="stage-back" class="secondary">스테이지 선택으로</button>`);this.root.querySelector('#stage-back')!.addEventListener('click',()=>this.showStages());}
  refreshProgress(progress:GameProgress){this.progress=progress;}
}
