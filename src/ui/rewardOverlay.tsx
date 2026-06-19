import { useEffect } from "react";
import { chooseBossEquipment, chooseUpgradeReward } from "../game/runtime";
import type { GameSnapshot } from "../game/gameStore";
import type { EquipmentItemState } from "../types/game-state";
import { EQUIPMENT_SLOT_LABELS } from "./uiDisplay";
import { getRewardOverlayLayout } from "./rewardOverlayLayout";
import { UiSprite } from "./uiSprite";

export function RewardOverlay({ snapshot }: { snapshot: GameSnapshot }) {
  const isBossReward = snapshot.activeOverlay === "bossEquipment";
  const choices = isBossReward ? snapshot.pendingEquipmentChoices : snapshot.pendingUpgradeChoices;
  const layout = getRewardOverlayLayout(isBossReward ? "bossEquipment" : "upgrade", choices.length);
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
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-[rgba(4,7,16,0.78)] px-4 text-white">
      <div className="relative" style={{ width: layout.overlayW, height: layout.overlayH }}>
        <UiSprite
          id={layout.panelSprite}
          width={layout.panelDisplaySize.w}
          height={layout.panelDisplaySize.h}
          className="absolute top-0"
          style={{ left: (layout.overlayW - layout.panelDisplaySize.w) / 2 }}
        />

        <div className="absolute inset-x-0 text-center" style={{ top: layout.titleTop }}>
          <div className={`text-[14px] font-bold leading-none ${isBossReward ? "text-[#ffd46e]" : "text-[#26d5ff]"}`}>{title}</div>
          <div className="mt-2 text-[9px] leading-none text-[#c8efff]">{subtitle}</div>
        </div>

        <div
          className="absolute inset-x-0 grid justify-center"
          style={{
            top: layout.cardRowTop,
            gridTemplateColumns: `repeat(${choices.length}, ${layout.cardBoxW}px)`,
            columnGap: layout.columnGap,
          }}
        >
          {choices.map((choice, index) => {
            const item = isBossReward ? choice as EquipmentItemState : null;
            const upgrade = isBossReward ? null : choice as typeof snapshot.pendingUpgradeChoices[number];
            const choiceCardSprite = index === 0 ? layout.activeCardSprite : layout.cardSprite;
            const choiceCardSize = index === 0 ? layout.activeCardDisplaySize : layout.cardDisplaySize;
            return (
              <button
                key={choice.id}
                className="relative border-0 bg-transparent p-0 text-left"
                style={{ width: layout.cardBoxW, height: layout.cardBoxH }}
                onClick={() => {
                  if (isBossReward) chooseBossEquipment(index);
                  else chooseUpgradeReward(index);
                }}
              >
                <UiSprite
                  id={choiceCardSprite}
                  width={choiceCardSize.w}
                  height={choiceCardSize.h}
                  className="relative mx-auto"
                >
                  <div
                    className="absolute flex flex-col overflow-hidden"
                    style={{
                      left: layout.cardContent.insetX,
                      right: layout.cardContent.insetX,
                      top: layout.cardContent.top,
                      bottom: layout.cardContent.bottom,
                    }}
                  >
                    <div className={`text-[7px] leading-[1.35] ${isBossReward ? "text-[#ffd46e]" : "text-[#7fc8e0]"}`}>[{index + 1}] {isBossReward ? item?.uiTags.join(" · ") : upgrade?.title}</div>
                    <div className="mt-2 min-h-[40px] text-[10px] font-bold leading-[1.35] text-[#f7f3e9]">{choice.name}</div>
                    <div className="mt-1 text-[8px] leading-[1.65] text-[#c8efff]">
                      {isBossReward ? item?.summary : upgrade?.description}
                    </div>
                    {isBossReward && item ? (
                      <div className="mt-auto pt-2 text-[7px] leading-[1.45] text-[#ffd9a0]">
                        当前{EQUIPMENT_SLOT_LABELS[item.slot]}：{snapshot.equipment.equipped[item.slot]?.name ?? "无"}
                      </div>
                    ) : null}
                  </div>
                </UiSprite>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
