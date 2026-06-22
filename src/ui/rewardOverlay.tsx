import { useEffect, useState } from "react";
import { chooseBossEquipment, chooseUpgradeReward } from "../game/runtime";
import type { GameSnapshot } from "../game/gameStore";
import { playerSkillColor, playerSkillIconSrc } from "../systems/skillCatalog";
import type { EquipmentItemState, UpgradeChoiceState, UpgradeChoiceType } from "../types/game-state";
import { EQUIPMENT_SLOT_LABELS } from "./uiDisplay";
import { getRewardOverlayLayout } from "./rewardOverlayLayout";
import { UiSprite } from "./uiSprite";

const ULTIMATE_SKILL_ICON_SRC = "assets/sprites/skills/ultimate_skill/icon.png";

const UPGRADE_CHOICE_STYLE: Record<UpgradeChoiceType, {
  accent: string;
  glow: string;
  label: string;
}> = {
  unlockSkill: {
    accent: "#39f2ff",
    glow: "rgba(57, 242, 255, 0.18)",
    label: "新术",
  },
  upgradeSkill: {
    accent: "#c9f5ff",
    glow: "rgba(151, 229, 255, 0.15)",
    label: "精进",
  },
  upgradeUltimate: {
    accent: "#ffd36a",
    glow: "rgba(255, 185, 84, 0.18)",
    label: "终式",
  },
};

function romanLevel(level: number | undefined) {
  if (level === undefined) return "";
  if (level <= 0) return "0";
  if (level === 1) return "I";
  if (level === 2) return "II";
  return "III";
}

function levelTransition(choice: UpgradeChoiceState) {
  if (choice.nextLevel === undefined) return "";
  const previousLevel = choice.type === "unlockSkill" ? 0 : choice.nextLevel - 1;
  return `${romanLevel(previousLevel)} -> ${romanLevel(choice.nextLevel)}`;
}

function upgradeChoiceIconSrc(choice: UpgradeChoiceState) {
  return choice.skillId ? playerSkillIconSrc(choice.skillId) : ULTIMATE_SKILL_ICON_SRC;
}

export function RewardOverlay({ snapshot }: { snapshot: GameSnapshot }) {
  const isBossReward = snapshot.activeOverlay === "bossEquipment";
  const choices = isBossReward ? snapshot.pendingEquipmentChoices : snapshot.pendingUpgradeChoices;
  const choiceCount = choices.length;
  const choiceIds = choices.map((choice) => choice.id).join("|");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedChoiceIndex = choiceCount > 0 ? Math.min(selectedIndex, choiceCount - 1) : 0;
  const layout = getRewardOverlayLayout(isBossReward ? "bossEquipment" : "upgrade", choices.length);
  const title = isBossReward ? "夜潮遗物" : "选择需要的强化";
  const subtitle = isBossReward
    ? "选择一件装备"
    : null;

  useEffect(() => {
    setSelectedIndex(0);
  }, [choiceIds, isBossReward]);

  useEffect(() => {
    const handleRewardKey = (event: KeyboardEvent) => {
      const key = event.key;
      if (choiceCount <= 0) return;

      if (key === "ArrowLeft" || key === "ArrowRight") {
        event.preventDefault();
        event.stopPropagation();
        setSelectedIndex((current) => (
          key === "ArrowLeft"
            ? (current + choiceCount - 1) % choiceCount
            : (current + 1) % choiceCount
        ));
        return;
      }

      if (key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        if (isBossReward) {
          chooseBossEquipment(selectedChoiceIndex);
        } else {
          chooseUpgradeReward(selectedChoiceIndex);
        }
        return;
      }

      if (key !== "1" && key !== "2" && key !== "3") return;
      const index = Number(key) - 1;
      if (index >= choiceCount) return;
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
  }, [choiceCount, isBossReward, selectedChoiceIndex]);

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
          {subtitle ? <div className="mt-2 text-[9px] leading-none text-[#c8efff]">{subtitle}</div> : null}
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
            const upgradeStyle = upgrade ? UPGRADE_CHOICE_STYLE[upgrade.type] : null;
            const upgradeAccent = upgrade && upgradeStyle
              ? upgrade.skillId
                ? playerSkillColor(upgrade.skillId, upgradeStyle.accent)
                : upgradeStyle.accent
              : "#7fc8e0";
            const selected = index === selectedChoiceIndex;
            const choiceCardSprite = selected ? layout.activeCardSprite : layout.cardSprite;
            const choiceCardSize = selected ? layout.activeCardDisplaySize : layout.cardDisplaySize;
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
                  {upgrade && upgradeStyle && layout.cardIcon ? (
                    <div
                      className="absolute left-1/2 z-10 flex -translate-x-1/2 items-center justify-center overflow-hidden rounded-full border bg-[rgba(3,10,22,0.84)]"
                      style={{
                        borderColor: upgradeAccent,
                        boxShadow: `0 0 14px ${upgradeStyle.glow}, inset 0 0 12px rgba(255,255,255,0.1)`,
                        height: layout.cardIcon.size,
                        top: layout.cardIcon.top,
                        width: layout.cardIcon.size,
                      }}
                    >
                      <img
                        src={upgradeChoiceIconSrc(upgrade)}
                        alt=""
                        draggable={false}
                        className="object-contain [image-rendering:pixelated]"
                        style={{ height: layout.cardIcon.iconSize, width: layout.cardIcon.iconSize }}
                      />
                    </div>
                  ) : null}

                  <div
                    className="absolute flex flex-col overflow-hidden"
                    style={{
                      left: layout.cardContent.insetX,
                      right: layout.cardContent.insetX,
                      top: layout.cardContent.top,
                      bottom: layout.cardContent.bottom,
                    }}
                  >
                    {isBossReward ? (
                      <>
                        <div className="text-[7px] leading-[1.35] text-[#ffd46e]">[{index + 1}] {item?.uiTags.join(" · ")}</div>
                        <div className="mt-2 min-h-[40px] text-[10px] font-bold leading-[1.35] text-[#f7f3e9]">{choice.name}</div>
                        <div className="mt-1 text-[8px] leading-[1.65] text-[#c8efff]">{item?.summary}</div>
                      </>
                    ) : upgrade && upgradeStyle ? (
                      <>
                        <div className="flex justify-center">
                          <span
                            className="rounded-sm border px-1.5 py-[3px] text-[7px] leading-none"
                            style={{
                              backgroundColor: upgradeStyle.glow,
                              borderColor: upgradeAccent,
                              color: upgradeAccent,
                            }}
                          >
                            {upgradeStyle.label}
                          </span>
                        </div>
                        <div className="mt-2 min-h-[31px] text-center text-[10px] font-bold leading-[1.25] text-[#fff8e6]">{choice.name}</div>
                        <div className="mt-1 text-center text-[8px] font-bold leading-none" style={{ color: upgradeAccent }}>
                          {levelTransition(upgrade)}
                        </div>
                        <div className="mt-2 text-center text-[8px] leading-[1.5] text-[#c8efff]">{upgrade.description}</div>
                      </>
                    ) : null}
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
