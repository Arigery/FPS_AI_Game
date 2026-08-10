import { STAGE3 } from '../stages/Stage3Config';

const time=(seconds:number)=>{const ms=Math.max(0,Math.floor(seconds*1000)),m=Math.floor(ms/60000),s=Math.floor(ms%60000/1000),r=ms%1000;return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(r).padStart(3,'0')}`;};
export type Stage3Threat={name:string;state:string;distance:number;direction:string};
export type Stage3ScreenMarker={id:string;label:string;x:number;y:number;offscreen:boolean;state:'WARNING'|'ACTIVE';distance:number};
export type Stage3HUDState={
  remaining:number;crystalHP:number;playerHP:number;regen:boolean;siegeKills:number;escortKills:number;
  activeThreats:Stage3Threat[];nextThreat?:{name:string;seconds:number;distance:number;direction:string};huntingEscorts:number;markers:Stage3ScreenMarker[];
};
export type Stage3Result={clear:boolean;reason:'CLEAR'|'PLAYER'|'CRYSTAL';remaining:number;crystalHP:number;playerHP:number;kills:number;siegeKills:number;escortKills:number;score:number;accuracy:number;shotsFired:number};

export class Stage3UI{
  intro=document.createElement('div');hud=document.createElement('div');result=document.createElement('div');
  constructor(){
    this.intro.id='stage3-intro';
    this.intro.innerHTML='<section><small>MOBILE SIEGE DEFENSE</small><h1>STAGE 3</h1><p><b>3분 동안 6개의 연결된 크리스탈을 방어하세요.</b></p><p>각 크리스탈은 하나의 200 HP를 공유합니다.<br>갈고리로 빠르게 이동하여 공성병을 우선 제거하세요.</p><p class="stage3-intro-note">공성병이 쓰러져도 남은 호위병은 계속 플레이어를 추격합니다.</p><button id="stage3-start">클릭하여 게임 시작</button><button id="stage3-intro-back" class="secondary">스테이지 선택으로</button></section>';
    this.hud.id='stage3-hud';this.result.id='stage3-result';document.body.append(this.intro,this.hud,this.result);this.hideAll();
  }
  bind(start:()=>void,retry:()=>void,back:()=>void,next:()=>void){
    this.intro.querySelector('#stage3-start')!.addEventListener('click',start);this.intro.querySelector('#stage3-intro-back')!.addEventListener('click',back);
    this.result.addEventListener('click',event=>{const id=(event.target as HTMLElement).id;if(id==='stage3-retry')retry();if(id==='stage3-back')back();if(id==='stage3-next')next();});
  }
  showIntro(){this.hideAll();this.intro.style.display='grid';}
  showHUD(){this.intro.style.display='none';this.result.style.display='none';this.hud.style.display='block';}
  update(value:Stage3HUDState){
    const crystalRatio=Math.max(0,value.crystalHP/STAGE3.crystalMaxHP*100),playerRatio=Math.max(0,value.playerHP/STAGE3.playerMaxHP*100);
    const active=value.activeThreats.map(threat=>`<div class="stage3-threat active"><b>${threat.direction} ${threat.name}</b><span>${threat.state}</span><small>${threat.distance.toFixed(0)} m</small></div>`).join('');
    const next=value.nextThreat?`<div class="stage3-threat next"><b>${value.nextThreat.direction} 다음 위협: ${value.nextThreat.name}</b><span>${value.nextThreat.seconds.toFixed(1)}초 후 활성화</span><small>${value.nextThreat.distance.toFixed(0)} m</small></div>`:'';
    const hunters=value.huntingEscorts?`<div class="stage3-hunters">추격 중인 호위병 ${value.huntingEscorts}명</div>`:'';
    const markers=value.markers.map(marker=>`<div class="stage3-screen-marker ${marker.state.toLowerCase()} ${marker.offscreen?'offscreen':''}" style="left:${marker.x}%;top:${marker.y}%"><i></i><b>${marker.label}<small>${marker.distance.toFixed(0)} m</small></b></div>`).join('');
    this.hud.innerHTML=`<div class="stage3-top ${value.remaining<=30?'urgent':''}"><strong>${time(value.remaining)}</strong><span>공유 크리스탈 체력</span><div class="crystal-bar ${crystalRatio<=30?'low':''}"><i style="width:${crystalRatio}%"></i><b>${Math.ceil(value.crystalHP)} / ${STAGE3.crystalMaxHP}</b></div><small>공성병 ${value.siegeKills} · 호위병 ${value.escortKills}</small></div><div class="stage3-screen-marker-layer">${markers}</div><div class="stage3-threat-list">${active}${next}${hunters}</div><div class="player-health ${value.playerHP<=25?'low':''}"><b>HP ${Math.ceil(value.playerHP)} / ${STAGE3.playerMaxHP}</b><div><i style="width:${playerRatio}%"></i></div><small>${value.regen?'자동 회복 중':'PLAYER VITALS'}</small></div>`;
  }
  showResult(value:Stage3Result){
    this.hideAll();this.result.style.display='grid';
    const message=value.clear?'크리스탈 방어 성공':value.reason==='CRYSTAL'?'크리스탈이 파괴되었습니다.':'플레이어가 쓰러졌습니다.';
    this.result.innerHTML=`<section><small>${value.clear?'DEFENSE COMPLETE':'MISSION FAILED'}</small><h1>STAGE 3 ${value.clear?'CLEAR':'FAILED'}</h1><p>${message}</p><div class="result-grid">${value.clear?`<span>남은 크리스탈 체력</span><b>${Math.ceil(value.crystalHP)} / ${STAGE3.crystalMaxHP}</b><span>남은 플레이어 체력</span><b>${Math.ceil(value.playerHP)} / ${STAGE3.playerMaxHP}</b>`:`<span>남은 시간</span><b>${time(value.remaining)}</b>`}<span>처치한 공성병</span><b>${value.siegeKills}</b><span>처치한 호위병</span><b>${value.escortKills}</b><span>총 처치</span><b>${value.kills}</b></div><div class="result-buttons"><button id="stage3-retry">다시 도전</button>${value.clear?'<button id="stage3-next">다음 스테이지로</button>':''}<button id="stage3-back" class="secondary">스테이지 선택으로</button></div></section>`;
  }
  hideAll(){this.intro.style.display=this.hud.style.display=this.result.style.display='none';}
}
