import { atom, computed } from "@zhuangtai-js/core";
import { useAtom, useAtomValue, useSetAtom } from "@zhuangtai-js/react";
import React from "react";

const tasks = atom([
  { id: 1, title: "理解同步语义", done: true },
  { id: 2, title: "运行 React 示例", done: false },
  { id: 3, title: "组合需要的插件", done: false },
]);
const remaining = computed(() => tasks.get().filter((task) => !task.done).length);
let nextTaskId = 4;

export function App() {
  const [items, setItems] = useAtom(tasks);
  const remainingCount = useAtomValue(remaining);

  function addTask(formData: FormData) {
    const fieldValue = formData.get("title");
    if (typeof fieldValue !== "string") {
      return;
    }

    const title = fieldValue.trim();
    if (title.length === 0) {
      return;
    }

    setItems((currentItems) => [...currentItems, { id: nextTaskId++, title, done: false }]);
  }

  return (
    <main className="shell">
      <header>
        <p className="eyebrow">@zhuangtai-js/react</p>
        <h1>状态在组件之外，体验仍像 useState。</h1>
        <p className="lede">
          Core atom 保持框架无关；React 适配器通过 <code>useSyncExternalStore</code> 订阅它。
        </p>
      </header>

      <section
        className="board"
        aria-labelledby="tasks-title">
        <div className="board-heading">
          <div>
            <p className="label">示例任务</p>
            <h2 id="tasks-title">采用清单</h2>
          </div>
          <strong>{remainingCount} 项未完成</strong>
        </div>

        <ul>
          {items.map((task) => (
            <TaskRow
              key={task.id}
              id={task.id}
              title={task.title}
              done={task.done}
            />
          ))}
        </ul>

        <form action={addTask}>
          <label htmlFor="new-task">新增任务</label>
          <div className="field-row">
            <input
              id="new-task"
              name="title"
              placeholder="例如：接入 persist"
              autoComplete="off"
            />
            <button type="submit">添加</button>
          </div>
        </form>
      </section>
    </main>
  );
}

type TaskRowProps = {
  readonly id: number;
  readonly title: string;
  readonly done: boolean;
};

function TaskRow({ id, title, done }: TaskRowProps) {
  const setTasks = useSetAtom(tasks);

  return (
    <li>
      <label>
        <input
          type="checkbox"
          checked={done}
          onChange={() => {
            setTasks((currentItems) =>
              currentItems.map((task) => (task.id === id ? { ...task, done: !task.done } : task)),
            );
          }}
        />
        <span>{title}</span>
      </label>
    </li>
  );
}
