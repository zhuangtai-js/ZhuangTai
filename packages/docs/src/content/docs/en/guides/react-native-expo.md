---
title: Using with React Native / Expo
description: Use ZhuàngTài directly in React Native or Expo and persist preferences with generic asynchronous storage.
---

Core and `@zhuangtai-js/react` work directly with React Native / Expo. You do not need a Provider or a React Native-specific adapter: Core atoms still own the state, components subscribe through React hooks, and the UI uses React Native's `View`, `Text`, and `Pressable`.

`@zhuangtai-js/react` declares React peer compatibility as `>=18 <20`. That describes the React peer range; it is not a claim that every React Native, Expo, or other native renderer has been independently tested. This guide shows the React Native / Expo usage path without claiming coverage for every native renderer.

## Install

In an existing Expo or React Native project, install Core, the React adapter, and the persistence plugin:

```sh
pnpm add @zhuangtai-js/core @zhuangtai-js/react @zhuangtai-js/persist
```

If the app should persist preferences on the native device, the app consumer installs AsyncStorage separately:

```sh
npx expo install @react-native-async-storage/async-storage
```

`@react-native-async-storage/async-storage` is the consumer's dependency, not a ZhuàngTài dependency. ZhuàngTài only requires a storage object with the `getItem`, `setItem`, and `removeItem` shape; there is no ZhuàngTài-specific RN storage package to install or configure.

## 1. Start with an in-memory counter

This complete example only uses in-memory state. `computed` derives a doubled value from the same atom, while `View`, `Text`, and `Pressable` are React Native components. There is no Provider and no React Native adapter.

```tsx
import { atom, computed } from "@zhuangtai-js/core";
import { useAtom, useAtomValue } from "@zhuangtai-js/react";
import { Pressable, Text, View } from "react-native";

const countAtom = atom(0);
const doubledCountAtom = computed(() => countAtom.get() * 2);

export function CounterScreen() {
  const [count, setCount] = useAtom(countAtom);
  const doubledCount = useAtomValue(doubledCountAtom);

  return (
    <View>
      <Text>Count: {count}</Text>
      <Text>Double: {doubledCount}</Text>
      <Pressable onPress={() => setCount((value) => value + 1)}>
        <Text>Increase</Text>
      </Pressable>
      <Pressable onPress={() => setCount(0)}>
        <Text>Reset</Text>
      </Pressable>
    </View>
  );
}
```

Core's `set` updates immediately and `watch` runs synchronously; React only re-renders components subscribed to the changed atom. Objects and arrays are still compared by reference, so return a new object or array when updating them.

## 2. Persist preferences with AsyncStorage

The app consumer installs and imports AsyncStorage, then passes it as the `storage` for the same `persist` plugin. There is no special adapter, and AsyncStorage is not added to `@zhuangtai-js/persist`'s runtime dependencies.

```tsx
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { computed, createAtom } from "@zhuangtai-js/core";
import { persist } from "@zhuangtai-js/persist";
import { useAtom, useAtomValue } from "@zhuangtai-js/react";

type Preferences = {
  theme: "light" | "dark";
  notifications: boolean;
};

const initialPreferences: Preferences = {
  theme: "light",
  notifications: true,
};

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
```

### Startup loading UI

Before the async `getItem` finishes, the atom has already been created with `initialPreferences`, so the first screen can show a stable default. The example ends its loading state with `persist.ready(preferencesAtom)`; an app startup boundary can also await it before rendering a screen that depends on restored data. If hydration fails, keep the usable in-memory value and send the error to logging, an error surface, or retry UI.

## Async persistence semantics

### `initialValue` comes before hydration

When `getItem` returns a Promise, `createPersistedAtom(initialValue, ...)` returns an atom immediately and exposes `initialValue` first. The stored value is considered only after the async read finishes, and `persist.ready(atom)` waits for the current hydration. Do not assume that the first `get()` after atom creation is already the device value.

### Local updates win late reads

If the user calls `set` while hydration is still pending, that local revision wins. A late, stale storage value cannot overwrite the value the user just wrote in memory; the plugin writes the latest local value back to storage. This makes startup interactions safe, while a loading state still makes “restoring” visible to the user.

### Writes are queued in call order

`set` and watchers remain synchronous; an async `setItem` does not turn Core into an async API. Each write is queued in the logical order of `set` calls. A failed write does not stop later writes; the failure is retained, reported through `onError`, and exposed to the caller by `persist.flush(atom)`.

### Lifecycle controls

| Method                    | Purpose                                                                                                                     |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `persist.ready(atom)`     | Wait for the latest hydration generation; rejects when a read, migration, or migration write-back fails.                    |
| `persist.flush(atom)`     | Wait for hydration, controller operations, and queued writes; rejects the first retained write failure.                     |
| `persist.rehydrate(atom)` | Start a new read generation; a stale result from an older generation cannot overwrite a newer generation or a local update. |
| `persist.clear(atom)`     | Wait for hydration and queued writes, then call `removeItem`; it does not reset the in-memory atom value.                   |

Put `ready` at the startup/loading boundary and `flush` at a screen-leave, backgrounding, or “confirm persistence” boundary. Call `rehydrate` for a user-requested refresh and `clear` when the persisted key should be removed. Wrap each Promise-returning control in `try/catch` instead of creating an unhandled rejection.

### Recommended `onError` boundary

Use `onError` for logging, telemetry, or a shared error reporter, and catch the Promises returned by `ready`, `flush`, `rehydrate`, and `clear`. Async write failures should not disappear silently. If the app can continue with in-memory state, show a “this session only” message and offer retry or reload actions.

## When synchronous storage is a better fit

If the runtime already provides reliable synchronous storage and you want restoration to finish during atom creation without a startup loading boundary, synchronous storage is simpler. Browser `localStorage`, an in-memory Map in tests, or another explicit synchronous persistence implementation can fit that case. Native persistence in React Native / Expo is commonly asynchronous, so the AsyncStorage path should make hydration an explicit startup lifecycle rather than adding hidden scheduling to Core.

## Next steps

- Read [Core Concepts](/en/guides/core-concepts/) for `atom`, `computed`, synchronous `set`, and `watch`.
- Read [React Reference](/en/reference/react/) for `useAtom`, `useAtomValue`, and setter-only hooks.
- Read [Persist Reference](/en/reference/persist/) for the storage contract, migrations, and controller API.
- Return to [Framework Adapter Comparison](/en/guides/framework-adapters/) to compare UI framework boundaries.
