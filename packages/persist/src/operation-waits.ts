import type { PersistHydrationTask } from "./stale-repair.js";

export async function waitForHydrationAndWrites(
  latestHydration: () => PersistHydrationTask,
  waitForWrites: () => Promise<void>,
): Promise<void> {
  while (true) {
    const hydration = latestHydration();
    await Promise.allSettled([hydration.promise]);
    await waitForWrites();

    if (hydration === latestHydration()) {
      return;
    }
  }
}

export async function waitForAllOperations(
  latestHydration: () => PersistHydrationTask,
  pendingControls: ReadonlySet<Promise<void>>,
  waitForWrites: () => Promise<void>,
): Promise<void> {
  while (true) {
    const hydration = latestHydration();
    const controls = Array.from(pendingControls);
    await Promise.allSettled([hydration.promise, ...controls]);
    await waitForWrites();

    if (hydration === latestHydration() && pendingControls.size === 0) {
      return;
    }
  }
}
