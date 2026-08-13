import { resolveStaticAssetUrl } from "../assets/staticAssetUrl";
import type { GameSnapshot } from "../game/gameStore";
import {
  equipmentFamilyLabel,
  equipmentPrimaryStatLabel,
  equipmentSlotLabel,
  equipmentTierLabel,
  localizeEquipmentItem,
} from "../i18n/equipmentCopy";
import type { Language } from "../i18n/language";
import { message, type MessageKey } from "../i18n/messages";
import type {
  TreasureChoiceState,
  TreasureResourceKind,
} from "../types/game-state";
import { formatSignedPercent } from "../utils";
import { equipmentIconSrc, equipmentSlotBadgeSrc } from "./uiDisplay";
import { getRewardOverlayLayout } from "./rewardOverlayLayout";

const ICON_BADGE_MIN_SIZE = 12;
const ICON_BADGE_SIZE_RATIO = 0.34;
const RESIDUAL_SPIRIT_ICON_SRC = resolveStaticAssetUrl(
  "assets/sprites/pickups/residual-spirit.png",
);

const RESOURCE_STYLE: Record<TreasureResourceKind, {
  accent: string;
  descriptionKey: MessageKey;
  iconSrc: string;
  nameKey: MessageKey;
  valueKey: MessageKey;
}> = {
  health: {
    accent: "#8fffd0",
    descriptionKey: "reward.treasure.healthDescription",
    iconSrc: resolveStaticAssetUrl("assets/sprites/ui/status/semantic/buff_recovery.png"),
    nameKey: "reward.treasure.healthName",
    valueKey: "reward.treasure.healthValue",
  },
  skillEnergy: {
    accent: "#69ddff",
    descriptionKey: "reward.treasure.skillEnergyDescription",
    iconSrc: resolveStaticAssetUrl("assets/sprites/ui/status/semantic/buff_energy.png"),
    nameKey: "reward.treasure.skillEnergyName",
    valueKey: "reward.treasure.skillEnergyValue",
  },
  ultimateEnergy: {
    accent: "#ffd36f",
    descriptionKey: "reward.treasure.ultimateEnergyDescription",
    iconSrc: resolveStaticAssetUrl("assets/sprites/ui/status/semantic/buff_ultimate.png"),
    nameKey: "reward.treasure.ultimateEnergyName",
    valueKey: "reward.treasure.ultimateEnergyValue",
  },
  residualSpirit: {
    accent: "#a8eeff",
    descriptionKey: "reward.treasure.residualSpiritDescription",
    iconSrc: RESIDUAL_SPIRIT_ICON_SRC,
    nameKey: "reward.treasure.residualSpiritName",
    valueKey: "reward.treasure.residualSpiritValue",
  },
  runXp: {
    accent: "#ffe099",
    descriptionKey: "reward.treasure.xpDescription",
    iconSrc: resolveStaticAssetUrl("assets/sprites/ui/status/semantic/buff_charge.png"),
    nameKey: "reward.treasure.xpName",
    valueKey: "reward.treasure.xpValue",
  },
};

