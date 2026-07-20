import { useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { useAtomValue } from "jotai";
import { equipEquipment, equipSkillSlot } from "../game/runtime";
import type { GameSnapshot } from "../game/gameStore";
import {
  equipmentFamilyMark,
  equipmentItemCopy,
  equipmentSlotLabel,
  localizeEquipmentItem,
} from "../i18n/equipmentCopy";
import { languageAtom } from "../i18n/language";
import { message, type MessageKey } from "../i18n/messages";
import { skillName } from "../i18n/skillCopy";
import type { EquipmentSlot } from "../types/game-state";
import {
  equipmentIconSrc,
  equipmentSlotBadgeSrc,
  getSkill,
  romanLevel,
  skillIconSrc,
} from "./uiDisplay";
import { UiSprite } from "./uiSprite";
import {
  ALL_EQUIPMENT_ITEMS,
  EQUIPMENT_SLOTS,
  PAUSE_CHOICE_FRAME_SIZE,
  PAUSE_CHOICE_GRID_COLUMNS,
  PAUSE_CHOICE_GRID_GAP,
  PAUSE_CHOICE_GRID_COLUMN_W,
  PAUSE_CHOICE_ICON_SIZE,
  PAUSE_CHOICE_BADGE_SIZE,
  PAUSE_CHOICES_COLUMN_W,
  PAUSE_COLUMN_GAP,
  PAUSE_CURRENT_BADGE_SIZE,
  PAUSE_CURRENT_COLUMN_W,
  PAUSE_CURRENT_FRAME_SIZE,
  PAUSE_CURRENT_ICON_SIZE,
  PAUSE_CURRENT_ROW_GAP,
  PAUSE_INFO_COLUMN_GAP,
  PAUSE_INFO_INSET_BOTTOM,
  PAUSE_INFO_INSET_TOP,
  PAUSE_INFO_INSET_X,
  PAUSE_INFO_ROW_GAP,
  PAUSE_PANEL_CONTENT_BOTTOM,
  PAUSE_PANEL_CONTENT_TOP,
  PAUSE_PANEL_H,
  PAUSE_PANEL_INSET_X,
  PAUSE_PANEL_SPRITE,
  PAUSE_PANEL_W,
  PAUSE_SKILLS,
  PAUSE_TAB_BODY_INSET_BOTTOM,
  PAUSE_TAB_BODY_INSET_TOP,
  PAUSE_TAB_CONTENT_CLASS,
  PAUSE_TAB_BODY_GAP,
  PAUSE_TAB_GAP,
  PAUSE_TAB_H,
  PAUSE_TAB_W,
  PAUSE_TABS,
} from "./pause/constants";
import { PauseDetailPanel, PauseSquareIcon, StatRow } from "./pause/components";
import { equipmentDetailCopy, skillDetailCopy } from "./pause/detailCopy";
import { PauseSettings } from "./pause/settings";
import type { EquipmentDetailTarget, PauseTab, SkillDetailTarget } from "./pause/types";

const PAUSE_TAB_LABEL_KEYS: Record<PauseTab, MessageKey> = {
  info: "pause.tab.info",
  equipment: "pause.tab.equipment",
  skills: "pause.tab.skills",
  settings: "pause.tab.settings",
};

function usePausePanelScale() {
  const scaleFrameRef = useRef<HTMLDivElement>(null);
  const [panelScale, setPanelScale] = useState(1);

  useLayoutEffect(() => {
    const updateScale = () => {
      const frame = scaleFrameRef.current;
      if (!frame) return;

      setPanelScale(Math.min(1, frame.clientWidth / PAUSE_PANEL_W, frame.clientHeight / PAUSE_PANEL_H));
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  return { panelScale, scaleFrameRef };
}

export function PauseScreen({ snapshot }: { snapshot: GameSnapshot }) {
  const language = useAtomValue(languageAtom);
  const { player, equipment } = snapshot;
  const { panelScale, scaleFrameRef } = usePausePanelScale();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const initialSkillSlot = Math.max(0, Math.min(player.equippedSkillIds.length - 1, player.skillIndex));
  const [activeTab, setActiveTab] = useState<PauseTab>("info");
  const [selectedSkillSlot, setSelectedSkillSlot] = useState(initialSkillSlot);
  const [selectedEquipmentSlot, setSelectedEquipmentSlot] = useState<EquipmentSlot>("blade");
  const [selectedEquipmentDetail, setSelectedEquipmentDetail] = useState<EquipmentDetailTarget>({ type: "slot", slot: "blade" });
  const [hoveredEquipmentDetail, setHoveredEquipmentDetail] = useState<EquipmentDetailTarget | null>(null);
  const [selectedSkillDetail, setSelectedSkillDetail] = useState<SkillDetailTarget>({ type: "slot", slotIndex: initialSkillSlot });
  const [hoveredSkillDetail, setHoveredSkillDetail] = useState<SkillDetailTarget | null>(null);
  const activeSkill = getSkill(player.equippedSkillIds[player.skillIndex]);
  const totalAttack = player.baseAttack + player.attackBonus;
  const attackText = player.attackBonus > 0
    ? `${totalAttack} (${player.baseAttack}+${player.attackBonus})`
    : `${totalAttack}`;
  const skillEnergyText = `${Math.floor(player.skillEnergy)} / ${player.skillEnergyMax}`;
  const ultimateEnergyText = `${Math.floor(player.ultimateEnergy)} / ${player.ultimateEnergyMax}`;
  const ultimateLevelText = player.ultimateLevel > 0
    ? romanLevel(player.ultimateLevel)
    : message(language, "status.notLearned");
  const selectedEquipmentItem = equipment.equipped[selectedEquipmentSlot]
    ? localizeEquipmentItem(language, equipment.equipped[selectedEquipmentSlot])
    : null;
  const unlockedEquipmentIds = new Set(equipment.inventory.map((item) => item.id));
  const visibleEquipmentItems = ALL_EQUIPMENT_ITEMS.filter((item) => item.slot === selectedEquipmentSlot);
  const selectedSkill = getSkill(player.equippedSkillIds[selectedSkillSlot]);
  const equipmentDetail = equipmentDetailCopy(
    hoveredEquipmentDetail ?? selectedEquipmentDetail,
    equipment,
    unlockedEquipmentIds,
    language,
  );
  const skillDetail = skillDetailCopy(hoveredSkillDetail ?? selectedSkillDetail, player, language);

  const selectPauseTab = (tabId: PauseTab) => {
    setActiveTab(tabId);
    setHoveredEquipmentDetail(null);
    setHoveredSkillDetail(null);
  };

  const focusTab = (index: number) => {
    window.requestAnimationFrame(() => tabRefs.current[index]?.focus());
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (index + 1) % PAUSE_TABS.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (index - 1 + PAUSE_TABS.length) % PAUSE_TABS.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = PAUSE_TABS.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    selectPauseTab(PAUSE_TABS[nextIndex]);
    focusTab(nextIndex);
  };

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[rgba(5,10,22,0.72)] px-3 py-4">
      <div ref={scaleFrameRef} className="flex h-full w-full items-center justify-center">
        <div
          className="relative shrink-0"
          style={{
            width: PAUSE_PANEL_W * panelScale,
            height: PAUSE_PANEL_H * panelScale,
          }}
        >
          <UiSprite
            id={PAUSE_PANEL_SPRITE}
            width={PAUSE_PANEL_W}
            height={PAUSE_PANEL_H}
            className="absolute left-0 top-0"
            style={{
              transform: `scale(${panelScale})`,
              transformOrigin: "top left",
              backgroundSize: "100% 100%",
            }}
          >
            <div
              className="absolute flex min-h-0 flex-col text-left text-white"
              style={{
                left: PAUSE_PANEL_INSET_X,
                right: PAUSE_PANEL_INSET_X,
                top: PAUSE_PANEL_CONTENT_TOP,
                bottom: PAUSE_PANEL_CONTENT_BOTTOM,
              }}
            >
          <div
            className="grid shrink-0 justify-center overflow-hidden"
            style={{
              gridTemplateColumns: `repeat(${PAUSE_TABS.length}, ${PAUSE_TAB_W}px)`,
              columnGap: PAUSE_TAB_GAP,
            }}
            role="tablist"
            aria-label={message(language, "pause.menu")}
          >
            {PAUSE_TABS.map((tab, index) => (
              <button
                key={tab}
                ref={(element) => {
                  tabRefs.current[index] = element;
                }}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                tabIndex={activeTab === tab ? 0 : -1}
                className="pause-tab-button border-0 bg-transparent p-0 text-[12px] font-bold"
                onClick={() => selectPauseTab(tab)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
              >
                <UiSprite
                  id={activeTab === tab ? "pauseTabActive" : "pauseTabNormal"}
                  width={PAUSE_TAB_W}
                  height={PAUSE_TAB_H}
                  className={`${PAUSE_TAB_CONTENT_CLASS} ${activeTab === tab ? "text-[#e8fbff]" : "text-[#7fc8e0]"}`}
                >
                  {message(language, PAUSE_TAB_LABEL_KEYS[tab])}
                </UiSprite>
              </button>
            ))}
          </div>

              <div
                className="min-h-0 flex-1 overflow-hidden"
                style={{ marginTop: PAUSE_TAB_BODY_GAP }}
              >
            {activeTab === "info" ? (
              <div
                className="grid h-full grid-cols-2 overflow-hidden"
                style={{
                  paddingInline: PAUSE_INFO_INSET_X,
                  paddingTop: PAUSE_INFO_INSET_TOP,
                  paddingBottom: PAUSE_INFO_INSET_BOTTOM,
                  columnGap: PAUSE_INFO_COLUMN_GAP,
                  rowGap: PAUSE_INFO_ROW_GAP,
                  gridTemplateRows: "repeat(4, minmax(0, 1fr))",
                }}
              >
                <StatRow label={message(language, "pause.stat.level")} value={`Lv.${player.runLevel}`} />
                <StatRow label={message(language, "pause.stat.experience")} value={`${player.runXp} / ${player.xpToNext}`} />
                <StatRow label={message(language, "pause.stat.health")} value={`${Math.max(0, Math.floor(player.hp))} / ${player.maxHp}`} />
                <StatRow label={message(language, "pause.stat.attack")} value={attackText} />
                <StatRow label={message(language, "pause.stat.skillEnergy")} value={skillEnergyText} />
                <StatRow
                  label={message(language, "pause.stat.currentSkill")}
                  value={activeSkill ? skillName(language, activeSkill.id) : message(language, "status.notEquipped")}
                />
                <StatRow label={message(language, "pause.stat.ultimateEnergy")} value={ultimateEnergyText} accent={player.ultimateReady} />
                <StatRow label={message(language, "pause.stat.ultimateLevel")} value={ultimateLevelText} />
              </div>
            ) : null}

            {activeTab === "equipment" ? (
              <div
                className="grid h-full overflow-hidden"
                style={{
                  gridTemplateRows: "minmax(0, 1fr) auto",
                  rowGap: PAUSE_CURRENT_ROW_GAP,
                  paddingTop: PAUSE_TAB_BODY_INSET_TOP,
                  paddingBottom: PAUSE_TAB_BODY_INSET_BOTTOM,
                }}
              >
                  <div
                    className="grid min-h-0 overflow-hidden"
                    style={{
                      gridTemplateColumns: `${PAUSE_CURRENT_COLUMN_W}px ${PAUSE_CHOICES_COLUMN_W}px`,
                      columnGap: PAUSE_COLUMN_GAP,
                      justifyContent: "center",
                    }}
                  >
                  <div
                    className="grid min-h-0 content-start overflow-hidden px-2"
                    style={{
                      gridTemplateRows: "auto 1fr",
                      rowGap: PAUSE_CURRENT_ROW_GAP,
                    }}
                  >
                    <div className="flex min-w-0 items-center justify-between gap-2 text-[10px] leading-none text-[#7fc8e0]">
                      <span>{message(language, "pause.currentEquipment")}</span>
                    </div>
                    <div
                      className="grid content-start"
                      style={{
                        gridTemplateColumns: `repeat(${EQUIPMENT_SLOTS.length}, ${PAUSE_CURRENT_FRAME_SIZE}px)`,
                        gap: PAUSE_CURRENT_ROW_GAP,
                        justifyContent: "center",
                      }}
                    >
                      {EQUIPMENT_SLOTS.map((slot) => {
                        const item = equipment.equipped[slot];
                        const itemCopy = item ? localizeEquipmentItem(language, item) : null;
                        const iconSrc = item ? equipmentIconSrc(item.id) : undefined;
                        const detailTarget: EquipmentDetailTarget = { type: "slot", slot };
                        const active = selectedEquipmentSlot === slot;
                        return (
                          <button
                            key={slot}
                            type="button"
                            aria-label={`${equipmentSlotLabel(language, slot)}: ${itemCopy?.name ?? message(language, "status.emptySlot")}`}
                            className="pause-square-button border-0 bg-transparent p-0"
                            onMouseEnter={() => setHoveredEquipmentDetail(detailTarget)}
                            onMouseLeave={() => setHoveredEquipmentDetail(null)}
                            onFocus={() => setHoveredEquipmentDetail(detailTarget)}
                            onBlur={() => setHoveredEquipmentDetail(null)}
                            onClick={() => {
                              setSelectedEquipmentSlot(slot);
                              setSelectedEquipmentDetail(detailTarget);
                            }}
                          >
                            <PauseSquareIcon
                              active={active}
                              empty={!item}
                              iconSrc={iconSrc}
                              badgeSrc={equipmentSlotBadgeSrc(slot)}
                              centerText={!iconSrc && item ? equipmentFamilyMark(language, item.family) : undefined}
                              size={PAUSE_CURRENT_FRAME_SIZE}
                              iconSize={PAUSE_CURRENT_ICON_SIZE}
                              badgeSize={PAUSE_CURRENT_BADGE_SIZE}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div
                    className="grid h-full min-h-0 overflow-hidden px-2 text-[9px] leading-none"
                    style={{ gridTemplateRows: "auto 1fr", rowGap: PAUSE_CURRENT_ROW_GAP }}
                  >
                    <div className="flex items-center justify-between gap-3 text-[10px] leading-none text-[#7fc8e0]">
                      <span>
                        {message(language, "pause.equipmentCandidates", {
                          slot: equipmentSlotLabel(language, selectedEquipmentSlot),
                        })}
                      </span>
                      <span className="truncate text-[#26d5ff]">
                        {selectedEquipmentItem?.name ?? message(language, "status.notEquipped")}
                      </span>
                    </div>
                    <div className="min-h-0 overflow-y-auto overflow-x-hidden">
                      {visibleEquipmentItems.length > 0 ? (
                        <div
                          className="grid content-start"
                          style={{
                            gridTemplateColumns: `repeat(${PAUSE_CHOICE_GRID_COLUMNS}, ${PAUSE_CHOICE_GRID_COLUMN_W}px)`,
                            gap: PAUSE_CHOICE_GRID_GAP,
                            justifyContent: "center",
                          }}
                        >
                          {visibleEquipmentItems.map((item) => {
                            const copy = equipmentItemCopy(language, item.id, item.tier);
                            const unlocked = unlockedEquipmentIds.has(item.id);
                            const equipped = equipment.equipped[item.slot]?.id === item.id;
                            const detailTarget: EquipmentDetailTarget = { type: "item", itemId: item.id };
                            const iconSrc = equipmentIconSrc(item.id);
                            return (
                              <button
                                key={item.id}
                                type="button"
                                aria-disabled={!unlocked}
                                aria-label={`${copy.name}: ${message(language, unlocked ? "status.canEquip" : "status.locked")}`}
                                className={`pause-choice-button border-0 bg-transparent p-0 ${
                                  !unlocked
                                    ? "text-[#4a7a9a]"
                                    : equipped
                                      ? "text-[#e8fbff]"
                                      : "text-[#c8efff]"
                                }`}
                                onMouseEnter={() => setHoveredEquipmentDetail(detailTarget)}
                                onMouseLeave={() => setHoveredEquipmentDetail(null)}
                                onFocus={() => setHoveredEquipmentDetail(detailTarget)}
                                onBlur={() => setHoveredEquipmentDetail(null)}
                                onClick={() => {
                                  setSelectedEquipmentDetail(detailTarget);
                                  setSelectedEquipmentSlot(item.slot);
                                  if (unlocked) equipEquipment(item.slot, item.id);
                                }}
                              >
                                <PauseSquareIcon
                                  active={equipped}
                                  disabled={!unlocked}
                                  iconSrc={iconSrc}
                                  badgeSrc={equipmentSlotBadgeSrc(item.slot)}
                                  centerText={!iconSrc ? equipmentFamilyMark(language, item.family) : undefined}
                                  size={PAUSE_CHOICE_FRAME_SIZE}
                                  iconSize={PAUSE_CHOICE_ICON_SIZE}
                                  badgeSize={PAUSE_CHOICE_BADGE_SIZE}
                                />
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="grid justify-items-center gap-1 pt-3 text-center text-[8px] text-[#7fc8e0]">
                          <PauseSquareIcon
                            disabled
                            empty
                            size={PAUSE_CHOICE_FRAME_SIZE}
                            iconSize={PAUSE_CHOICE_ICON_SIZE}
                          />
                          <span>{message(language, "pause.noEquipment")}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <PauseDetailPanel detail={equipmentDetail} />
              </div>
            ) : null}

            {activeTab === "skills" ? (
              <div
                className="grid h-full overflow-hidden"
                style={{
                  gridTemplateRows: "minmax(0, 1fr) auto",
                  rowGap: PAUSE_CURRENT_ROW_GAP,
                  paddingTop: PAUSE_TAB_BODY_INSET_TOP,
                  paddingBottom: PAUSE_TAB_BODY_INSET_BOTTOM,
                }}
              >
                  <div
                    className="grid min-h-0 overflow-hidden"
                    style={{
                      gridTemplateColumns: `${PAUSE_CURRENT_COLUMN_W}px ${PAUSE_CHOICES_COLUMN_W}px`,
                      columnGap: PAUSE_COLUMN_GAP,
                      justifyContent: "center",
                    }}
                  >
                  <div
                    className="grid min-h-0 content-start overflow-hidden px-2"
                    style={{
                      gridTemplateRows: "auto 1fr",
                      rowGap: PAUSE_CURRENT_ROW_GAP,
                    }}
                  >
                    <div className="flex min-w-0 items-center justify-between gap-2 text-[10px] leading-none text-[#7fc8e0]">
                      <span>{message(language, "pause.stat.currentSkill")}</span>
                    </div>
                    <div
                      className="grid content-start"
                      style={{
                        gridTemplateColumns: `repeat(${player.equippedSkillIds.length}, ${PAUSE_CURRENT_FRAME_SIZE}px)`,
                        gap: PAUSE_CURRENT_ROW_GAP,
                        justifyContent: "center",
                      }}
                    >
                      {player.equippedSkillIds.map((skillId, index) => {
                        const skill = getSkill(skillId);
                        const detailTarget: SkillDetailTarget = { type: "slot", slotIndex: index };
                        const active = selectedSkillSlot === index;
                        const level = skillId ? player.skillLevels[skillId] : undefined;
                        return (
                          <button
                            key={index}
                            type="button"
                            aria-label={`${message(language, "pause.skillSlot", { slot: index + 1 })}: ${
                              skillId ? skillName(language, skillId) : message(language, "status.emptySlot")
                            }`}
                            className="pause-square-button border-0 bg-transparent p-0"
                            onMouseEnter={() => setHoveredSkillDetail(detailTarget)}
                            onMouseLeave={() => setHoveredSkillDetail(null)}
                            onFocus={() => setHoveredSkillDetail(detailTarget)}
                            onBlur={() => setHoveredSkillDetail(null)}
                            onClick={() => {
                              setSelectedSkillSlot(index);
                              setSelectedSkillDetail(detailTarget);
                            }}
                          >
                            <PauseSquareIcon
                              active={active}
                              empty={!skill}
                              iconSrc={skillId ? skillIconSrc(skillId) : undefined}
                              leftBadgeText={`${index + 1}`}
                              rightBadgeText={skill ? romanLevel(level) : undefined}
                              size={PAUSE_CURRENT_FRAME_SIZE}
                              iconSize={PAUSE_CURRENT_ICON_SIZE}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div
                    className="grid h-full min-h-0 overflow-hidden px-2 text-[9px] leading-none"
                    style={{ gridTemplateRows: "auto 1fr", rowGap: PAUSE_CURRENT_ROW_GAP }}
                  >
                    <div className="flex items-center justify-between gap-3 text-[10px] leading-none text-[#7fc8e0]">
                      <span>{message(language, "pause.allSkills")}</span>
                      <span className="truncate text-[#26d5ff]">
                        {selectedSkill ? skillName(language, selectedSkill.id) : message(language, "status.emptySlot")}
                      </span>
                    </div>
                    <div className="min-h-0 overflow-y-auto overflow-x-hidden">
                      {PAUSE_SKILLS.length > 0 ? (
                        <div
                          className="grid content-start"
                          style={{
                            gridTemplateColumns: `repeat(${PAUSE_CHOICE_GRID_COLUMNS}, ${PAUSE_CHOICE_GRID_COLUMN_W}px)`,
                            gap: PAUSE_CHOICE_GRID_GAP,
                            justifyContent: "center",
                          }}
                        >
                          {PAUSE_SKILLS.map((skill) => {
                            const localizedName = skillName(language, skill.id);
                            const learned = Boolean(player.skillLevels[skill.id]);
                            const equippedElsewhere = player.equippedSkillIds.some((skillId, index) => (
                              index !== selectedSkillSlot && skillId === skill.id
                            ));
                            const current = player.equippedSkillIds[selectedSkillSlot] === skill.id;
                            const canEquip = learned && !equippedElsewhere;
                            const detailTarget: SkillDetailTarget = { type: "item", skillId: skill.id };
                            return (
                              <button
                                key={skill.id}
                                type="button"
                                aria-disabled={!canEquip}
                                aria-label={`${localizedName}: ${
                                  learned
                                    ? message(language, "pause.detail.level", {
                                      level: romanLevel(player.skillLevels[skill.id]),
                                    })
                                    : message(language, "status.locked")
                                }${equippedElsewhere ? `, ${message(language, "status.equippedElsewhere")}` : ""}`}
                                className={`pause-choice-button border-0 bg-transparent p-0 ${
                                  !learned
                                    ? "text-[#4a7a9a]"
                                    : current
                                      ? "text-[#e8fbff]"
                                      : "text-[#c8efff]"
                                }`}
                                onMouseEnter={() => setHoveredSkillDetail(detailTarget)}
                                onMouseLeave={() => setHoveredSkillDetail(null)}
                                onFocus={() => setHoveredSkillDetail(detailTarget)}
                                onBlur={() => setHoveredSkillDetail(null)}
                                onClick={() => {
                                  setSelectedSkillDetail(detailTarget);
                                  if (canEquip) equipSkillSlot(selectedSkillSlot, skill.id);
                                }}
                              >
                                <PauseSquareIcon
                                  active={current}
                                  disabled={!learned}
                                  iconSrc={skillIconSrc(skill.id)}
                                  rightBadgeText={learned ? romanLevel(player.skillLevels[skill.id]) : undefined}
                                  size={PAUSE_CHOICE_FRAME_SIZE}
                                  iconSize={PAUSE_CHOICE_ICON_SIZE}
                                />
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="grid justify-items-center gap-1 pt-3 text-center text-[8px] text-[#7fc8e0]">
                          <PauseSquareIcon
                            disabled
                            empty
                            size={PAUSE_CHOICE_FRAME_SIZE}
                            iconSize={PAUSE_CHOICE_ICON_SIZE}
                          />
                          <span>{message(language, "pause.noSkills")}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <PauseDetailPanel detail={skillDetail} />
              </div>
            ) : null}

            {activeTab === "settings" ? (
              <PauseSettings />
            ) : null}
          </div>
        </div>
      </UiSprite>
        </div>
      </div>
    </div>
  );
}
