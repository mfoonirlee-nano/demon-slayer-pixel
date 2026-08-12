import type { ReactNode } from "react";
import { useAtomValue } from "jotai";
import {
  controlKeyLabel,
  PLAYER_CONTROL_KEYS,
  REWARD_CONTROL_KEYS,
  type ControlKey,
} from "../constants";
import { languageAtom } from "../i18n/language";
import { message, type MessageKey } from "../i18n/messages";

type ControlGuideVariant = "cover" | "pause";
type ControlTone = "default" | "spirit" | "ultimate";

type ControlBinding = {
  keyGroups: readonly (readonly ControlKey[])[];
  connector?: "+" | "·";
  labelKey: MessageKey;
  noteKey?: MessageKey;
  tone?: ControlTone;
};

type ControlGroup = {
  titleKey: MessageKey;
  bindings: readonly ControlBinding[];
};

export const CONTROL_GROUPS: readonly ControlGroup[] = [
  {
    titleKey: "controls.group.movement",
    bindings: [
      {
        keyGroups: [[PLAYER_CONTROL_KEYS.moveLeft, PLAYER_CONTROL_KEYS.moveRight]],
        labelKey: "controls.move",
      },
      { keyGroups: [PLAYER_CONTROL_KEYS.jump], labelKey: "controls.jump" },
      {
        keyGroups: [
          PLAYER_CONTROL_KEYS.fallAttackModifier,
          [PLAYER_CONTROL_KEYS.attack],
        ],
        connector: "+",
        labelKey: "controls.fallAttack",
        noteKey: "controls.fallAttackHint",
      },
    ],
  },
  {
    titleKey: "controls.group.combat",
    bindings: [
      { keyGroups: [[PLAYER_CONTROL_KEYS.attack]], labelKey: "controls.attack" },
      {
        keyGroups: [[PLAYER_CONTROL_KEYS.skill]],
        labelKey: "controls.skill",
        tone: "spirit",
      },
      {
        keyGroups: [[PLAYER_CONTROL_KEYS.ultimate]],
        labelKey: "controls.ultimate",
        noteKey: "controls.ultimateHint",
        tone: "ultimate",
      },
      {
        keyGroups: [[PLAYER_CONTROL_KEYS.heal]],
        labelKey: "controls.heal",
        noteKey: "controls.healHint",
        tone: "spirit",
      },
    ],
  },
  {
    titleKey: "controls.group.tactics",
    bindings: [
      {
        keyGroups: [PLAYER_CONTROL_KEYS.switchSkill],
        labelKey: "controls.switchSkill",
      },
      { keyGroups: [PLAYER_CONTROL_KEYS.pause], labelKey: "controls.pause" },
      {
        keyGroups: [
          [REWARD_CONTROL_KEYS.previous, REWARD_CONTROL_KEYS.next],
          [REWARD_CONTROL_KEYS.confirm],
        ],
        connector: "·",
        labelKey: "controls.reward",
        noteKey: "controls.rewardHint",
      },
      { keyGroups: [[PLAYER_CONTROL_KEYS.restart]], labelKey: "controls.restart" },
    ],
  },
] as const;

function ControlShortcut({ binding }: { binding: ControlBinding }) {
  const shortcutLabel = binding.keyGroups
    .map((keyGroup) => keyGroup.map(controlKeyLabel).join(" / "))
    .join(` ${binding.connector ?? ""} `);

  return (
    <span className="controls-guide-shortcut" aria-label={shortcutLabel}>
      {binding.keyGroups.map((keyGroup, groupIndex) => (
        <span key={keyGroup.join("-")} className="controls-guide-key-pair">
          {groupIndex > 0 ? (
            <span className="controls-guide-key-connector" aria-hidden="true">
              {binding.connector}
            </span>
          ) : null}
          {keyGroup.map((key, keyIndex) => (
            <span key={key} className="controls-guide-key-alternative">
              {keyIndex > 0 ? (
                <span className="controls-guide-key-connector" aria-hidden="true">/</span>
              ) : null}
              <kbd>{controlKeyLabel(key)}</kbd>
            </span>
          ))}
        </span>
      ))}
    </span>
  );
}

export function ControlsGuide({
  variant = "cover",
  headingId = "controls-guide-title",
  actions,
}: {
  variant?: ControlGuideVariant;
  headingId?: string;
  actions?: ReactNode;
}) {
  const language = useAtomValue(languageAtom);

  return (
    <section
      className={`controls-guide controls-guide--${variant}`}
      aria-labelledby={headingId}
    >
      <header className="controls-guide-header">
        <span className="controls-guide-moon-mark" aria-hidden="true">
          {variant === "pause" ? "◐" : null}
        </span>
        <div>
          <h2 id={headingId}>{message(language, "controls.title")}</h2>
          <p>{message(language, "controls.subtitle")}</p>
        </div>
        <span className="controls-guide-moon-mark controls-guide-moon-mark--end" aria-hidden="true">
          {variant === "pause" ? "◑" : null}
        </span>
      </header>

      <div className="controls-guide-groups">
        {CONTROL_GROUPS.map((group, groupIndex) => {
          const groupTitleId = `${headingId}-group-${groupIndex}`;
          return (
            <section
              key={group.titleKey}
              className="controls-guide-group"
              aria-labelledby={groupTitleId}
            >
              <h3 id={groupTitleId}>{message(language, group.titleKey)}</h3>
              <dl>
                {group.bindings.map((binding) => (
                  <div
                    key={binding.labelKey}
                    className={`controls-guide-binding controls-guide-binding--${binding.tone ?? "default"}`}
                  >
                    <dt><ControlShortcut binding={binding} /></dt>
                    <dd>
                      <span>{message(language, binding.labelKey)}</span>
                      {binding.noteKey ? <small>{message(language, binding.noteKey)}</small> : null}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          );
        })}
      </div>

      <footer className="controls-guide-footer">
        <p>{message(language, "controls.footer")}</p>
        {actions ? <div className="controls-guide-actions">{actions}</div> : null}
      </footer>
    </section>
  );
}
