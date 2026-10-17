import { useAtomValue } from "jotai";
import type { SpriteLoadProgress } from "../assets";
import { languageAtom } from "../i18n/language";
import { message } from "../i18n/messages";

const PERCENT_SCALE = 100;

export function AssetLoadingProgress({ progress }: { progress: SpriteLoadProgress }) {
  const language = useAtomValue(languageAtom);
  const percent = progress.total === 0 ? 0 : Math.floor(progress.loaded / progress.total * PERCENT_SCALE);
  return (
    <div className="asset-loading-panel">
      <div className="asset-loading-heading">
        <span>{message(language, "loading.sprites")}</span>
        <span>{percent}%</span>
      </div>
      <progress
        className="asset-loading-bar"
        value={progress.loaded}
        max={Math.max(1, progress.total)}
        aria-label={message(language, "loading.sprites")}
      />
      <div>{message(language, "loading.count", { loaded: progress.loaded, total: progress.total })}</div>
      {progress.status === "error" ? (
        <div role="alert" className="asset-loading-error">
          {message(language, "loading.failed", { count: progress.failed.length })}
        </div>
      ) : null}
    </div>
  );
}
