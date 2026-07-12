import { useAtom, useAtomValue } from "@zhuangtai-js/react";
import * as React from "react";
import { copies } from "./copy";
import { taskStores } from "./stores";
import { fieldClass, primaryButton } from "./styles";
import type { Locale } from "./types";

export function TasksExample({ locale }: { readonly locale: Locale }) {
  const copy = copies[locale].tasks;
  const fieldId = React.useId();
  const store = taskStores[locale];
  const [tasks, setTasks] = useAtom(store.tasks);
  const [filter, setFilter] = useAtom(store.filter);
  const visibleTasks = useAtomValue(store.visibleTasks);
  const completedCount = useAtomValue(store.completedCount);
  const [draft, setDraft] = React.useState("");

  function addTask(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const title = draft.trim();
    if (title.length === 0) return;
    setTasks((items) => {
      const nextId = items.reduce((highestId, task) => Math.max(highestId, task.id), 0) + 1;
      return [...items, { id: nextId, title, done: false }];
    });
    setDraft("");
  }

  function toggleTask(id: number): void {
    setTasks((items) =>
      items.map((task) => (task.id === id ? { ...task, done: !task.done } : task)),
    );
  }

  function removeTask(id: number): void {
    setTasks((items) => items.filter((task) => task.id !== id));
  }

  return (
    <div className="m-0! rounded-2xl border border-[var(--sl-color-hairline)] bg-[var(--sl-color-bg-nav)] p-5">
      <h4 className="m-0! text-lg leading-tight">{copy.title}</h4>
      <p className="mt-1! mb-0! text-sm leading-6 text-balance text-[var(--sl-color-gray-2)]">
        {copy.description}
      </p>
      <form
        className="m-0! mt-5! grid grid-cols-[minmax(0,1fr)_auto] gap-2 max-[28rem]:grid-cols-1"
        onSubmit={addTask}>
        <input
          id={`${fieldId}-draft`}
          name="task-title"
          className={fieldClass}
          value={draft}
          placeholder={copy.placeholder}
          aria-label={copy.placeholder}
          onChange={(event) => setDraft(event.currentTarget.value)}
        />
        <button
          type="submit"
          className={primaryButton}
          disabled={draft.trim().length === 0}>
          {copy.add}
        </button>
      </form>
      <fieldset className="m-0! mt-4! grid grid-cols-3 gap-1 rounded-xl border-0 bg-[var(--sl-color-gray-6)] p-1">
        <legend className="sr-only">{copy.filterLabel}</legend>
        {(["all", "active", "done"] as const).map((name) => (
          <button
            key={name}
            type="button"
            className={`m-0! inline-flex h-10 cursor-pointer items-center justify-center rounded-lg border-0 px-2 text-xs font-semibold outline-none focus-visible:ring-3 focus-visible:ring-[var(--sl-color-accent-low)] ${filter === name ? "bg-[var(--sl-color-bg)] text-[var(--sl-color-text)] shadow-sm" : "bg-transparent text-[var(--sl-color-gray-2)] hover:text-[var(--sl-color-text)]"}`}
            aria-pressed={filter === name}
            onClick={() => setFilter(name)}>
            {copy.filters[name]}
          </button>
        ))}
      </fieldset>
      <ul
        className="m-0! mt-4! grid list-none gap-2 p-0"
        aria-live="polite">
        {visibleTasks.length === 0 ? (
          <li className="m-0! rounded-xl border border-dashed border-[var(--sl-color-hairline-light)] px-4 py-6 text-center text-sm text-[var(--sl-color-gray-2)]">
            {copy.empty}
          </li>
        ) : (
          visibleTasks.map((task) => (
            <li
              key={task.id}
              className="m-0! grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-[var(--sl-color-hairline)] bg-[var(--sl-color-bg)] px-2 py-1.5">
              <label
                htmlFor={`${fieldId}-task-${task.id}`}
                className="m-0! grid min-h-10 min-w-0 cursor-pointer grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-lg px-2 outline-none focus-within:ring-3 focus-within:ring-[var(--sl-color-accent-low)]">
                <input
                  id={`${fieldId}-task-${task.id}`}
                  name="tasks"
                  value={String(task.id)}
                  className="m-0! size-5 shrink-0 accent-[var(--sl-color-accent)]"
                  type="checkbox"
                  checked={task.done}
                  onChange={() => toggleTask(task.id)}
                />
                <span
                  className={`min-w-0 text-sm leading-5 [overflow-wrap:anywhere] ${task.done ? "text-[var(--sl-color-gray-3)] line-through" : "text-[var(--sl-color-text)]"}`}>
                  {task.title}
                </span>
              </label>
              <button
                type="button"
                className="m-0! inline-flex h-10 cursor-pointer items-center rounded-lg border-0 bg-transparent px-3 text-xs font-semibold text-[var(--sl-color-gray-2)] outline-none hover:bg-[var(--sl-color-gray-6)] hover:text-[var(--sl-color-text)] focus-visible:ring-3 focus-visible:ring-[var(--sl-color-accent-low)]"
                aria-label={copy.removeLabel(task.title)}
                onClick={() => removeTask(task.id)}>
                {copy.remove}
              </button>
            </li>
          ))
        )}
      </ul>
      <p
        className="mt-4! mb-0! text-sm font-semibold text-[var(--sl-color-text-accent)]"
        aria-live="polite">
        {copy.summary(completedCount, tasks.length)}
      </p>
    </div>
  );
}
