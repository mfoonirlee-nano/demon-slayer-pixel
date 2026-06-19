import { useState } from "react";
import { getAudioVolumeSettings, setAudioVolumeSettings, type AudioVolumeSettings } from "../game/audio";
import { equipEquipment, equipSkillSlot } from "../game/runtime";
import type { GameSnapshot } from "../game/gameStore";
import type { EquipmentSlot } from "../types/game-state";
import {
  EQUIPMENT_SLOT_LABELS,
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
  PAUSE_CHOICE_GRID_GAP,
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
  PAUSE_INFO_INSET_X,
  PAUSE_INFO_ROW_GAP,
  PAUSE_PANEL_CONTENT_BOTTOM,
  PAUSE_PANEL_CONTENT_TOP,
  PAUSE_PANEL_H,
  PAUSE_PANEL_INSET_X,
  PAUSE_PANEL_W,
  PAUSE_SETTINGS_GAP,
  PAUSE_SETTINGS_INSET_X,
  PAUSE_SKILLS,
  PAUSE_TAB_CONTENT_CLASS,
  PAUSE_TAB_GAP,
  PAUSE_TAB_H,
  PAUSE_TAB_W,
  PAUSE_TABS,
} from "./pause/constants";
import { AudioVolumeControl, PauseDetailPanel, PauseSquareIcon, StatRow } from "./pause/components";
import { equipmentDetailCopy, skillDetailCopy } from "./pause/detailCopy";
import type { EquipmentDetailTarget, PauseTab, SkillDetailTarget } from "./pause/types";

