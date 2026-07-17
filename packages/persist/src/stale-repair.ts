import { isPromiseLike } from "./storage.js";
import type { MaybePromise } from "./types.js";

type StaleRepairParams = {
  readonly hydration: Promise<void>;
  readonly latestHydration: () => Promise<void>;
  readonly encodeCurrent: () => string;
  readonly write: (encodedValue: string) => MaybePromise<void>;
  readonly runBackgroundWrite: (operation: () => MaybePromise<void>) => void;
};

export function queueStaleRepair({
  hydration,
  latestHydration,
  encodeCurrent,
  write,
  runBackgroundWrite,
}: StaleRepairParams): void {
  runBackgroundWrite(() =>
    hydration.then(
      () => {
        if (hydration !== latestHydration()) return Promise.resolve();
        const writeResult = write(encodeCurrent());
        if (!isPromiseLike(writeResult)) return Promise.resolve();
        return Promise.resolve(writeResult).then(() => {
          const latest = latestHydration();
          if (hydration === latest) return;
          runBackgroundWrite(() =>
            latest.then(
              () => {
                if (latest !== latestHydration()) return Promise.resolve();
                return Promise.resolve(write(encodeCurrent()));
              },
              () => undefined,
            ),
          );
        });
      },
      () => undefined,
    ),
  );
}
