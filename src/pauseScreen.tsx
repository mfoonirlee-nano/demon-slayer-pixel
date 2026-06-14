import { useState } from "react";
import { SKILLS, type UiSpriteId } from "./constants";
import { getAudioVolumeSettings, setAudioVolumeSettings, type AudioVolumeSettings } from "./audio";
import { equipEquipment, equipSkillSlot } from "./runtime";
import { EQUIPMENT_CHOICE_IDS, EQUIPMENT_ITEMS } from "./systems/equipment";
import type { GameSnapshot } from "./gameStore";
import type { EquipmentSlot } from "./types/game-state";
import {
  EQUIPMENT_SLOT_LABELS,
  equipmentIconSrc,
  equipmentSlotBadgeSrc,
  getSkill,
  romanLevel,
  skillIconSrc,
} from "./uiDisplay";
import { UiSprite } from "./uiSprite";

type PauseTab = "info" | "equipment" | "skills" | "settings";

const EQUIPMENT_SLOTS: EquipmentSlot[] = ["blade", "garb", "talisman"];
const ALL_EQUIPMENT_ITEMS = EQUIPMENT_CHOICE_IDS.map((itemId) => EQUIPMENT_ITEMS[itemId]);
const PAUSE_TABS: Array<{ id: PauseTab; label: string }> = [
  { id: "info", label: "基础信息" },
  { id: "equipment", label: "装备" },
  { id: "skills", label: "技能" },
  { id: "settings", label: "设置" },
];
const AUDIO_PERCENT_SCALE = 100;
const PAUSE_PANEL_W = 600;
const PAUSE_PANEL_H = 340;
const PAUSE_PANEL_INSET_X = 24;
const PAUSE_PANEL_CONTENT_TOP = 42;
const PAUSE_PANEL_CONTENT_BOTTOM = 28;
const PAUSE_TAB_W = 126;
const PAUSE_TAB_H = 42;
const PAUSE_TAB_GAP = 4;
const PAUSE_CURRENT_COLUMN_W = 176;
const PAUSE_CHOICES_COLUMN_W = 360;
const PAUSE_CURRENT_FRAME_SIZE = 44;
const PAUSE_CHOICE_FRAME_SIZE = 58;
const PAUSE_CURRENT_ICON_SIZE = 28;
const PAUSE_CHOICE_ICON_SIZE = 36;
const PAUSE_CURRENT_BADGE_SIZE = 14;
const PAUSE_CHOICE_BADGE_SIZE = 16;
const PAUSE_ICON_OFFSET_Y = 2;
const PAUSE_CURRENT_ROW_GAP = 6;
const PAUSE_CHOICE_GRID_GAP = 8;
const PAUSE_COLUMN_GAP = 16;
const PAUSE_INFO_INSET_X = 32;
const PAUSE_INFO_ROW_GAP = 6;
const PAUSE_INFO_COLUMN_GAP = 40;
const PAUSE_SETTINGS_GAP = 12;
const PAUSE_SLIDER_TRACK_W = 420;
const PAUSE_SLIDER_TRACK_H = 18;
const PAUSE_SLIDER_THUMB_W = 22;
const PAUSE_SLIDER_THUMB_H = 24;
const PAUSE_SLIDER_TRACK_TOP = 8;
const PAUSE_SLIDER_THUMB_TOP = 5;
const PAUSE_SLIDER_WRAP_H = 30;
const PAUSE_SETTINGS_INSET_X = (PAUSE_PANEL_W - PAUSE_PANEL_INSET_X * 2 - PAUSE_SLIDER_TRACK_W) / 2;
const PAUSE_TAB_CONTENT_CLASS = "flex items-center justify-center px-[18px] pb-[5px] pt-[8px] text-center leading-none";

function StatRow({ label, value, accent = false }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[10px] leading-[1.5]">
      <span className="text-[#7fc8e0]">{label}</span>
      <span className={accent ? "font-bold text-[#ffd46e]" : "font-bold text-[#26d5ff]"}>{value}</span>
    </div>
  );
}

function pauseSquareSprite(active: boolean, disabled = false, empty = false): UiSpriteId {
  if (disabled) return "skillSlotDisabled";
  if (active) return "skillSlotActive";
  if (empty) return "skillSlotEmpty";
  return "skillSlotNormal";
}

