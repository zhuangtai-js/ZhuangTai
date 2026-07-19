import type { ReadableAtom } from "@zhuangtai-js/core";

const PACKAGE_NAME = "@zhuangtai-js/persist";
const MISUSE_MESSAGE = `[${PACKAGE_NAME}] Expected a persisted atom created by this package.`;

export type PersistController = {
  readonly ready: () => Promise<void>;
  readonly flush: () => Promise<void>;
  readonly rehydrate: () => Promise<void>;
  readonly clear: () => Promise<void>;
};

const controllersByAtom = new WeakMap<object, PersistController>();
const controllersByGetter = new WeakMap<() => unknown, PersistController>();

export function registerPersistController<Value>(
  atom: ReadableAtom<Value>,
  controller: PersistController,
): void {
  controllersByAtom.set(atom, controller);
  controllersByGetter.set(atom.get, controller);
}

export function getPersistController(atom: ReadableAtom<unknown>): PersistController {
  const controller = controllersByAtom.get(atom) ?? controllersByGetter.get(atom.get);

  if (controller === undefined) {
    throw new TypeError(MISUSE_MESSAGE);
  }

  return controller;
}
