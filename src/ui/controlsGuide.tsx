import type { ReactNode } from "react";
import { useAtomValue } from "jotai";
import { languageAtom } from "../i18n/language";
import { message, type MessageKey } from "../i18n/messages";

type ControlGuideVariant = "dialog" | "pause";
type ControlTone = "default" | "spirit" | "ultimate";

type ControlBinding = {
  keys: readonly string[];
  connector?: "/" | "+" | "·";
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
      { keys: ["A", "D"], connector: "/", labelKey: "controls.move" },
      { keys: ["W", "Space"], connector: "/", labelKey: "controls.jump" },
      {
        keys: ["S / ↓", "J"],
        connector: "+",
        labelKey: "controls.fallAttack",
        noteKey: "controls.fallAttackHint",
      },
    ],
  },
  {
    titleKey: "controls.group.combat",
    bindings: [
      { keys: ["J"], labelKey: "controls.attack" },
      { keys: ["K"], labelKey: "controls.skill", tone: "spirit" },
      {
        keys: ["L"],
        labelKey: "controls.ultimate",
        noteKey: "controls.ultimateHint",
        tone: "ultimate",
      },
      {
        keys: ["H"],
        labelKey: "controls.heal",
        noteKey: "controls.healHint",
        tone: "spirit",
      },
    ],
  },
  {
    titleKey: "controls.group.tactics",
    bindings: [
      { keys: ["1", "2", "3"], connector: "/", labelKey: "controls.switchSkill" },
      { keys: ["Esc", "P"], connector: "/", labelKey: "controls.pause" },
      {
        keys: ["← / →", "Enter"],
        connector: "·",
        labelKey: "controls.reward",
        noteKey: "controls.rewardHint",
      },
      { keys: ["R"], labelKey: "controls.restart" },
    ],
  },
] as const;

function ControlShortcut({ binding }: { binding: ControlBinding }) {
  return (
    <span className="controls-guide-shortcut">
      {binding.keys.map((keyLabel, index) => (
        <span key={`${keyLabel}-${index}`} className="controls-guide-key-pair">
          {index > 0 ? (
            <span className="controls-guide-key-connector" aria-hidden="true">
              {binding.connector}
            </span>
          ) : null}
          <kbd>{keyLabel}</kbd>
        </span>
      ))}
    </span>
  );
}

export function ControlsGuide({
  variant = "dialog",
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
        <span className="controls-guide-moon-mark" aria-hidden="true">◐</span>
        <div>
          <h2 id={headingId}>{message(language, "controls.title")}</h2>
          <p>{message(language, "controls.subtitle")}</p>
        </div>
        <span className="controls-guide-moon-mark controls-guide-moon-mark--end" aria-hidden="true">◑</span>
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
