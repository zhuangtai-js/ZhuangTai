import type {
  Atom,
  AtomCreatorPlugin,
  AtomCreatorPluginContext,
  ReadableAtom,
} from "@zhuangtai-js/core";
import { type Draft, produce } from "immer";

export type ImmerOptions = Record<never, never>;

export type ImmerRecipe<Value> = (draft: Draft<Value>) => Draft<Value> | void;

export type ImmerNextValue<Value> = Value | ImmerRecipe<Value>;

export type ImmerAtom<Value> = ReadableAtom<Value> & {
  readonly set: (nextValue: ImmerNextValue<Value>) => void;
};

declare module "@zhuangtai-js/core" {
  interface AtomKindRegistry<Value> {
    readonly immer: ImmerAtom<Value>;
  }
}

export const immer: AtomCreatorPlugin<"immer", ImmerOptions, "immer"> = {
  id: "immer",
  kind: "immer",
  create: createImmerAtom,
};

function createImmerAtom<Value>(
  context: AtomCreatorPluginContext<Value, ImmerOptions>,
): ImmerAtom<Value> {
  return immerAtom(context.next(context.initialValue));
}

function isRecipe<Value>(nextValue: ImmerNextValue<Value>): nextValue is ImmerRecipe<Value> {
  return typeof nextValue === "function";
}

function immerAtom<Value>(state: Atom<Value>): ImmerAtom<Value> {
  function set(nextValue: ImmerNextValue<Value>): void {
    if (!isRecipe(nextValue)) {
      // Concrete values pass straight through, matching core.
      state.set(nextValue);
      return;
    }

    // Run the updater as an Immer recipe. Immer produces a new immutable value
    // whether the recipe mutates the draft (returning void) or returns a fresh
    // value, so both styles work and never mutate the previous state in place.
    // A concrete value is committed, so core never re-invokes it as an updater.
    const value = produce(state.get(), nextValue);
    state.set(value);
  }

  return { get: state.get, set, watch: state.watch };
}
