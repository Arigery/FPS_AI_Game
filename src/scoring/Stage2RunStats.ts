import { STAGE2 } from '../stages/Stage2Config';

export type Stage2HitType = 'SHOT' | 'MELEE' | 'HOOK';

export class Stage2RunStats {
  shotsFired = 0;
  shotsHit = 0;
  targetsDestroyed = 0;
  targetScore = 0;
  elapsedTime = 0;

  reset() {
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.targetsDestroyed = 0;
    this.targetScore = 0;
    this.elapsedTime = 0;
  }

  shot() { this.shotsFired++; }

  hit(type: Stage2HitType) {
    this.targetsDestroyed++;
    if (type === 'SHOT') this.shotsHit++;
    const score = type === 'MELEE' ? STAGE2.meleeScore : type === 'HOOK' ? STAGE2.hookScore : STAGE2.targetScore;
    this.targetScore += score;
    return score;
  }

  accuracy() { return this.shotsFired ? this.shotsHit / this.shotsFired * 100 : 0; }
  timeScore() { return this.elapsedTime < STAGE2.fastTimeLimit ? STAGE2.fastTimeScore : this.elapsedTime <= STAGE2.normalTimeLimit ? STAGE2.normalTimeScore : STAGE2.slowTimeScore; }
  totalScore() { return this.targetScore + this.timeScore(); }
}
