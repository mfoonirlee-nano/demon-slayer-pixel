import { useAtom } from "jotai";
import { useState } from "react";
import { getAudioVolumeSettings, setAudioVolumeSettings, type AudioVolumeSettings } from "../../game/audio";
import { languageAtom } from "../../i18n/language";
import { message } from "../../i18n/messages";
import {
  PAUSE_SETTINGS_GAP,
  PAUSE_SETTINGS_INSET_X,
  PAUSE_TAB_BODY_INSET_BOTTOM,
  PAUSE_TAB_BODY_INSET_TOP,
} from "./constants";
import { AudioVolumeControl } from "./components";
import { LanguageControl } from "./languageControl";

export function PauseSettings() {
  const [currentLanguage, setLanguage] = useAtom(languageAtom);
  const [volumeSettings, setVolumeSettings] = useState<AudioVolumeSettings>(() => (
    getAudioVolumeSettings()
  ));

  const updateVolume = (setting: keyof AudioVolumeSettings, value: number) => {
    setVolumeSettings(setAudioVolumeSettings({ [setting]: value }));
  };

  return (
    <div
      className="grid h-full content-start overflow-hidden"
      style={{
        gap: PAUSE_SETTINGS_GAP,
        paddingInline: PAUSE_SETTINGS_INSET_X,
        paddingTop: PAUSE_TAB_BODY_INSET_TOP,
        paddingBottom: PAUSE_TAB_BODY_INSET_BOTTOM,
      }}
    >
      <AudioVolumeControl
        label={message(currentLanguage, "settings.masterVolume")}
        value={volumeSettings.master}
        onChange={(value) => updateVolume("master", value)}
      />
      <AudioVolumeControl
        label={message(currentLanguage, "settings.soundEffects")}
        value={volumeSettings.sfx}
        onChange={(value) => updateVolume("sfx", value)}
      />
      <LanguageControl
        language={currentLanguage}
        label={message(currentLanguage, "settings.language")}
        onChange={setLanguage}
      />
    </div>
  );
}