export function PauseScreen({ snapshot }: { snapshot: GameSnapshot }) {
  const { player, equipment } = snapshot;
  const initialSkillSlot = Math.max(0, Math.min(player.equippedSkillIds.length - 1, player.skillIndex));
  const [activeTab, setActiveTab] = useState<PauseTab>("info");
  const [selectedSkillSlot, setSelectedSkillSlot] = useState(initialSkillSlot);
  const [selectedEquipmentSlot, setSelectedEquipmentSlot] = useState<EquipmentSlot>("blade");
  const [selectedEquipmentDetail, setSelectedEquipmentDetail] = useState<EquipmentDetailTarget>({ type: "slot", slot: "blade" });
  const [hoveredEquipmentDetail, setHoveredEquipmentDetail] = useState<EquipmentDetailTarget | null>(null);
  const [selectedSkillDetail, setSelectedSkillDetail] = useState<SkillDetailTarget>({ type: "slot", slotIndex: initialSkillSlot });
  const [hoveredSkillDetail, setHoveredSkillDetail] = useState<SkillDetailTarget | null>(null);
  const [volumeSettings, setVolumeSettings] = useState<AudioVolumeSettings>(() => getAudioVolumeSettings());
  const activeSkill = getSkill(player.equippedSkillIds[player.skillIndex]);
  const totalAttack = player.baseAttack + player.attackBonus;
  const attackText = player.attackBonus > 0
    ? `${totalAttack} (${player.baseAttack}+${player.attackBonus})`
    : `${totalAttack}`;
  const skillEnergyText = `${Math.floor(player.skillEnergy)} / ${player.skillEnergyMax}`;
  const ultimateEnergyText = `${Math.floor(player.ultimateEnergy)} / ${player.ultimateEnergyMax}`;
  const selectedEquipmentItem = equipment.equipped[selectedEquipmentSlot];
  const unlockedEquipmentIds = new Set(equipment.inventory.map((item) => item.id));
  const selectedSkill = getSkill(player.equippedSkillIds[selectedSkillSlot]);
  const equipmentDetail = equipmentDetailCopy(hoveredEquipmentDetail ?? selectedEquipmentDetail, equipment, unlockedEquipmentIds);
  const skillDetail = skillDetailCopy(hoveredSkillDetail ?? selectedSkillDetail, player);

  const updateVolume = (setting: keyof AudioVolumeSettings, value: number) => {
    setVolumeSettings(setAudioVolumeSettings({ [setting]: value }));
  };

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[rgba(5,10,22,0.72)] px-3 py-4">
      <UiSprite
        id="pausePanelCompact"
        width={PAUSE_PANEL_W}
        height={PAUSE_PANEL_H}
        className="relative"
        style={{
          width: `min(${PAUSE_PANEL_W}px, calc(100vw - 24px))`,
          height: "auto",
          aspectRatio: `${PAUSE_PANEL_W} / ${PAUSE_PANEL_H}`,
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
            aria-label="暂停菜单"
          >
            {PAUSE_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className="border-0 bg-transparent p-0 text-[9px] font-bold"
                onClick={() => setActiveTab(tab.id)}
              >
                <UiSprite
                  id={activeTab === tab.id ? "pauseTabActive" : "pauseTabNormal"}
                  width={PAUSE_TAB_W}
                  height={PAUSE_TAB_H}
                  className={`${PAUSE_TAB_CONTENT_CLASS} ${activeTab === tab.id ? "text-[#e8fbff]" : "text-[#7fc8e0]"}`}
                >
                  {tab.label}
                </UiSprite>
              </button>
            ))}
          </div>

          <div className="mt-2 min-h-0 flex-1 overflow-hidden">
            {activeTab === "info" ? (
              <div
                className="grid h-full grid-cols-2 overflow-y-auto pt-2"
                style={{
                  paddingInline: PAUSE_INFO_INSET_X,
                  columnGap: PAUSE_INFO_COLUMN_GAP,
                  rowGap: PAUSE_INFO_ROW_GAP,
                }}
              >
                <StatRow label="等级" value={`Lv.${player.runLevel}`} />
                <StatRow label="经验" value={`${player.runXp} / ${player.xpToNext}`} />
                <StatRow label="生命值" value={`${Math.max(0, Math.floor(player.hp))} / ${player.maxHp}`} />
                <StatRow label="攻击力" value={attackText} />
                <StatRow label="技能充能" value={skillEnergyText} />
                <StatRow label="大招充能" value={ultimateEnergyText} accent={player.ultimateReady} />
                <StatRow label="终式等级" value={romanLevel(player.ultimateLevel)} />
                <StatRow label="当前技能" value={activeSkill?.name ?? "未装备"} />
                <StatRow label="分数" value={player.score} />
              </div>
            ) : null}

            {activeTab === "equipment" ? (
              <div
                className="grid h-full"
                style={{
                  gridTemplateRows: "1fr auto",
                  rowGap: PAUSE_CURRENT_ROW_GAP,
                }}
              >
                <div
                  className="grid min-h-0"
                  style={{
                    gridTemplateColumns: `${PAUSE_CURRENT_COLUMN_W}px ${PAUSE_CHOICES_COLUMN_W}px`,
                    columnGap: PAUSE_COLUMN_GAP,
                  }}
                >
                  <div
                    className="grid content-start"
                    style={{
                      gridTemplateRows: "auto 1fr",
                      rowGap: PAUSE_CURRENT_ROW_GAP,
                    }}
                  >
                    <div className="text-[8px] leading-none text-[#7fc8e0]">当前装备</div>
                    <div
                      className="grid content-start"
                      style={{
                        gridTemplateColumns: `repeat(${EQUIPMENT_SLOTS.length}, ${PAUSE_CURRENT_FRAME_SIZE}px)`,
                        gap: PAUSE_CURRENT_ROW_GAP,
                      }}
                    >
                      {EQUIPMENT_SLOTS.map((slot) => {
                        const item = equipment.equipped[slot];
                        const detailTarget: EquipmentDetailTarget = { type: "slot", slot };
                        const active = selectedEquipmentSlot === slot;
                        return (
                          <button
                            key={slot}
                            type="button"
                            aria-label={`${EQUIPMENT_SLOT_LABELS[slot]}：${item?.name ?? "空槽"}`}
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
                              iconSrc={item ? equipmentIconSrc(item.id) : undefined}
                              badgeSrc={equipmentSlotBadgeSrc(slot)}
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
                    className="grid h-full min-h-0 overflow-hidden text-[9px] leading-none"
                    style={{ gridTemplateRows: "auto 1fr", rowGap: PAUSE_CURRENT_ROW_GAP }}
                  >
                    <div className="flex items-center justify-between gap-3 text-[8px] leading-none text-[#7fc8e0]">
                      <span>全部装备</span>
                      <span className="truncate text-[#26d5ff]">
                        {EQUIPMENT_SLOT_LABELS[selectedEquipmentSlot]} · {selectedEquipmentItem?.name ?? "未装备"}
                      </span>
                    </div>
                    <div className="min-h-0 overflow-y-auto overflow-x-hidden">
                      {ALL_EQUIPMENT_ITEMS.length > 0 ? (
                        <div
                          className="grid content-start"
                          style={{ gridTemplateColumns: "repeat(4, 78px)", gap: PAUSE_CHOICE_GRID_GAP }}
                        >
                          {ALL_EQUIPMENT_ITEMS.map((item) => {
                            const unlocked = unlockedEquipmentIds.has(item.id);
                            const equipped = equipment.equipped[item.slot]?.id === item.id;
                            const detailTarget: EquipmentDetailTarget = { type: "item", itemId: item.id };
                            return (
                              <button
                                key={item.id}
                                type="button"
                                aria-disabled={!unlocked}
                                aria-label={`${item.name}：${unlocked ? "可装备" : "未解锁"}`}
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
                                  iconSrc={equipmentIconSrc(item.id)}
                                  badgeSrc={equipmentSlotBadgeSrc(item.slot)}
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
                          <span>暂无装备设定</span>
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
                className="grid h-full"
                style={{
                  gridTemplateRows: "1fr auto",
                  rowGap: PAUSE_CURRENT_ROW_GAP,
                }}
              >
                <div
                  className="grid min-h-0"
                  style={{
                    gridTemplateColumns: `${PAUSE_CURRENT_COLUMN_W}px ${PAUSE_CHOICES_COLUMN_W}px`,
                    columnGap: PAUSE_COLUMN_GAP,
                  }}
                >
                  <div
                    className="grid content-start"
                    style={{
                      gridTemplateRows: "auto 1fr",
                      rowGap: PAUSE_CURRENT_ROW_GAP,
                    }}
                  >
                    <div className="text-[8px] leading-none text-[#7fc8e0]">当前技能</div>
                    <div
                      className="grid content-start"
                      style={{
                        gridTemplateColumns: `repeat(${player.equippedSkillIds.length}, ${PAUSE_CURRENT_FRAME_SIZE}px)`,
                        gap: PAUSE_CURRENT_ROW_GAP,
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
                            aria-label={`技能槽 ${index + 1}：${skill?.name ?? "空槽"}`}
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
                    className="grid h-full min-h-0 overflow-hidden text-[9px] leading-none"
                    style={{ gridTemplateRows: "auto 1fr", rowGap: PAUSE_CURRENT_ROW_GAP }}
                  >
                    <div className="flex items-center justify-between gap-3 text-[8px] leading-none text-[#7fc8e0]">
                      <span>全部技能</span>
                      <span className="truncate text-[#26d5ff]">槽位 {selectedSkillSlot + 1} · {selectedSkill?.name ?? "空槽"}</span>
                    </div>
                    <div className="min-h-0 overflow-y-auto overflow-x-hidden">
                      {PAUSE_SKILLS.length > 0 ? (
                        <div
                          className="grid content-start"
                          style={{ gridTemplateColumns: "repeat(4, 78px)", gap: PAUSE_CHOICE_GRID_GAP }}
                        >
                          {PAUSE_SKILLS.map((skill) => {
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
                                aria-label={`${skill.name}：${learned ? `等级 ${romanLevel(player.skillLevels[skill.id])}` : "未解锁"}${equippedElsewhere ? "，已在其他槽位装备" : ""}`}
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
                          <span>暂无技能设定</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <PauseDetailPanel detail={skillDetail} />
              </div>
            ) : null}

            {activeTab === "settings" ? (
              <div
                className="grid h-full content-start overflow-y-auto pt-2"
                style={{ gap: PAUSE_SETTINGS_GAP, paddingInline: PAUSE_SETTINGS_INSET_X }}
              >
                <AudioVolumeControl
                  label="主音量"
                  value={volumeSettings.master}
                  onChange={(value) => updateVolume("master", value)}
                />
                <AudioVolumeControl
                  label="音效音量"
                  value={volumeSettings.sfx}
                  onChange={(value) => updateVolume("sfx", value)}
                />
              </div>
            ) : null}
          </div>
        </div>
      </UiSprite>
    </div>
  );
}
