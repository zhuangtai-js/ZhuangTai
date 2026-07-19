import { computed, createAtom } from "@zhuangtai-js/core";
import { persist, type PersistStorage } from "@zhuangtai-js/persist";
import { useAtom, useAtomValue } from "@zhuangtai-js/react";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

type Preferences = {
  theme: "light" | "dark";
  notifications: boolean;
};

const initialPreferences: Preferences = {
  theme: "light",
  notifications: true,
};

const AsyncStorage = {
  getItem: async (_key: string): Promise<string | null> => null,
  setItem: async (_key: string, _value: string): Promise<void> => undefined,
  removeItem: async (_key: string): Promise<void> => undefined,
} satisfies PersistStorage;

const createPersistedAtom = createAtom().use(persist);
const preferencesAtom = createPersistedAtom<Preferences>(initialPreferences, {
  persist: {
    key: "zhuangtai/preferences",
    storage: AsyncStorage,
    onError: (error) => {
      console.warn("[preferences persistence]", error);
    },
  },
});
const themeAtom = computed(() => preferencesAtom.get().theme);

export function PreferencesScreen() {
  const [preferences, setPreferences] = useAtom(preferencesAtom);
  const theme = useAtomValue(themeAtom);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void persist.ready(preferencesAtom).then(
      () => {
        if (active) {
          setHydrated(true);
          setMessage("Preferences restored.");
        }
      },
      (cause: unknown) => {
        if (active) {
          setHydrated(true);
          setError(String(cause));
        }
      },
    );

    return () => {
      active = false;
    };
  }, []);

  async function flushBeforeLeaving() {
    try {
      await persist.flush(preferencesAtom);
      setMessage("Preferences flushed.");
    } catch (cause) {
      setError(String(cause));
    }
  }

  async function reloadFromStorage() {
    try {
      await persist.rehydrate(preferencesAtom);
      setMessage("Preferences rehydrated.");
    } catch (cause) {
      setError(String(cause));
    }
  }

  async function clearStoredPreferences() {
    try {
      await persist.clear(preferencesAtom);
      setMessage("Stored preferences cleared; the current in-memory value is unchanged.");
    } catch (cause) {
      setError(String(cause));
    }
  }

  return (
    <View>
      {!hydrated ? <Text>Loading saved preferences…</Text> : null}
      <Text>Theme: {theme}</Text>
      <Text>Notifications: {preferences.notifications ? "on" : "off"}</Text>
      <Pressable
        disabled={!hydrated}
        onPress={() =>
          setPreferences((current) => ({
            ...current,
            theme: current.theme === "light" ? "dark" : "light",
          }))
        }>
        <Text>Toggle theme</Text>
      </Pressable>
      <Pressable
        disabled={!hydrated}
        onPress={() =>
          setPreferences((current) => ({
            ...current,
            notifications: !current.notifications,
          }))
        }>
        <Text>Toggle notifications</Text>
      </Pressable>
      <Pressable onPress={flushBeforeLeaving}>
        <Text>Flush before leaving</Text>
      </Pressable>
      <Pressable onPress={reloadFromStorage}>
        <Text>Rehydrate</Text>
      </Pressable>
      <Pressable onPress={clearStoredPreferences}>
        <Text>Clear stored value</Text>
      </Pressable>
      {message ? <Text>{message}</Text> : null}
      {error ? <Text>Persistence error: {error}</Text> : null}
    </View>
  );
}
