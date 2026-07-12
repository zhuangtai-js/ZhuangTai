import { useAtom, useAtomValue } from "@zhuangtai-js/react";
import * as React from "react";
import { copies } from "./copy";
import { countState, doubledCountState } from "./stores";
import { primaryButton, secondaryButton } from "./styles";
import type { Locale } from "./types";

function CounterValues({ locale }: { readonly locale: Locale }) {
  const copy = copies[locale].counter;
  const count = useAtomValue(countState);
  const doubled = useAtomValue(doubledCountState);

  return (
    <div
      className="m-0! mt-6! grid grid-cols-2 gap-3"
      aria-live="polite">
      <div className="m-0! rounded-xl border border-[var(--sl-color-hairline)] bg-[var(--sl-color-bg)] p-4">
        <p className="m-0! text-xs font-semibold text-[var(--sl-color-gray-2)]">{copy.current}</p>
        <strong className="mt-2! block text-4xl leading-none tracking-[-0.04em]">{count}</strong>
      </div>
      <div className="m-0! rounded-xl border border-[var(--sl-color-hairline)] bg-[var(--sl-color-bg)] p-4">
        <p className="m-0! text-xs font-semibold text-[var(--sl-color-gray-2)]">{copy.doubled}</p>
        <strong className="mt-2! block text-4xl leading-none tracking-[-0.04em] text-[var(--sl-color-text-accent)]">
          {doubled}
        </strong>
      </div>
    </div>
  );
}

function CounterControls({ locale }: { readonly locale: Locale }) {
  const copy = copies[locale].counter;
  const [, setCount] = useAtom(countState);

  return (
    <div className="m-0! mt-4! grid grid-cols-[2.75rem_minmax(6rem,1fr)_2.75rem] gap-2">
      <button
        type="button"
        className={`${secondaryButton} w-11 px-0 text-lg`}
        aria-label={copy.decrease}
        onClick={() => setCount((value) => value - 1)}>
        −
      </button>
      <button
        type="button"
        className={secondaryButton}
        onClick={() => setCount(0)}>
        {copy.reset}
      </button>
      <button
        type="button"
        className={`${primaryButton} w-11 px-0 text-lg`}
        aria-label={copy.increase}
        onClick={() => setCount((value) => value + 1)}>
        +
      </button>
    </div>
  );
}

export function CounterExample({ locale }: { readonly locale: Locale }) {
  const copy = copies[locale].counter;

  return (
    <div className="m-0! rounded-2xl border border-[var(--sl-color-hairline)] bg-[var(--sl-color-bg-nav)] p-5">
      <div className="m-0! flex flex-wrap items-start justify-between gap-4">
        <div className="m-0!">
          <h4 className="m-0! text-lg leading-tight">{copy.title}</h4>
          <p className="mt-1! mb-0! text-sm leading-6 text-[var(--sl-color-gray-2)]">
            {copy.description}
          </p>
        </div>
        <span className="m-0! inline-flex h-8 items-center rounded-full bg-[var(--sl-color-accent-low)] px-3 text-xs font-bold text-[var(--sl-color-accent-high)]">
          atom + computed
        </span>
      </div>
      <CounterValues locale={locale} />
      <CounterControls locale={locale} />
    </div>
  );
}
