import {
  PLAYER_SHEETS,
  ENEMY_SHEETS,
  BOSS_SHEET,
  SKILLS,
  SKILL1_EFFECT_SHEET,
  SKILL2_EFFECT_SHEET,
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
  jobs.push(loadImage(BOSS_SHEET.src).then((img) => { BOSS_SHEET.image = img; }));
  jobs.push(loadImage(SKILL1_EFFECT_SHEET.src).then((img) => { SKILL1_EFFECT_SHEET.image = img; }));
  jobs.push(loadImage(SKILL2_EFFECT_SHEET.src).then((img) => { SKILL2_EFFECT_SHEET.image = img; }));
  for (const skill of SKILLS) {
    jobs.push(loadImage(skill.src).then((img) => { skill.image = img; }));
  }

  loadTask = Promise.all(jobs).then(() => {
    console.log('[assets] all sprites loaded, setting spritesReady=true');
    state.spritesReady = true;
  });
  return loadTask;
}
