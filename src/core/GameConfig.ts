export const CFG = {
  moveSpeed: 8, groundAccel: 20, groundDecel: 35, airAccel: 5, airDecel: 5,
  gravity: -20, maxFall: -35, jumpHeight: 1.5, autoHopHeight: 1,
  playerRadius: .38, playerHeight: 1.8, eyeHeight: 1.62, mouseSensitivity: .00144,
  grappleRange: 25, hookSpeed: 70, pullMinSpeed: 10, pullMaxSpeed: 30, pullAccel: 50, pullCancelDelay: .05, arrival: .75, arrivalHold: .2,
  grappleReleaseAscentGravityMultiplier: 1.5,
  zoomDuration: .2, zoomMagnification: 2.5, fireInterval: .5, magazine: 10, reload: 1.5,
  tracerLifetime: .8, meleeRange: 1.8, meleeAngle: 90, meleeDuration: .5,
  meleeHitStart: .15, meleeHitWindow: .1
} as const;

export const DISPLAY = {
  width: 1280,
  height: 720,
  aspect: 16 / 9
} as const;
