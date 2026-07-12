import { useAtom, useAtomValue } from "@zhuangtai-js/react";
import * as React from "react";
import { copies } from "./copy";
import { preferencesStore } from "./stores";
import { primaryButton, secondaryButton } from "./styles";
import type { Locale } from "./types";

export function PreferencesExample({ locale }: { readonly locale: Locale }) {
  const copy = copies[locale].preferences;
  const store = preferencesStore;
  const [preferences, setPreferences] = useAtom(store.value);
  const persisted = useAtomValue(store.persisted);
  const isDark = preferences.theme === "dark";
  const isCompact = preferences.density === "compact";

  return (
    <div className="m-0! rounded-2xl border border-[var(--sl-color-hairline)] bg-[var(--sl-color-bg-nav)] p-5">
      <h4 className="m-0! text-lg leading-tight">{copy.title}</h4>
      <p className="mt-1! mb-0! text-sm leading-6 text-[var(--sl-color-gray-2)]">
        {copy.description}
      </p>
      <div className="m-0! mt-5! grid gap-4">
        <fieldset className="m-0! grid gap-2 border-0 p-0">
          <legend className="m-0! text-xs font-bold text-[var(--sl-color-gray-2)]">
            {copy.theme}
          </legend>
          <div className="m-0! grid grid-cols-2 gap-2">
            {(["light", "dark"] as const).map((theme) => (
              <button
                key={theme}
                type="button"
                className={preferences.theme === theme ? primaryButton : secondaryButton}
                aria-pressed={preferences.theme === theme}
                onClick={() => setPreferences({ ...preferences, theme })}>
                {copy[theme]}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="m-0! grid gap-2 border-0 p-0">
          <legend className="m-0! text-xs font-bold text-[var(--sl-color-gray-2)]">
            {copy.density}
          </legend>
          <div className="m-0! grid grid-cols-2 gap-2">
            {(["comfortable", "compact"] as const).map((density) => (
              <button
                key={density}
                type="button"
                className={preferences.density === density ? primaryButton : secondaryButton}
                aria-pressed={preferences.density === density}
                onClick={() => setPreferences({ ...preferences, density })}>
                {copy[density]}
              </button>
            ))}
          </div>
        </fieldset>
      </div>
      <div
        className={`m-0! mt-5! rounded-2xl border p-4 transition-colors duration-150 motion-reduce:transition-none ${isDark ? "border-slate-700 bg-slate-950 text-slate-100" : "border-slate-200 bg-white text-slate-900"}`}>
        <div className={`m-0! grid ${isCompact ? "gap-2" : "gap-4"}`}>
          <div className="m-0! flex items-center justify-between gap-3">
            <strong className="text-sm">{copy.previewTitle}</strong>
            <span
              className={`size-2 rounded-full ${isDark ? "bg-sky-400" : "bg-blue-600"}`}
              aria-hidden="true"
            />
          </div>
          <p className={`m-0! ${isCompact ? "text-xs leading-5" : "text-sm leading-6"}`}>
            {copy.previewBody}
          </p>
        </div>
      </div>
      <p
        className="mt-4! mb-0! text-xs font-semibold text-[var(--sl-color-gray-2)]"
        aria-live="polite">
        {persisted ? copy.saved : copy.fallback}
      </p>
    </div>
  );
}
