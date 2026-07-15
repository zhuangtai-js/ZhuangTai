import { computed, createAtom, type Atom } from "@zhuangtai-js/core";
import { persist, type PersistStorage } from "@zhuangtai-js/persist";
import {
  useAtom as useReactAtom,
  useAtomValue as useReactAtomValue,
} from "../packages/react/dist/index.js";

type Expect<T extends true> = T;
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? (<T>() => T extends B ? 1 : 2) extends <T>() => T extends A ? 1 : 2
      ? true
      : false
    : false;

type ExpoPreferences = {
  readonly theme: "light" | "dark";
  readonly notifications: boolean;
};

const expoStorage = {
  getItem: async (_key: string): Promise<string | null> => null,
  setItem: async (_key: string, _value: string): Promise<void> => undefined,
  removeItem: async (_key: string): Promise<void> => undefined,
} satisfies PersistStorage;

const createPersistedAtom = createAtom().use(persist);
const expoPreferencesAtom = createPersistedAtom<ExpoPreferences>(
  { theme: "light", notifications: true },
  {
    persist: {
      key: "expo-preferences",
      storage: expoStorage,
      onError: (error: unknown) => {
        void error;
      },
    },
  },
);
const expoThemeAtom = computed(() => expoPreferencesAtom.get().theme);

type _ExpoAtom = Expect<Equal<typeof expoPreferencesAtom, Atom<ExpoPreferences>>>;

type ExpoPreferencesScreenShape = {
  readonly preferences: ExpoPreferences;
  readonly theme: ExpoPreferences["theme"];
  readonly controls: {
    readonly ready: Promise<void>;
    readonly flush: Promise<void>;
    readonly rehydrate: Promise<void>;
    readonly clear: Promise<void>;
  };
};

function createExpoPreferencesScreenShape(): ExpoPreferencesScreenShape {
  const [preferences, setPreferences] = useReactAtom(expoPreferencesAtom);
  const theme = useReactAtomValue(expoThemeAtom);

  setPreferences((current) => ({
    ...current,
    notifications: !current.notifications,
  }));

  return {
    preferences,
    theme,
    controls: {
      ready: persist.ready(expoPreferencesAtom),
      flush: persist.flush(expoPreferencesAtom),
      rehydrate: persist.rehydrate(expoPreferencesAtom),
      clear: persist.clear(expoPreferencesAtom),
    },
  };
}

void createExpoPreferencesScreenShape;

type MissingRemoveItemStorage = {
  readonly getItem: (key: string) => Promise<string | null>;
  readonly setItem: (key: string, value: string) => Promise<void>;
};
type WrongGetItemStorage = {
  readonly getItem: (key: string) => Promise<number>;
  readonly setItem: (key: string, value: string) => Promise<void>;
  readonly removeItem: (key: string) => Promise<void>;
};

type _MissingRemoveItemMustBeRejected = Expect<
  Equal<MissingRemoveItemStorage extends PersistStorage ? true : false, false>
>;
type _WrongGetItemMustBeRejected = Expect<
  Equal<WrongGetItemStorage extends PersistStorage ? true : false, false>
>;
