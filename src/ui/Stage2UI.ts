import { Stage2RunStats } from '../scoring/Stage2RunStats';
export const formatStageTime=(seconds:number)=>{const ms=Math.max(0,Math.floor(seconds*1000)),m=Math.floor(ms/60000),s=Math.floor(ms%60000/1000),r=ms%1000;return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(r).padStart(3,'0')}`;};
export class Stage2UI{
  intro=document.createElement('div');hud=document.createElement('section');result=document.createElement('div');feedback=document.createElement('div');fade=document.createElement('div');feedbackTimer:number|null=null;
  constructor(){
    this.intro.id='stage2-intro';this.intro.innerHTML='<section><small>TIME ATTACK</small><h1>STAGE 2</h1><p>과녁을 처치하며 목적지까지<br>최대한 빠르게 도달하세요.</p><p class="sub">과녁을 10개 이상 처치한 뒤 그린존에 도달해야 합니다.</p><button id="stage2-start">클릭하여 게임 시작</button><button id="stage2-intro-back" class="secondary">스테이지 선택으로</button></section>';
    this.hud.id='stage2-hud';this.result.id='stage2-result';this.feedback.id='score-feedback';this.fade.id='respawn-fade';document.body.append(this.intro,this.hud,this.result,this.feedback,this.fade);this.hideAll();
  }
  bind(start:()=>void,retry:()=>void,back:()=>void,next:()=>void){this.intro.querySelector('#stage2-start')!.addEventListener('click',start);this.intro.querySelector('#stage2-intro-back')!.addEventListener('click',back);this.result.addEventListener('click',e=>{const id=(e.target as HTMLElement).id;if(id==='stage2-retry')retry();if(id==='stage2-back')back();if(id==='stage2-next')next();});}
  showIntro(){this.hideAll();this.intro.style.display='grid';}
  showHUD(){this.intro.style.display='none';this.result.style.display='none';this.hud.style.display='block';}
  updateHUD(elapsed:number,kills:number,score:number){this.hud.innerHTML=`<strong>${formatStageTime(elapsed)}</strong><span>처치한 과녁 ${kills} / 20</span><span>과녁 점수 ${score}</span>`;}
  showResult(stats:Stage2RunStats){this.hideAll();this.result.style.display='grid';this.result.innerHTML=`<section><small>RUN COMPLETE</small><h1>STAGE 2 CLEAR</h1><div class="result-grid"><span>전체 점수</span><b>${stats.totalScore()}점</b><span>소요 시간</span><b>${formatStageTime(stats.elapsedTime)}</b><span>명중률</span><b>${stats.accuracy().toFixed(1)}%</b><hr><hr><span>과녁 점수</span><b>${stats.targetScore}점</b><span>시간 점수</span><b>${stats.timeScore()}점</b><span>처치한 과녁</span><b>${stats.targetsDestroyed} / 20</b></div><div class="result-buttons"><button id="stage2-retry">다시 도전</button><button id="stage2-next">다음 스테이지로</button><button id="stage2-back" class="secondary">스테이지 선택으로</button></div></section>`;}
  showFeedback(text:string,duration:number){if(this.feedbackTimer!==null)clearTimeout(this.feedbackTimer);this.feedback.textContent=text;this.feedback.style.display='block';this.feedback.classList.remove('pop');void this.feedback.offsetWidth;this.feedback.classList.add('pop');this.feedbackTimer=window.setTimeout(()=>{this.feedback.style.display='none';this.feedbackTimer=null;},duration);}
  score(text:string){this.showFeedback(text,700);}
  notice(text:string){this.showFeedback(text,1500);}
  respawn(){this.fade.classList.add('active');setTimeout(()=>this.fade.classList.remove('active'),320);}
  hideAll(){this.intro.style.display=this.hud.style.display=this.result.style.display=this.feedback.style.display='none';}
}
