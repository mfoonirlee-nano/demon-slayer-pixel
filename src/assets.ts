import {
  PLAYER_SHEETS,
  ENEMY_SHEETS,
  RUNNER_SHEETS,
  BRUTE_SHEETS,
  BOSS_SHEET,
  BOSS_SKILL1_SHEET,
  BOSS_SKILL1_EFFECT_SHEET,
  SKILLS,
  SKILL1_EFFECT_SHEET,
  SKILL2_EFFECT_SHEET,
  SKILL3_EFFECT_SHEET,
  ULTIMATE_SKILL_SHEET,
  ULTIMATE_SKILL_EFFECT_SHEET,
  SKY_SPRITES,
  CLOUD_SPRITES,
  TREE_SPRITES,
  STONE_TOWER_SPRITES,
  STONE_TOWER_SMALL_SPRITES,
  TORII_SPRITES,
  MOUNTAIN_SPRITES,
  GROUND_TILE_SPRITES,
  PLATFORM_SPRITES,
} from "./constants";
import { loadImage } from "./utils";
import { state } from "./state";

let loadTask: Promise<void> | null = null;

export function loadSprites(): Promise<void> {
  if (loadTask) return loadTask;

  const jobs: Array<Promise<void>> = [];
  for (const sheet of Object.values(PLAYER_SHEETS)) {
    jobs.push(loadImage(sheet.src).then((img) => { sheet.image = img; }));
  }
  for (const sheet of ENEMY_SHEETS) {
    jobs.push(loadImage(sheet.src).then((img) => { sheet.image = img; }));
  }
  for (const sheet of Object.values(RUNNER_SHEETS)) {
    if (ENEMY_SHEETS.includes(sheet)) continue;
    jobs.push(loadImage(sheet.src).then((img) => { sheet.image = img; }));
  }
  for (const sheet of Object.values(BRUTE_SHEETS)) {
    if (ENEMY_SHEETS.includes(sheet)) continue;
    jobs.push(loadImage(sheet.src).then((img) => { sheet.image = img; }));
  }
  jobs.push(loadImage(BOSS_SHEET.src).then((img) => { BOSS_SHEET.image = img; }));
  jobs.push(loadImage(BOSS_SKILL1_SHEET.src).then((img) => { BOSS_SKILL1_SHEET.image = img; }));
  jobs.push(loadImage(BOSS_SKILL1_EFFECT_SHEET.src).then((img) => { BOSS_SKILL1_EFFECT_SHEET.image = img; }));
  jobs.push(loadImage(SKY_SPRITES.src).then((img) => { SKY_SPRITES.image = img; }));
  jobs.push(loadImage(CLOUD_SPRITES.big.src).then((img) => { CLOUD_SPRITES.big.image = img; }));
  jobs.push(loadImage(CLOUD_SPRITES.small.src).then((img) => { CLOUD_SPRITES.small.image = img; }));
  for (const sheet of TREE_SPRITES.sheets) {
    jobs.push(loadImage(sheet.src).then((img) => { sheet.image = img; }));
  }
  jobs.push(loadImage(STONE_TOWER_SPRITES.src).then((img) => { STONE_TOWER_SPRITES.image = img; }));
  jobs.push(loadImage(STONE_TOWER_SMALL_SPRITES.src).then((img) => { STONE_TOWER_SMALL_SPRITES.image = img; }));
  jobs.push(loadImage(TORII_SPRITES.src).then((img) => { TORII_SPRITES.image = img; }));
  jobs.push(loadImage(MOUNTAIN_SPRITES.src).then((img) => { MOUNTAIN_SPRITES.image = img; }));
  jobs.push(loadImage(GROUND_TILE_SPRITES.grass.src).then((img) => { GROUND_TILE_SPRITES.grass.image = img; }));
  jobs.push(loadImage(GROUND_TILE_SPRITES.stone.src).then((img) => { GROUND_TILE_SPRITES.stone.image = img; }));
  jobs.push(loadImage(PLATFORM_SPRITES.src).then((img) => { PLATFORM_SPRITES.image = img; }));
  jobs.push(loadImage(SKILL1_EFFECT_SHEET.src).then((img) => { SKILL1_EFFECT_SHEET.image = img; }));
  jobs.push(loadImage(SKILL2_EFFECT_SHEET.src).then((img) => { SKILL2_EFFECT_SHEET.image = img; }));
  jobs.push(loadImage(SKILL3_EFFECT_SHEET.src).then((img) => { SKILL3_EFFECT_SHEET.image = img; }));
  jobs.push(loadImage(ULTIMATE_SKILL_SHEET.src).then((img) => { ULTIMATE_SKILL_SHEET.image = img; }));
  jobs.push(loadImage(ULTIMATE_SKILL_EFFECT_SHEET.src).then((img) => { ULTIMATE_SKILL_EFFECT_SHEET.image = img; }));
  for (const skill of SKILLS) {
    jobs.push(loadImage(skill.src).then((img) => { skill.image = img; }));
  }

  loadTask = Promise.all(jobs).then(() => {
    console.log('[assets] all sprites loaded, setting spritesReady=true');
    state.spritesReady = true;
  });
  return loadTask;
}
