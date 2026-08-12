import { type CSSProperties, useEffect, useState } from "react";
import { useAtomValue } from "jotai";
import { resolveStaticAssetUrl } from "../assets/staticAssetUrl";
import { REWARD_CONTROL_KEYS } from "../constants";
import {
  chooseBossEquipment,
  chooseTreasureReward,
  chooseUpgradeReward,
} from "../game/runtime";
import type { GameSnapshot } from "../game/gameStore";
import {
  equipmentFamilyLabel,
  equipmentFamilyResonanceCopy,
  equipmentSlotLabel,
  equipmentTierLabel,
  localizeEquipmentItem,
} from "../i18n/equipmentCopy";
import { languageAtom, type Language } from "../i18n/language";
import { message, type MessageKey } from "../i18n/messages";
import { localizeUpgradeChoice } from "../i18n/upgradeCopy";
import { playerSkillColor } from "../systems/skillCatalog";
import type {
  EquipmentChoiceState,
  TreasureChoiceState,
  UpgradeChoiceState,
  UpgradeChoiceType,
} from "../types/game-state";
import {
  equipmentRewardMetrics,
  upgradeRewardMetrics,
  type RewardChoiceMetric,
  type RewardMetricTone,
} from "./rewardChoiceDetails";
import { equipmentIconSrc, equipmentSlotBadgeSrc, skillIconSrc } from "./uiDisplay";
import {
  getRewardOverlayLayout,
  type RewardOverlayKind,
} from "./rewardOverlayLayout";
import { TreasureRewardCard } from "./treasureRewardCard";
import { UiSprite } from "./uiSprite";

const ULTIMATE_SKILL_ICON_SRC = resolveStaticAssetUrl(
  "assets/sprites/skills/ultimate_skill/icon.png",
);

export const REWARD_OVERLAY_BACKDROP_CLASS = "reward-overlay-backdrop";
export const REWARD_OVERLAY_PANEL_CLASS = "reward-overlay-panel";
export const REWARD_OVERLAY_CARD_CLASS = "reward-overlay-card";

const BOSS_ICON_BADGE_MIN_SIZE = 12;
const BOSS_ICON_BADGE_SIZE_RATIO = 0.34;
const REWARD_COMMIT_KEYS = new Set<string>([
  REWARD_CONTROL_KEYS.confirm,
  ...REWARD_CONTROL_KEYS.directChoice,
]);

export function isRewardCommitKey(key: string) {
  return REWARD_COMMIT_KEYS.has(key.toLowerCase());
}

export function shouldIgnoreRepeatedRewardCommit(key: string, repeat: boolean) {
  return repeat && isRewardCommitKey(key);
}

const REWARD_METRIC_TONE_COLORS: Record<RewardMetricTone, string> = {
  damage: "#ffd46e",
  defense: "#9be6ff",
  resource: "#8fffd0",
  range: "#c8efff",
  speed: "#b7ff8f",
  utility: "#e9d7ff",
};

