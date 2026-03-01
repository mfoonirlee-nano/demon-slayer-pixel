import { GROUND_Y, WIDTH } from "./constants.js";

export const state = {
  elapsed: 0,
  last: 0,
  spawnTimer: 0,
  bossSpawnTimer: 28,
  platformSpawnTimer: 0,
  gameOver: false,
  boss: null,
  moonBloodLerp: 0,
  spritesReady: false,
  
  // Entities
  player: {
    x: 140,
    y: GROUND_Y - 56,
    w: 34,
    h: 56,
    vx: 0,
    vy: 0,
    speed: 4,
    jump: 14,
    facing: 1,
    hp: 100,
    invincible: 0,
    attackTimer: 0,
    score: 0,
    attackBonus: 0,
    skillEnergy: 100,
    skillCharges: 3,
    skillIndex: 0,
    skillTimer: 0,
    onPlatform: null,
    skillFlash: 0,
    isPlayer: true // Helper for onGround check
  },
  enemies: [],
  particles: [],
  projectiles: [],
  platforms: [],
  skillBursts: [],
  hitBursts: [],
  crystals: [],
};

export function resetState() {
  state.player.x = 140;
  state.player.y = GROUND_Y - state.player.h;
  state.player.vx = 0;
  state.player.vy = 0;
  state.player.hp = 100;
  state.player.score = 0;
  state.player.attackTimer = 0;
  state.player.attackBonus = 0;
  state.player.invincible = 0;
  state.player.skillEnergy = 100;
  state.player.skillCharges = 3;
  state.player.skillIndex = 0;
  state.player.skillTimer = 0;
  state.player.onPlatform = null;
  state.player.skillFlash = 0;
  
  state.enemies.length = 0;
  state.platforms.length = 0;
  state.crystals.length = 0;
  state.particles.length = 0;
  state.skillBursts.length = 0;
  state.hitBursts.length = 0;
  state.projectiles.length = 0;
  
  state.elapsed = 0;
  state.spawnTimer = 0;
  state.bossSpawnTimer = 28;
  state.platformSpawnTimer = 0;
  state.boss = null;
  state.gameOver = false;
  state.moonBloodLerp = 0;
  state.last = 0;
}
