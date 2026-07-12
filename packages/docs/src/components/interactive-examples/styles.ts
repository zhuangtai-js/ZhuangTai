export const buttonBase =
  "m-0! inline-flex h-10 cursor-pointer items-center justify-center rounded-lg border px-4 text-sm leading-none font-semibold transition-colors duration-150 outline-none motion-reduce:transition-none focus-visible:ring-3 focus-visible:ring-[var(--sl-color-accent-low)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sl-color-bg)] disabled:cursor-not-allowed disabled:opacity-50";

export const primaryButton = `${buttonBase} border-[var(--sl-color-accent)] bg-[var(--sl-color-accent)] text-white hover:bg-[var(--sl-color-accent-high)]`;
export const secondaryButton = `${buttonBase} border-[var(--sl-color-hairline-light)] bg-[var(--sl-color-bg)] text-[var(--sl-color-text)] hover:bg-[var(--sl-color-gray-6)]`;

export const fieldClass =
  "m-0! h-10 min-w-0 rounded-lg border border-[var(--sl-color-hairline-light)] bg-[var(--sl-color-bg)] px-3 text-sm text-[var(--sl-color-text)] outline-none placeholder:text-[var(--sl-color-gray-3)] focus:border-[var(--sl-color-accent)] focus:ring-3 focus:ring-[var(--sl-color-accent-low)]";

export const panelLabel =
  "m-0! text-[0.6875rem] leading-none font-bold tracking-[0.08em] text-[var(--sl-color-gray-2)] uppercase [font-family:var(--__sl-font-mono)]";
