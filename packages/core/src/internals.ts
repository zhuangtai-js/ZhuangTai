import type { ReadableAtom, StopWatch } from "./types.js";

type Dependency = ReadableAtom<unknown>;
type ChangeListener = () => void;
type NotificationJob = () => void;

type ReadableInternals = {
  readonly subscribe: (listener: ChangeListener) => StopWatch;
};

const readableInternals = new WeakMap<Dependency, ReadableInternals>();
const notificationQueue: NotificationJob[] = [];
const pendingNotifications = new Set<NotificationJob>();
let currentEpoch = 0;
let dispatchDepth = 0;
let isFlushingNotifications = false;

export function throwErrors(errors: readonly unknown[], message: string): void {
  if (errors.length === 1) {
    throw errors[0];
  }

  if (errors.length > 1) {
    throw new AggregateError(errors, message);
  }
}

export function registerReadableInternals(
  readable: Dependency,
  internals: ReadableInternals,
): void {
  readableInternals.set(readable, internals);
}

export function subscribeToChanges(dependency: Dependency, listener: ChangeListener): StopWatch {
  const internals = readableInternals.get(dependency);

  if (internals) {
    return internals.subscribe(listener);
  }

  let isInitialNotification = true;

  return dependency.watch(() => {
    if (isInitialNotification) {
      isInitialNotification = false;
      return;
    }

    advanceEpoch();
    listener();
  });
}

export function getCurrentEpoch(): number {
  return currentEpoch;
}

export function advanceEpoch(): void {
  currentEpoch += 1;
}

export function beginChangeDispatch(): void {
  dispatchDepth += 1;
}

export function endChangeDispatch(): void {
  dispatchDepth -= 1;

  if (dispatchDepth === 0) {
    flushNotifications();
  }
}

export function enqueueNotification(job: NotificationJob): void {
  if (!pendingNotifications.has(job)) {
    pendingNotifications.add(job);
    notificationQueue.push(job);
  }

  if (dispatchDepth === 0) {
    flushNotifications();
  }
}

function flushNotifications(): void {
  if (isFlushingNotifications || notificationQueue.length === 0) {
    return;
  }

  isFlushingNotifications = true;
  const errors: unknown[] = [];

  try {
    for (let index = 0; index < notificationQueue.length; index += 1) {
      const job = notificationQueue[index];

      if (!job) {
        continue;
      }

      pendingNotifications.delete(job);

      try {
        job();
      } catch (error) {
        errors.push(error);
      }
    }
  } finally {
    notificationQueue.length = 0;
    isFlushingNotifications = false;
  }

  throwErrors(errors, "[@zhuangtai-js/core] One or more computed watchers threw.");
}