const UPGRADE_CHOICE_STYLE: Record<UpgradeChoiceType, {
  accent: string;
  glow: string;
  labelKey: MessageKey;
}> = {
  unlockSkill: {
    accent: "#39f2ff",
    glow: "rgba(57, 242, 255, 0.18)",
    labelKey: "reward.badge.newSkill",
  },
  upgradeSkill: {
    accent: "#c9f5ff",
    glow: "rgba(151, 229, 255, 0.15)",
    labelKey: "reward.badge.mastery",
  },
  upgradeUltimate: {
    accent: "#ffd36a",
    glow: "rgba(255, 185, 84, 0.18)",
    labelKey: "reward.badge.ultimate",
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
  return choice.skillId ? skillIconSrc(choice.skillId) : ULTIMATE_SKILL_ICON_SRC;
}

function equipmentChoiceStatus(
  choice: EquipmentChoiceState,
  currentName: string | undefined,
  language: Language,
) {
  if (choice.reason === "tierUpgrade" && choice.previousTier) {
    return message(language, "reward.status.tierUpgrade", {
      previous: equipmentTierLabel(language, choice.previousTier),
      next: equipmentTierLabel(language, choice.tier),
    });
  }
  if (choice.reason === "replacement") {
    return message(language, "reward.status.replacement", {
      slot: equipmentSlotLabel(language, choice.slot),
      name: currentName ?? message(language, "common.none"),
    });
  }
  return message(language, "reward.status.new", {
    tier: equipmentTierLabel(language, choice.tier),
  });
}

function RewardMetricList({ metrics, accent }: { metrics: RewardChoiceMetric[]; accent: string }) {
  if (metrics.length === 0) return null;

  return (
    <div className="mt-1 grid grid-cols-2 gap-1">
      {metrics.map((metric) => (
        <div
          key={`${metric.label}-${metric.value}`}
          className="min-w-0 rounded-sm border bg-[rgba(4,11,25,0.64)] px-1 py-[2px] text-center leading-none"
          style={{ borderColor: "rgba(255,255,255,0.13)" }}
        >
          <div className="truncate text-[6px] text-[#7fc8e0]">{metric.label}</div>
          <div
            className="mt-[2px] truncate text-[7px] font-bold"
            style={{
              color: REWARD_METRIC_TONE_COLORS[metric.tone],
              textShadow: `0 0 8px ${accent}55`,
            }}
          >
            {metric.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function chooseReward(kind: RewardOverlayKind, index: number) {
  if (kind === "bossEquipment") {
    chooseBossEquipment(index);
    return;
  }
  if (kind === "treasure") {
    chooseTreasureReward(index);
    return;
  }
  chooseUpgradeReward(index);
}

export function RewardOverlay({ snapshot }: { snapshot: GameSnapshot }) {
  const language = useAtomValue(languageAtom);
  const overlayKind: RewardOverlayKind = snapshot.activeOverlay === "bossEquipment"
    ? "bossEquipment"
    : snapshot.activeOverlay === "treasure"
      ? "treasure"
      : "upgrade";
  const isBossReward = overlayKind === "bossEquipment";
  const isTreasureReward = overlayKind === "treasure";
  const choices = isBossReward
    ? snapshot.pendingEquipmentChoices
    : isTreasureReward
      ? snapshot.pendingTreasureChoices
      : snapshot.pendingUpgradeChoices;
  const choiceCount = choices.length;
  const choiceIds = choices.map((choice) => choice.id).join("|");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedChoiceIndex = choiceCount > 0 ? Math.min(selectedIndex, choiceCount - 1) : 0;
  const layout = getRewardOverlayLayout(overlayKind, choices.length);
  const title = message(
    language,
    isBossReward
      ? "reward.title.equipment"
      : isTreasureReward
        ? "reward.title.treasure"
        : "reward.title.upgrade",
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [choiceIds, overlayKind]);

  useEffect(() => {
    const handleRewardKey = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (choiceCount <= 0) return;
      if (shouldIgnoreRepeatedRewardCommit(key, event.repeat)) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (key === REWARD_CONTROL_KEYS.previous || key === REWARD_CONTROL_KEYS.next) {
        event.preventDefault();
        event.stopPropagation();
        setSelectedIndex((current) => (
          key === REWARD_CONTROL_KEYS.previous
            ? (current + choiceCount - 1) % choiceCount
            : (current + 1) % choiceCount
        ));
        return;
      }

      if (key === REWARD_CONTROL_KEYS.confirm) {
        event.preventDefault();
        event.stopPropagation();
        chooseReward(overlayKind, selectedChoiceIndex);
        return;
      }

      const index = REWARD_CONTROL_KEYS.directChoice.findIndex((choiceKey) => choiceKey === key);
      if (index < 0) return;
      if (index >= choiceCount) return;
      event.preventDefault();
      event.stopPropagation();
      chooseReward(overlayKind, index);
    };

    window.addEventListener("keydown", handleRewardKey, { capture: true });
    return () => window.removeEventListener("keydown", handleRewardKey, { capture: true });
  }, [choiceCount, overlayKind, selectedChoiceIndex]);

  return (
    <div
      className={`${REWARD_OVERLAY_BACKDROP_CLASS} ${isTreasureReward ? "reward-overlay-treasure" : ""} absolute inset-0 z-40 flex items-center justify-center bg-[rgba(4,7,16,0.78)] px-4 text-white`}
    >
      <div
        className={`${REWARD_OVERLAY_PANEL_CLASS} relative`}
        style={{ width: layout.overlayW, height: layout.overlayH }}
      >
        {isTreasureReward ? <div className="reward-treasure-panel-aura" aria-hidden="true" /> : null}
        <UiSprite
          id={layout.panelSprite}
          width={layout.panelDisplaySize.w}
          height={layout.panelDisplaySize.h}
          className="absolute top-0"
          style={{ left: (layout.overlayW - layout.panelDisplaySize.w) / 2 }}
        />

        <div className="absolute inset-x-0 text-center" style={{ top: layout.titleTop }}>
          <div className={`text-[14px] font-bold leading-none ${isBossReward ? "text-[#ffd46e]" : isTreasureReward ? "text-[#ffe099]" : "text-[#26d5ff]"}`}>{title}</div>
          {isTreasureReward ? (
            <div className="mt-1 text-[7px] leading-none text-[#8ee9ff]">
              {message(language, "reward.treasure.subtitle")}
            </div>
          ) : null}
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
            const item = isBossReward
              ? localizeEquipmentItem(language, choice as EquipmentChoiceState)
              : null;
            const upgrade = isBossReward || isTreasureReward
              ? null
              : localizeUpgradeChoice(
                language,
                choice as typeof snapshot.pendingUpgradeChoices[number],
              );
            const treasure = isTreasureReward
              ? choice as TreasureChoiceState
              : null;
            const upgradeStyle = upgrade ? UPGRADE_CHOICE_STYLE[upgrade.type] : null;
            const upgradeAccent = upgrade && upgradeStyle
              ? upgrade.skillId
                ? playerSkillColor(upgrade.skillId, upgradeStyle.accent)
                : upgradeStyle.accent
              : "#7fc8e0";
            const selected = index === selectedChoiceIndex;
            const choiceCardSprite = selected ? layout.activeCardSprite : layout.cardSprite;
            const choiceCardSize = selected ? layout.activeCardDisplaySize : layout.cardDisplaySize;
            const bossAccent = selected ? "#ff6f61" : "#d94a45";
            const bossGlow = selected ? "rgba(255, 82, 72, 0.24)" : "rgba(255, 82, 72, 0.14)";
            const bossIconBadgeSize = layout.cardIcon
              ? Math.max(BOSS_ICON_BADGE_MIN_SIZE, Math.round(layout.cardIcon.size * BOSS_ICON_BADGE_SIZE_RATIO))
              : 0;
            const equippedItemSource = item ? snapshot.equipment.equipped[item.slot] : null;
            const equippedItem = equippedItemSource
              ? localizeEquipmentItem(language, equippedItemSource)
              : null;
            const metrics = item
              ? equipmentRewardMetrics(item, language)
              : upgrade
                ? upgradeRewardMetrics(upgrade, snapshot.player, language)
                : [];
            const resonance = item
              ? equipmentFamilyResonanceCopy(language, item.family)
              : null;
            return (
              <button
                key={choice.id}
                className={`${REWARD_OVERLAY_CARD_CLASS} ${isTreasureReward ? "reward-treasure-card" : ""} relative border-0 bg-transparent p-0 text-left`}
                data-selected={selected}
                style={{
                  "--reward-card-index": index,
                  width: layout.cardBoxW,
                  height: layout.cardBoxH,
                } as CSSProperties}
                onClick={() => chooseReward(overlayKind, index)}
                onFocus={() => setSelectedIndex(index)}
                onPointerEnter={() => setSelectedIndex(index)}
              >
                <UiSprite
                  id={choiceCardSprite}
                  width={choiceCardSize.w}
                  height={choiceCardSize.h}
                  className={`relative mx-auto ${isTreasureReward ? "reward-treasure-card-shell" : ""}`}
                >
                  {treasure ? (
                    <TreasureRewardCard
                      choice={treasure}
                      language={language}
                      layout={layout}
                      selected={selected}
                      snapshot={snapshot}
                    />
                  ) : item && layout.cardIcon ? (
                    <div
                      className="absolute left-1/2 z-10 flex -translate-x-1/2 items-center justify-center overflow-hidden rounded-full border bg-[rgba(3,10,22,0.86)]"
                      style={{
                        borderColor: bossAccent,
                        boxShadow: `0 0 14px ${bossGlow}, inset 0 0 12px rgba(255,255,255,0.1)`,
                        height: layout.cardIcon.size,
                        top: layout.cardIcon.top,
                        width: layout.cardIcon.size,
                      }}
                    >
                      <img
                        src={equipmentIconSrc(item.id)}
                        alt=""
                        draggable={false}
                        className="object-contain [image-rendering:pixelated]"
                        style={{ height: layout.cardIcon.iconSize, width: layout.cardIcon.iconSize }}
                      />
                      <img
                        src={equipmentSlotBadgeSrc(item.slot)}
                        alt=""
                        draggable={false}
                        className="absolute [image-rendering:pixelated]"
                        style={{
                          height: bossIconBadgeSize,
                          right: 0,
                          top: 0,
                          width: bossIconBadgeSize,
                        }}
                      />
                    </div>
                  ) : upgrade && upgradeStyle && layout.cardIcon ? (
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
                    {isBossReward && item ? (
                      <>
                        <div className="flex justify-center">
                          <span
                            className="rounded-sm border px-1.5 py-[3px] text-[7px] leading-none"
                            style={{
                              backgroundColor: bossGlow,
                              borderColor: bossAccent,
                              color: "#ffb09a",
                            }}
                          >
                            {equipmentSlotLabel(language, item.slot)} · {equipmentTierLabel(language, item.tier)}
                          </span>
                        </div>
                        <div className="mt-2 min-h-[31px] text-center text-[10px] font-bold leading-[1.25] text-[#fff8e6]">{item.name}</div>
                        <div className="mt-1 truncate text-center text-[8px] font-bold leading-none text-[#ffd46e]">
                          {equipmentFamilyLabel(language, item.family)} · {item.uiTags[item.uiTags.length - 1]}
                        </div>
                        <RewardMetricList metrics={metrics} accent={bossAccent} />
                        <div className="mt-1 line-clamp-2 text-center text-[8px] leading-[1.4] text-[#c8efff]">{item.summary}</div>
                        {resonance ? (
                          <div className="mt-1 text-center text-[7px] leading-[1.25] text-[#ffd9a0]">
                            <div className="line-clamp-2">{resonance.pair}</div>
                            <div className="mt-[2px] line-clamp-2">{resonance.full}</div>
                          </div>
                        ) : null}
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
                            {message(language, upgradeStyle.labelKey)}
                          </span>
                        </div>
                        <div className="mt-2 min-h-[31px] text-center text-[10px] font-bold leading-[1.25] text-[#fff8e6]">{upgrade.name}</div>
                        <div className="mt-1 text-center text-[8px] font-bold leading-none" style={{ color: upgradeAccent }}>
                          {levelTransition(upgrade)}
                        </div>
                        <RewardMetricList metrics={metrics} accent={upgradeAccent} />
                        <div className="mt-1 line-clamp-2 text-center text-[8px] leading-[1.4] text-[#c8efff]">{upgrade.description}</div>
                      </>
                    ) : null}
                    {isBossReward && item ? (
                      <div className="mt-auto pt-1 text-center text-[7px] leading-[1.35] text-[#ffd9a0]">
                        {equipmentChoiceStatus(item, equippedItem?.name, language)}
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
