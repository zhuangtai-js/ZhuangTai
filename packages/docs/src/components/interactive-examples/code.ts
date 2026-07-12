import type { ExampleName } from "./types";

export const codeByExample = {
  counter: `import { atom, computed } from "@zhuangtai-js/core";
import { useAtom, useAtomValue } from "@zhuangtai-js/react";

const count = atom(3);
const doubled = computed(() => count.get() * 2);

function CounterValue() {
  const value = useAtomValue(count);
  const doubledValue = useAtomValue(doubled);
  return <output>{value} · doubled {doubledValue}</output>;
}

function CounterControls() {
  const [, setCount] = useAtom(count);
  return (
    <div>
      <button onClick={() => setCount((value) => value - 1)}>−</button>
      <button onClick={() => setCount(0)}>Reset</button>
      <button onClick={() => setCount((value) => value + 1)}>+</button>
    </div>
  );
}`,
  tasks: `import { atom, computed } from "@zhuangtai-js/core";
import { useAtom, useAtomValue } from "@zhuangtai-js/react";
import * as React from "react";

type Task = { id: number; title: string; done: boolean };
type TaskFilter = "all" | "active" | "done";

const tasks = atom<Task[]>([]);
const filter = atom<TaskFilter>("all");
const visibleTasks = computed(() => {
  const mode = filter.get();
  return tasks.get().filter((task) =>
    mode === "all" ? true : mode === "done" ? task.done : !task.done,
  );
});
const completedCount = computed(
  () => tasks.get().filter((task) => task.done).length,
);

function TaskList() {
  const [items, setItems] = useAtom(tasks);
  const [mode, setMode] = useAtom(filter);
  const visible = useAtomValue(visibleTasks);
  const completed = useAtomValue(completedCount);
  const [draft, setDraft] = React.useState("");

  function add(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = draft.trim();
    if (!title) return;
    setItems((current) => {
      const nextId = current.reduce(
        (highest, task) => Math.max(highest, task.id),
        0,
      ) + 1;
      return [...current, { id: nextId, title, done: false }];
    });
    setDraft("");
  }

  const toggle = (id: number) => setItems((current) =>
    current.map((task) =>
      task.id === id ? { ...task, done: !task.done } : task,
    ),
  );
  const remove = (id: number) => setItems((current) =>
    current.filter((task) => task.id !== id),
  );

  return (
    <>
      <form onSubmit={add}>
        <input value={draft} onChange={(event) => setDraft(event.target.value)} />
        <button type="submit">Add task</button>
      </form>
      <div>
        {(["all", "active", "done"] as const).map((name) => (
          <button key={name} onClick={() => setMode(name)} aria-pressed={mode === name}>
            {name}
          </button>
        ))}
      </div>
      <ul>
        {visible.map((task) => (
          <li key={task.id}>
            <label>
              <input type="checkbox" checked={task.done} onChange={() => toggle(task.id)} />
              {task.title}
            </label>
            <button onClick={() => remove(task.id)}>Remove</button>
          </li>
        ))}
      </ul>
      <output>{completed} of {items.length} completed</output>
    </>
  );
}`,
  preferences: `import { useAtom, useAtomValue } from "@zhuangtai-js/react";
import { createPreferencesStore } from "./preferences-store";

// The helper validates stored JSON and falls back to memory when
// rendering on the server or when browser storage is unavailable.
const { value: preferences, persisted } = createPreferencesStore();

function Preferences() {
  const [value, setValue] = useAtom(preferences);
  const isPersisted = useAtomValue(persisted);
  return (
    <>
      <button
        aria-pressed={value.theme === "light"}
        onClick={() => setValue({ ...value, theme: "light" })}
      >
        Light
      </button>
      <button
        aria-pressed={value.theme === "dark"}
        onClick={() => setValue({ ...value, theme: "dark" })}
      >
        Dark
      </button>
      <button
        aria-pressed={value.density === "comfortable"}
        onClick={() => setValue({ ...value, density: "comfortable" })}
      >
        Comfortable
      </button>
      <button
        aria-pressed={value.density === "compact"}
        onClick={() => setValue({ ...value, density: "compact" })}
      >
        Compact
      </button>
      <output>
        {isPersisted ? "Saved in this browser" : "Using session memory"}
      </output>
    </>
  );
}`,
} as const satisfies Record<ExampleName, string>;
