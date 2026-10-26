import { useAtomValue } from "jotai";
import { PLAYER_CONTROL_KEYS } from "../constants";
import { languageAtom } from "../i18n/language";
import { skillName } from "../i18n/skillCopy";
import { message } from "../i18n/messages";
import { touchSkillSlotsAtom } from "./hudSubscriptions";
import { skillIconSrc } from "./uiDisplay";

export function TouchSkillSlots() {
  const slots = useAtomValue(touchSkillSlotsAtom);
  const language = useAtomValue(languageAtom);
  const switchSkill = message(language, "controls.switchSkill");
  return (
    <div className="touch-skill-slots" role="group" aria-label={switchSkill}>
      {[slots.first, slots.second, slots.third].map((skillId, index) => (
        <button
          key={index}
          className="touch-btn touch-skill-slot"
          data-key={PLAYER_CONTROL_KEYS.switchSkill[index]}
          disabled={!skillId}
          aria-pressed={slots.selected === index}
          aria-label={`${switchSkill} ${index + 1}: ${skillId ? skillName(language, skillId) : message(language, "status.emptySlot")}`}
        >
          {skillId && <img src={skillIconSrc(skillId)} alt="" draggable={false} />}
          <span>{index + 1}</span>
        </button>
      ))}
    </div>
  );
}
