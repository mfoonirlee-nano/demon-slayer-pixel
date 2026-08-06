import { type UiSpriteId } from "../constants";
import { uiSpriteDisplaySize } from "./uiSprite";

export type RewardOverlayKind = "upgrade" | "bossEquipment" | "treasure";

type RewardLayoutConfig = {
  activeCardSprite: UiSpriteId;
  cardContentSource: {
    bottom: number;
    insetX: number;
    top: number;
  };
  cardIconSource?: {
    iconSize: number;
    size: number;
    top: number;
  };
  cardRowTop: number;
  cardSprite: UiSpriteId;
  columnGap: number;
  panelBottomPadding: number;
  panelSprite: UiSpriteId;
  titleTop: number;
};

const REWARD_LAYOUTS: Record<RewardOverlayKind, RewardLayoutConfig> = {
  upgrade: {
    activeCardSprite: "upgradeChoiceCardActive",
    cardContentSource: {
      bottom: 84,
      insetX: 28,
      top: 104,
    },
    cardIconSource: {
      iconSize: 44,
      size: 56,
      top: 22,
    },
    cardRowTop: 52,
    cardSprite: "upgradeChoiceCard",
    columnGap: 10,
    panelBottomPadding: 44,
    panelSprite: "upgradeRewardPanel",
    titleTop: 28,
  },
  bossEquipment: {
    activeCardSprite: "bossChoiceCardActive",
    cardContentSource: {
      bottom: 60,
      insetX: 28,
      top: 96,
    },
    cardIconSource: {
      iconSize: 44,
      size: 56,
      top: 18,
    },
    cardRowTop: 52,
    cardSprite: "bossChoiceCard",
    columnGap: 10,
    panelBottomPadding: 44,
    panelSprite: "bossRewardPanel",
    titleTop: 28,
  },
  treasure: {
    activeCardSprite: "upgradeChoiceCardActive",
    cardContentSource: {
      bottom: 72,
      insetX: 28,
      top: 104,
    },
    cardIconSource: {
      iconSize: 44,
      size: 56,
      top: 22,
    },
    cardRowTop: 52,
    cardSprite: "upgradeChoiceCard",
    columnGap: 10,
    panelBottomPadding: 44,
    panelSprite: "upgradeRewardPanel",
    titleTop: 22,
  },
};

function scaledSize(size: { w: number; h: number }, scale: number) {
  return {
    h: Math.round(size.h * scale),
    w: Math.round(size.w * scale),
  };
}

function scaledInset(value: number, scale: number) {
  return Math.round(value * scale);
}

export function getRewardOverlayLayout(kind: RewardOverlayKind, choiceCount: number) {
  const config = REWARD_LAYOUTS[kind];
  const panelDisplaySize = uiSpriteDisplaySize(config.panelSprite);
  const cardSize = uiSpriteDisplaySize(config.cardSprite);
  const activeCardSize = uiSpriteDisplaySize(config.activeCardSprite);
  const sourceCardBoxH = Math.max(cardSize.h, activeCardSize.h);
  const availableCardH = panelDisplaySize.h - config.cardRowTop - config.panelBottomPadding;
  const cardScale = config.panelBottomPadding > 0
    ? Math.min(1, availableCardH / sourceCardBoxH)
    : 1;
  const cardDisplaySize = scaledSize(cardSize, cardScale);
  const activeCardDisplaySize = scaledSize(activeCardSize, cardScale);
  const cardBoxW = Math.max(
    cardDisplaySize.w,
    activeCardDisplaySize.w,
  );
  const cardBoxH = Math.max(cardDisplaySize.h, activeCardDisplaySize.h);
  const cardRowW = choiceCount * cardBoxW + Math.max(0, choiceCount - 1) * config.columnGap;
  const overlayW = Math.max(panelDisplaySize.w, cardRowW);
  const overlayH = Math.max(panelDisplaySize.h, config.cardRowTop + cardBoxH);

  return {
    activeCardDisplaySize,
    activeCardSprite: config.activeCardSprite,
    cardBoxH,
    cardBoxW,
    cardContent: {
      bottom: scaledInset(config.cardContentSource.bottom, cardScale),
      insetX: scaledInset(config.cardContentSource.insetX, cardScale),
      top: scaledInset(config.cardContentSource.top, cardScale),
    },
    cardIcon: config.cardIconSource
      ? {
        iconSize: scaledInset(config.cardIconSource.iconSize, cardScale),
        size: scaledInset(config.cardIconSource.size, cardScale),
        top: scaledInset(config.cardIconSource.top, cardScale),
      }
      : null,
    cardDisplaySize,
    cardRowTop: config.cardRowTop,
    cardScale,
    cardSprite: config.cardSprite,
    columnGap: config.columnGap,
    overlayH,
    overlayW,
    panelDisplaySize,
    panelSprite: config.panelSprite,
    titleTop: config.titleTop,
  };
}
