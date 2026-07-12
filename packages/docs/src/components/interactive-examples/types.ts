export type Locale = "zh" | "en";
export type ExampleName = "counter" | "tasks" | "preferences";
export type TaskFilter = "all" | "active" | "done";

export type Task = {
  readonly id: number;
  readonly title: string;
  readonly done: boolean;
};

export type Preferences = {
  readonly theme: "light" | "dark";
  readonly density: "comfortable" | "compact";
};

export const exampleNames = [
  "counter",
  "tasks",
  "preferences",
] as const satisfies readonly ExampleName[];
