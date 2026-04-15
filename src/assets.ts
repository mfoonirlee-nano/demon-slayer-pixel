import {
  PLAYER_SHEETS,
  ENEMY_SHEETS,
  BOSS_SHEET,
  SKILLS,
} from "./constants";
import { loadImage } from "./utils";
import { state } from "./state";

export async function loadSprites() {
  const jobs: Array<Promise<void>> = [];
  for (const sheet of Object.values(PLAYER_SHEETS)) {
    jobs.push(loadImage(sheet.src).then((img) => {
      sheet.image = img;
    }));
  }
  for (const sheet of ENEMY_SHEETS) {
    jobs.push(loadImage(sheet.src).then((img) => {
      sheet.image = img;
    }));
  }
  jobs.push(loadImage(BOSS_SHEET.src).then((img) => {
    BOSS_SHEET.image = img;
  }));
  for (const skill of SKILLS) {
    jobs.push(loadImage(skill.src).then((img) => {
      skill.image = img;
    }));
  }
  await Promise.all(jobs);
  state.spritesReady = true;
}
