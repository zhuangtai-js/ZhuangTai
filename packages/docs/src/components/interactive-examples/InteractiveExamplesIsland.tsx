import * as React from "react";
import { codeByExample } from "./code";
import { copies } from "./copy";
import { CounterExample } from "./CounterExample";
import { PreferencesExample } from "./PreferencesExample";
import { panelLabel } from "./styles";
import { TasksExample } from "./TasksExample";
import { exampleNames, type ExampleName, type Locale } from "./types";

export function InteractiveExamples({ locale = "zh" }: { readonly locale?: Locale }) {
  const copy = copies[locale];
  const [activeExample, setActiveExample] = React.useState<ExampleName>("counter");
  const tabRefs = React.useRef(new Map<ExampleName, HTMLButtonElement>());
  const id = React.useId().replaceAll(":", "");
  const panelId = `interactive-example-${id}-panel`;

  function handleTabKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number): void {
    const lastIndex = exampleNames.length - 1;
    const nextIndex =
      event.key === "ArrowRight"
        ? (index + 1) % exampleNames.length
        : event.key === "ArrowLeft"
          ? (index + lastIndex) % exampleNames.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? lastIndex
              : undefined;
    if (nextIndex === undefined) return;
    event.preventDefault();
    const nextExample = exampleNames[nextIndex];
    if (nextExample !== undefined) {
      setActiveExample(nextExample);
      tabRefs.current.get(nextExample)?.focus();
    }
  }

  return (
    <section
      className="my-8! w-full overflow-hidden rounded-2xl border border-[var(--sl-color-hairline)] bg-[var(--sl-color-bg)] shadow-sm"
      data-interactive-examples
      data-locale={locale}>
      <header className="m-0! border-b border-[var(--sl-color-hairline)] p-5 sm:p-6">
        <div className="m-0! min-w-0">
          <p className={panelLabel}>{copy.eyebrow}</p>
          <h2 className="mt-3! mb-0! text-[clamp(1.25rem,3vw,1.7rem)] leading-tight tracking-[-0.02em]">
            {copy.title}
          </h2>
          <p className="mt-2! mb-0! max-w-[42rem] text-sm leading-6 text-pretty text-[var(--sl-color-gray-2)]">
            {copy.intro.before} <code className="whitespace-nowrap">{copy.intro.packageName}</code>
            {copy.intro.after}
          </p>
        </div>
        <div
          className="m-0! mt-5! grid grid-cols-3 gap-1 rounded-xl border border-[var(--sl-color-hairline)] bg-[var(--sl-color-bg-nav)] p-1"
          role="tablist"
          aria-label={copy.examplesLabel}>
          {exampleNames.map((name, index) => {
            const selected = activeExample === name;
            return (
              <button
                key={name}
                ref={(element) => {
                  if (element === null) {
                    tabRefs.current.delete(name);
                  } else {
                    tabRefs.current.set(name, element);
                  }
                }}
                type="button"
                id={`interactive-example-${id}-${name}-tab`}
                role="tab"
                className={`m-0! inline-flex h-10 min-w-0 cursor-pointer items-center justify-center rounded-lg border-0 px-2 text-sm leading-none font-semibold whitespace-nowrap transition-colors duration-150 outline-none focus-visible:ring-3 focus-visible:ring-[var(--sl-color-accent-low)] motion-reduce:transition-none max-[22rem]:px-1 max-[22rem]:text-xs ${selected ? "bg-[var(--sl-color-bg)] text-[var(--sl-color-text-accent)] shadow-sm" : "bg-transparent text-[var(--sl-color-gray-2)] hover:text-[var(--sl-color-text)]"}`}
                aria-controls={panelId}
                aria-selected={selected}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActiveExample(name)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}>
                {copy.examples[name]}
              </button>
            );
          })}
        </div>
      </header>
      <div
        className="m-0! min-w-0"
        id={panelId}
        role="tabpanel"
        aria-labelledby={`interactive-example-${id}-${activeExample}-tab`}>
        <section
          className="m-0! min-w-0 p-5 sm:p-6"
          aria-labelledby={`interactive-example-${id}-preview-label`}>
          <h3
            className={panelLabel}
            id={`interactive-example-${id}-preview-label`}>
            {copy.preview}
          </h3>
          <div className="m-0! mt-4!">
            {activeExample === "counter" ? <CounterExample locale={locale} /> : null}
            {activeExample === "tasks" ? <TasksExample locale={locale} /> : null}
            {activeExample === "preferences" ? <PreferencesExample locale={locale} /> : null}
          </div>
        </section>
        <section
          className="m-0! min-w-0 border-t border-[var(--sl-color-hairline)] bg-[var(--sl-color-bg-nav)] p-5 sm:p-6"
          aria-labelledby={`interactive-example-${id}-source-label`}>
          <h3
            className={panelLabel}
            id={`interactive-example-${id}-source-label`}>
            {copy.source}
          </h3>
          <pre className="m-0! mt-4! max-h-[28rem] overflow-auto rounded-xl border border-[var(--sl-color-hairline)] bg-[var(--sl-color-bg)] p-4">
            <code className="text-[0.78rem] leading-[1.65] text-[var(--sl-color-gray-1)]">
              {codeByExample[activeExample]}
            </code>
          </pre>
        </section>
      </div>
    </section>
  );
}
