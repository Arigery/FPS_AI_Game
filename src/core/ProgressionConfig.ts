export const PROGRESSION = {
  // Set either requirement to false when you want that stage permanently unlocked.
  stage2RequiresTutorial: true,
  stage3RequiresStage2Clear: true,
  stage4RequiresStage3Clear: true,
  leaderboardLimit: 10,
  stage3Score: {
    siegeKill: 10,
    escortKill: 5,
    crystalHpPerPoint: 10,
  },
} as const;

export type UnlockProgress = { tutorialComplete: boolean; stage2Complete: boolean; stage3Complete: boolean };
export const isStage2Unlocked = (progress: UnlockProgress) => !PROGRESSION.stage2RequiresTutorial || progress.tutorialComplete;
export const isStage3Unlocked = (progress: UnlockProgress) => !PROGRESSION.stage3RequiresStage2Clear || progress.stage2Complete;
export const isStage4Unlocked = (progress: UnlockProgress) => !PROGRESSION.stage4RequiresStage3Clear || progress.stage3Complete;