export function TreasureRewardCard({ choice, language, layout, selected, snapshot }: {
  choice: TreasureChoiceState;
  language: Language;
  layout: ReturnType<typeof getRewardOverlayLayout>;
  selected: boolean;
  snapshot: GameSnapshot;
}) {
  const equipment = choice.kind === "equipment"
    ? localizeEquipmentItem(language, choice.equipment)
    : null;
  const resourceStyle = choice.kind === "equipment" ? null : RESOURCE_STYLE[choice.kind];
  const accent = resourceStyle?.accent ?? "#ffd36f";
  const equippedSource = equipment ? snapshot.equipment.equipped[equipment.slot] : null;
  const equippedName = equippedSource
    ? localizeEquipmentItem(language, equippedSource).name
    : message(language, "common.none");
  const equipmentPrimaryStat = equipment
    ? formatSignedPercent(equipment.primaryStatBonusRatio)
    : null;
  const equippedPrimaryStat = equippedSource
    ? formatSignedPercent(equippedSource.primaryStatBonusRatio)
    : null;
  const primaryStatValue = equipmentPrimaryStat && equippedPrimaryStat
    ? `${equippedPrimaryStat} → ${equipmentPrimaryStat}`
    : equipmentPrimaryStat;
  const iconSrc = equipment ? equipmentIconSrc(equipment.id) : resourceStyle?.iconSrc;
  const iconBadgeSize = layout.cardIcon
    ? Math.max(ICON_BADGE_MIN_SIZE, Math.round(layout.cardIcon.size * ICON_BADGE_SIZE_RATIO))
    : 0;

  return (
    <>
      {layout.cardIcon && iconSrc ? (
        <div
          className="absolute left-1/2 z-10 flex -translate-x-1/2 items-center justify-center overflow-hidden rounded-full border bg-[rgba(3,10,24,0.9)]"
          style={{
            borderColor: accent,
            boxShadow: selected
              ? `0 0 17px ${accent}99, inset 0 0 13px rgba(255,223,138,0.16)`
              : `0 0 10px ${accent}55, inset 0 0 10px rgba(94,225,255,0.1)`,
            height: layout.cardIcon.size,
            top: layout.cardIcon.top,
            width: layout.cardIcon.size,
          }}
        >
          <img
            src={iconSrc}
            alt=""
            draggable={false}
            className="reward-treasure-icon object-contain [image-rendering:pixelated]"
            style={{ height: layout.cardIcon.iconSize, width: layout.cardIcon.iconSize }}
          />
          {equipment ? (
            <img
              src={equipmentSlotBadgeSrc(equipment.slot)}
              alt=""
              draggable={false}
              className="absolute [image-rendering:pixelated]"
              style={{ height: iconBadgeSize, right: 0, top: 0, width: iconBadgeSize }}
            />
          ) : null}
        </div>
      ) : null}

      <div
        className="absolute flex flex-col overflow-hidden"
        style={{
          bottom: layout.cardContent.bottom,
          left: layout.cardContent.insetX,
          right: layout.cardContent.insetX,
          top: layout.cardContent.top,
        }}
      >
        {choice.kind === "equipment" && equipment ? (
          <>
            <div className="flex justify-center">
              <span
                className="rounded-sm border px-1.5 py-[3px] text-[7px] leading-none text-[#ffe3a0]"
                style={{ backgroundColor: "rgba(255,211,111,0.12)", borderColor: accent }}
              >
                {equipmentSlotLabel(language, equipment.slot)} · {equipmentTierLabel(language, equipment.tier)}
              </span>
            </div>
            <div className="mt-2 min-h-[29px] text-center text-[10px] font-bold leading-[1.25] text-[#fff8dc]">
              {equipment.name}
            </div>
            <div className="mt-1 truncate text-center text-[8px] font-bold text-[#ffd36f]">
              {equipmentFamilyLabel(language, equipment.family)} · {equipment.uiTags[equipment.uiTags.length - 1]}
            </div>
            <div className="mt-1 text-center text-[9px] font-black text-[#ffe099]">
              {equipmentPrimaryStatLabel(language, equipment.slot)}{" "}
              {primaryStatValue}
            </div>
            <div className="mt-2 line-clamp-3 text-center text-[8px] leading-[1.45] text-[#bcefff]">
              {equipment.summary}
            </div>
            <div className="mt-auto pt-1 text-center text-[7px] leading-[1.35] text-[#ffd990]">
              {equipment.reason === "replacement"
                ? message(language, "reward.status.replacement", {
                  slot: equipmentSlotLabel(language, equipment.slot),
                  name: equippedName,
                })
                : message(language, "reward.status.new", {
                  tier: equipmentTierLabel(language, equipment.tier),
                })}
            </div>
          </>
        ) : choice.kind !== "equipment" && resourceStyle ? (
          <>
            <div className="flex justify-center">
              <span
                className="rounded-sm border px-1.5 py-[3px] text-[7px] leading-none"
                style={{ backgroundColor: `${accent}18`, borderColor: accent, color: accent }}
              >
                {message(language, resourceStyle.nameKey)}
              </span>
            </div>
            <div className="reward-treasure-gain mt-2 flex items-baseline justify-center gap-1 font-black leading-none">
              <span className="text-[9px]">{message(language, resourceStyle.valueKey)}</span>
              <span className="text-[18px]">+{choice.amount}</span>
            </div>
            {choice.kind !== "runXp" ? (
              <div className="mt-2 text-center text-[9px] font-bold text-[#d7f7ff]">
                {message(language, "reward.treasure.transition", {
                  before: choice.before,
                  after: choice.after,
                  resource: message(language, resourceStyle.valueKey),
                })}
              </div>
            ) : null}
            <div className="mt-3 text-center text-[8px] leading-[1.45] text-[#a9ddea]">
              {message(language, resourceStyle.descriptionKey)}
            </div>
            {choice.kind === "runXp" && choice.after >= snapshot.player.xpToNext ? (
              <div className="mt-auto text-center text-[7px] font-bold leading-none text-[#ffe099]">
                {message(language, "reward.treasure.xpLevelReady")}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </>
  );
}