function PauseSquareIcon({
  active = false,
  disabled = false,
  empty = false,
  iconSrc,
  badgeSrc,
  size,
  iconSize,
  badgeSize,
}: {
  active?: boolean;
  disabled?: boolean;
  empty?: boolean;
  iconSrc?: string;
  badgeSrc?: string;
  size: number;
  iconSize: number;
  badgeSize?: number;
}) {
  return (
    <UiSprite
      id={pauseSquareSprite(active, disabled, empty)}
      width={size}
      height={size}
      className="relative"
    >
      {iconSrc ? (
        <img
          src={iconSrc}
          alt=""
          draggable={false}
          className="absolute object-contain"
          style={{
            width: iconSize,
            height: iconSize,
            left: (size - iconSize) / 2,
            top: (size - iconSize) / 2 + PAUSE_ICON_OFFSET_Y,
            imageRendering: "pixelated",
          }}
        />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center pb-1 text-[8px] font-bold text-[#4a7a9a]">--</span>
      )}
      {badgeSrc && badgeSize ? (
        <img
          src={badgeSrc}
          alt=""
          draggable={false}
          className="absolute"
          style={{
            width: badgeSize,
            height: badgeSize,
            right: 2,
            top: 2,
            imageRendering: "pixelated",
          }}
        />
      ) : null}
    </UiSprite>
  );
}

function AudioVolumeControl({ label, value, onChange }: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const percent = Math.round(value * AUDIO_PERCENT_SCALE);
  const thumbTransform = percent <= 0
    ? "translateX(0)"
    : percent >= AUDIO_PERCENT_SCALE
      ? "translateX(-100%)"
      : "translateX(-50%)";

  return (
    <label className="grid gap-1 text-[10px] leading-none text-[#c8efff]">
      <span className="flex items-center justify-between gap-3">
        <span>{label}</span>
        <span className="font-bold text-[#26d5ff]">{percent}%</span>
      </span>
      <span className="relative block" style={{ height: PAUSE_SLIDER_WRAP_H }}>
        <UiSprite
          id="pauseSliderTrack"
          width={PAUSE_SLIDER_TRACK_W}
          height={PAUSE_SLIDER_TRACK_H}
          className="absolute left-0"
          style={{ top: PAUSE_SLIDER_TRACK_TOP }}
        />
        <span
          className="absolute left-0 block overflow-hidden"
          style={{ width: `${percent}%`, height: PAUSE_SLIDER_TRACK_H, top: PAUSE_SLIDER_TRACK_TOP }}
        >
          <UiSprite
            id="pauseSliderFill"
            width={PAUSE_SLIDER_TRACK_W}
            height={PAUSE_SLIDER_TRACK_H}
          />
        </span>
        <UiSprite
          id="pauseSliderThumb"
          width={PAUSE_SLIDER_THUMB_W}
          height={PAUSE_SLIDER_THUMB_H}
          className="absolute"
          style={{ left: `${percent}%`, top: PAUSE_SLIDER_THUMB_TOP, transform: thumbTransform }}
        />
        <input
          type="range"
          min={0}
          max={AUDIO_PERCENT_SCALE}
          step={5}
          value={percent}
          className="absolute inset-0 w-full cursor-pointer opacity-0"
          onChange={(event) => onChange(Number(event.currentTarget.value) / AUDIO_PERCENT_SCALE)}
        />
      </span>
    </label>
  );
}

export function PauseScreen({ snapshot }: { snapshot: GameSnapshot }) {
  const { player, equipment } = snapshot;
  const [activeTab, setActiveTab] = useState<PauseTab>("info");
  const [selectedSkillSlot, setSelectedSkillSlot] = useState(0);
  const [selectedEquipmentSlot, setSelectedEquipmentSlot] = useState<EquipmentSlot>("blade");
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
                  gridTemplateColumns: `${PAUSE_CURRENT_COLUMN_W}px ${PAUSE_CHOICES_COLUMN_W}px`,
                  columnGap: PAUSE_COLUMN_GAP,
                }}
              >
                <div className="grid content-start" style={{ rowGap: PAUSE_CURRENT_ROW_GAP }}>
                  {EQUIPMENT_SLOTS.map((slot) => {
                    const item = equipment.equipped[slot];
                    const active = selectedEquipmentSlot === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        className="grid items-center border-0 bg-transparent p-0 text-left"
                        style={{ gridTemplateColumns: `${PAUSE_CURRENT_FRAME_SIZE}px 1fr`, columnGap: PAUSE_CHOICE_GRID_GAP }}
                        onClick={() => setSelectedEquipmentSlot(slot)}
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
                        <span className="min-w-0 pt-1">
                          <span className={`block text-[7px] leading-none ${active ? "text-[#26d5ff]" : "text-[#7fc8e0]"}`}>{EQUIPMENT_SLOT_LABELS[slot]}</span>
                          <span className="mt-1 block truncate text-[8px] font-bold leading-none text-[#d9f6ff]">{item?.name ?? "未装备"}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div
                  className="grid h-full min-h-0 overflow-hidden text-[9px] leading-none"
                  style={{ gridTemplateRows: "auto 1fr auto", rowGap: PAUSE_CURRENT_ROW_GAP }}
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
                          return (
                            <button
                              key={item.id}
                              type="button"
                              disabled={!unlocked}
                              className={`grid justify-items-center gap-1 border-0 bg-transparent p-0 text-center ${
                                !unlocked
                                  ? "text-[#4a7a9a]"
                                  : equipped
                                    ? "text-[#e8fbff]"
                                    : "text-[#c8efff]"
                              }`}
                              onClick={() => {
                                setSelectedEquipmentSlot(item.slot);
                                equipEquipment(item.slot, item.id);
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
                              <span className="block w-full truncate text-[7px] font-bold leading-none">{item.name}</span>
                              <span className="block w-full truncate text-[6px] leading-none">{unlocked ? EQUIPMENT_SLOT_LABELS[item.slot] : "未解锁"}</span>
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
                  <div className="h-[34px] overflow-hidden text-[7px] leading-[1.45] text-[#7fc8e0]">
                    <div className="truncate font-bold text-[#ffd46e]">
                      {selectedEquipmentItem?.uiTags.join(" · ") ?? `${EQUIPMENT_SLOT_LABELS[selectedEquipmentSlot]} · 空槽`}
                    </div>
                    <div className="mt-1 line-clamp-2">
                      {selectedEquipmentItem?.summary ?? "尚未装备。"}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === "skills" ? (
              <div
                className="grid h-full"
                style={{
                  gridTemplateColumns: `${PAUSE_CURRENT_COLUMN_W}px ${PAUSE_CHOICES_COLUMN_W}px`,
                  columnGap: PAUSE_COLUMN_GAP,
                }}
              >
                <div className="grid content-start" style={{ rowGap: PAUSE_CURRENT_ROW_GAP }}>
                  {player.equippedSkillIds.map((skillId, index) => {
                    const skill = getSkill(skillId);
                    const active = selectedSkillSlot === index;
                    const level = skillId ? player.skillLevels[skillId] : undefined;
                    return (
                      <button
                        key={index}
                        type="button"
                        className="grid items-center border-0 bg-transparent p-0 text-left"
                        style={{ gridTemplateColumns: `${PAUSE_CURRENT_FRAME_SIZE}px 1fr`, columnGap: PAUSE_CHOICE_GRID_GAP }}
                        onClick={() => setSelectedSkillSlot(index)}
                      >
                        <PauseSquareIcon
                          active={active}
                          empty={!skill}
                          iconSrc={skillId ? skillIconSrc(skillId) : undefined}
                          size={PAUSE_CURRENT_FRAME_SIZE}
                          iconSize={PAUSE_CURRENT_ICON_SIZE}
                        />
                        <span className="min-w-0 pt-1">
                          <span className={`block text-[7px] leading-none ${active ? "text-[#26d5ff]" : "text-[#7fc8e0]"}`}>槽位 {index + 1}</span>
                          <span className="mt-1 block truncate text-[8px] font-bold leading-none text-[#d9f6ff]">{skill ? `${skill.name} ${romanLevel(level)}` : "空槽"}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div
                  className="grid h-full min-h-0 overflow-hidden text-[9px] leading-none"
                  style={{ gridTemplateRows: "auto 1fr auto", rowGap: PAUSE_CURRENT_ROW_GAP }}
                >
                  <div className="flex items-center justify-between gap-3 text-[8px] leading-none text-[#7fc8e0]">
                    <span>全部技能</span>
                    <span className="truncate text-[#26d5ff]">槽位 {selectedSkillSlot + 1} · {selectedSkill?.name ?? "空槽"}</span>
                  </div>
                  <div className="min-h-0 overflow-y-auto overflow-x-hidden">
                    {SKILLS.length > 0 ? (
                      <div
                        className="grid content-start"
                        style={{ gridTemplateColumns: "repeat(4, 78px)", gap: PAUSE_CHOICE_GRID_GAP }}
                      >
                        {SKILLS.map((skill) => {
                          const learned = Boolean(player.skillLevels[skill.id]);
                          const equippedElsewhere = player.equippedSkillIds.some((skillId, index) => (
                            index !== selectedSkillSlot && skillId === skill.id
                          ));
                          const current = player.equippedSkillIds[selectedSkillSlot] === skill.id;
                          return (
                            <button
                              key={skill.id}
                              type="button"
                              disabled={!learned || equippedElsewhere}
                              className={`grid justify-items-center gap-1 border-0 bg-transparent p-0 text-center ${
                                !learned || equippedElsewhere
                                  ? "text-[#4a7a9a]"
                                  : current
                                    ? "text-[#e8fbff]"
                                    : "text-[#c8efff]"
                              }`}
                              onClick={() => equipSkillSlot(selectedSkillSlot, skill.id)}
                            >
                              <PauseSquareIcon
                                active={current}
                                disabled={!learned || equippedElsewhere}
                                iconSrc={skillIconSrc(skill.id)}
                                size={PAUSE_CHOICE_FRAME_SIZE}
                                iconSize={PAUSE_CHOICE_ICON_SIZE}
                              />
                              <span className="block w-full truncate text-[7px] font-bold leading-none">{skill.name}</span>
                              <span className="block w-full truncate text-[6px] leading-none">{learned ? romanLevel(player.skillLevels[skill.id]) : "未解锁"}</span>
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
                  <div className="h-[34px] overflow-hidden text-[7px] leading-[1.45] text-[#7fc8e0]">
                    <div className="truncate font-bold text-[#ffd46e]">
                      {selectedSkill ? `${selectedSkill.name} ${romanLevel(player.skillLevels[selectedSkill.id])}` : `槽位 ${selectedSkillSlot + 1} · 空槽`}
                    </div>
                    <div className="mt-1 line-clamp-2">
                      {selectedSkill?.description ?? "尚未装备。"}
                    </div>
                  </div>
                </div>
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
