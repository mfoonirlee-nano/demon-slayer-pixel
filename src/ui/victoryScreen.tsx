import { useAtomValue } from "jotai";
import { languageAtom } from "../i18n/language";
import { message } from "../i18n/messages";

export function VictoryScreen({ elapsed }: { elapsed: number }) {
  const language = useAtomValue(languageAtom);

  return (
    <div className="victory-screen absolute inset-0 z-50 flex flex-col items-center justify-center px-6 text-center text-white">
      <div className="victory-title">{message(language, "victory.title")}</div>
      <div className="victory-message space-y-3">
        <div className="victory-clear-text">
          {message(language, "victory.clearTime", { seconds: elapsed.toFixed(1) })}
        </div>
        <div className="victory-restart-text">{message(language, "common.restart")}</div>
      </div>
    </div>
  );
}
