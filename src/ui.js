import { state } from "./state.js";
import { ctx } from "./context.js";
import { WIDTH, HEIGHT, SKILLS } from "./constants.js";

export function drawUI() {
  const player = state.player;
  const activeSkill = SKILLS[player.skillIndex] || SKILLS[0];
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(18, 16, 360, 126);
  ctx.fillStyle = "#fff";
  ctx.font = "16px monospace";
  ctx.fillText(`HP: ${Math.max(0, Math.floor(player.hp))}`, 28, 42);
  ctx.fillText(`击杀分: ${player.score}`, 28, 64);
  ctx.fillText(`招式: ${activeSkill.name} (${player.skillIndex + 1})`, 28, 86);
  ctx.fillText(`可用: ${player.skillCharges}/3`, 214, 86);
  ctx.fillText(`攻击加成: +${player.attackBonus}`, 28, 118);
  if (!activeSkill.image) {
    ctx.fillStyle = "#ffb3c1";
    ctx.fillText("技能贴图加载失败", 28, 136);
    ctx.fillStyle = "#fff";
  }

  ctx.fillStyle = "#2f445e";
  ctx.fillRect(128, 28, 150, 14);
  ctx.fillStyle = "#26d5ff";
  ctx.fillRect(128, 28, (Math.max(0, player.hp) / 100) * 150, 14);
  ctx.fillStyle = "#2f445e";
  ctx.fillRect(28, 94, 110, 10);
  ctx.fillStyle = "#7fe8ff";
  ctx.fillRect(28, 94, (player.skillEnergy / 100) * 110, 10);
  ctx.fillStyle = "#fff";
  const surviveText = `生存: ${state.elapsed.toFixed(1)}s`;
  const controlsText = "J: 普攻  K: 技能  1/2/3: 切换技能";
  const surviveX = Math.max(20, WIDTH - 24 - ctx.measureText(surviveText).width);
  const controlsX = Math.max(20, WIDTH - 24 - ctx.measureText(controlsText).width);
  ctx.fillText(surviveText, surviveX, 38);
  ctx.fillText(controlsText, controlsX, 62);

  if (state.boss) {
    const boss = state.boss;
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(WIDTH / 2 - 190, 14, 380, 32);
    ctx.fillStyle = "#fff";
    ctx.font = "14px monospace";
    ctx.fillText(`下弦之鬼·阶段 ${boss.phase}`, WIDTH / 2 - 178, 36);
    ctx.fillStyle = "#443246";
    ctx.fillRect(WIDTH / 2 - 20, 22, 190, 14);
    ctx.fillStyle = "#ff6e93";
    ctx.fillRect(WIDTH / 2 - 20, 22, (boss.hp / boss.hpMax) * 190, 14);
  }

  if (state.gameOver) {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = "#fff";
    ctx.font = "36px monospace";
    ctx.fillText("战斗结束", WIDTH / 2 - 110, HEIGHT / 2 - 20);
    ctx.font = "18px monospace";
    ctx.fillText(`最终生存: ${state.elapsed.toFixed(1)}s`, WIDTH / 2 - 105, HEIGHT / 2 + 16);
    ctx.fillText("按 R 重新开始", WIDTH / 2 - 88, HEIGHT / 2 + 50);
  }
}
