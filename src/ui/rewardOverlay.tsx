import { useEffect } from "react";
import { chooseBossEquipment, chooseUpgradeReward } from "../game/runtime";
import type { GameSnapshot } from "../game/gameStore";
import type { EquipmentItemState } from "../types/game-state";
import { EQUIPMENT_SLOT_LABELS } from "./uiDisplay";
import { UiSprite } from "./uiSprite";

export function RewardOverlay({ snapshot }: { snapshot: GameSnapshot }) {
  const isBossReward = snapshot.activeOverlay === "bossEquipment";
  const choices = isBossReward ? snapshot.pendingEquipmentChoices : snapshot.pendingUpgradeChoices;
  const panelSprite = isBossReward ? "bossRewardPanel" : "upgradeRewardPanel";
  const cardSprite = isBossReward ? "bossChoiceCard" : "upgradeChoiceCard";
  const activeCardSprite = isBossReward ? "bossChoiceCardActive" : "upgradeChoiceCardActive";
  const title = isBossReward ? "血鬼遗物" : "等级提升";
  const subtitle = isBossReward
    ? "选择一件装备"
    : `Lv.${snapshot.player.runLevel - 1} -> Lv.${snapshot.player.runLevel}  选择一项强化`;

  useEffect(() => {
    const handleRewardKey = (event: KeyboardEvent) => {
      const key = event.key;
      if (key !== "1" && key !== "2" && key !== "3") return;
      const index = Number(key) - 1;
      if (!choices[index]) return;
      event.preventDefault();
      event.stopPropagation();
      if (isBossReward) {
        chooseBossEquipment(index);
      } else {
        chooseUpgradeReward(index);
      }
    };

    window.addEventListener("keydown", handleRewardKey, { capture: true });
    return () => window.removeEventListener("keydown", handleRewardKey, { capture: true });
  }, [choices, isBossReward]);

  return (
    <div className="absolute inset-0 z-40 flex itemsp-center justify-center bg-[rgba(4,7,16,0.78)] px-4 text-white">
      <UiSprite id={panelSprite} width={860} height={356} className="relative">
        <div className="absolute inset-[34px] flex flex-col">
          <div className="text-center">
            <div className={`text-[15px] font-bold ${isBossReward ? "text-[#ffd46e]" : "text-[#26d5ff]"}`}>{title}</div>
            <div className="mt-2 text-[10px] text-[#c8efff]">{subtitle}</div>
          </div>

          <div className="mt-6 grid flex-1 grid-cols-3 gap-4">
            {choices.map((choice, index) => {
              const item = isBossReward ? choice as EquipmentItemState : null;
              const upgrade = isBossReward ? null : choice as typeof snapshot.pendingUpgradeChoices[number];
              return (
                <button
                  key={choice.id}
                  className="relative text-left"
                  onClick={() => {
                    if (isBossReward) chooseBossEquipment(index);
                    else chooseUpgradeReward(index);
                  }}
                >
                  <UiSprite id={index === 0 ? activeCardSprite : cardSprite} width={246} height={295} className="p-5">
                    <div className={`mb-3 text-[9px] ${isBossReward ? "text-[#ffd46e]" : "text-[#7fc8e0]"}`}>[{index + 1}] {isBossReward ? item?.uiTags.join(" · ") : upgrade?.title}</div>
                    <div className="mb-3 min-h-[34px] text-[13px] font-bold text-[#f7f3e9]">{choice.name}</div>
                    <div className="text-[9px] leading-[1.6] text-[#c8efff]">
                      {isBossReward ? item?.summary : upgrade?.description}
                    </div>
                    {isBossReward && item ? (
                      <div className="mt-4 text-[8px] leading-[1.5] text-[#ffd9a0]">
                        当前{EQUIPMENT_SLOT_LABELS[item.slot]}：{snapshot.equipment.equipped[item.slot]?.name ?? "无"}
                      </div>
                    ) : null}
                  </UiSprite>
                </button>
              );
            })}
          </div>
        </div>
      </UiSprite>
    </div>
  );
}
