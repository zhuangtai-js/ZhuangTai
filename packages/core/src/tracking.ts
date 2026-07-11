import type { ReadableAtom } from "./types.js";

type Dependency = ReadableAtom<unknown>;

export type DependencyCollection<Value> =
  | {
      readonly status: "success";
      readonly value: Value;
      readonly dependencies: ReadonlySet<Dependency>;
    }
  | {
      readonly status: "failure";
      readonly error: unknown;
      readonly dependencies: ReadonlySet<Dependency>;
    };

let activeCollector: Set<Dependency> | undefined;

export function trackDependency(dependency: Dependency): void {
  activeCollector?.add(dependency);
}

export function collectDependencies<Value>(read: () => Value): DependencyCollection<Value> {
  const previousCollector = activeCollector;
  const dependencies = new Set<Dependency>();

  activeCollector = dependencies;

  try {
    return {
      status: "success",
      value: read(),
      dependencies,
    };
  } catch (error) {
    return {
      status: "failure",
      error,
      dependencies,
    };
  } finally {
    activeCollector = previousCollector;
  }
}
