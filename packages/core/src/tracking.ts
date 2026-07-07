import type { ReadableAtom } from "./types.js";

type Dependency = ReadableAtom<unknown>;

let activeCollector: Set<Dependency> | undefined;

export function trackDependency(dependency: Dependency): void {
  activeCollector?.add(dependency);
}

export function collectDependencies<Value>(read: () => Value): {
  readonly value: Value;
  readonly dependencies: ReadonlySet<Dependency>;
} {
  const previousCollector = activeCollector;
  const dependencies = new Set<Dependency>();

  activeCollector = dependencies;

  try {
    return {
      value: read(),
      dependencies,
    };
  } finally {
    activeCollector = previousCollector;
  }
}
