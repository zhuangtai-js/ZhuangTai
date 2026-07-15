import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const docsRoot = fileURLToPath(new URL("../src/content/docs/", import.meta.url));
const zh = readFileSync(`${docsRoot}guides/react-native-expo.md`, "utf8");
const en = readFileSync(`${docsRoot}en/guides/react-native-expo.md`, "utf8");

function containsAll(source, phrases) {
  for (const phrase of phrases) expect(source).toContain(phrase);
}

function rejectsAll(source, patterns) {
  for (const pattern of patterns) expect(source).not.toMatch(pattern);
}

describe("React Native / Expo semantic guard", () => {
  it("locks the provider-free path through the existing React adapter", () => {
    expect.hasAssertions();
    containsAll(zh, [
      "Core 和 `@zhuangtai-js/react` 可以直接用于 React Native / Expo",
      "你不需要 Provider，也不需要 React Native 专用 adapter",
      "没有 Provider，也没有 React Native adapter",
    ]);
    rejectsAll(zh, [
      /Core 和 `@zhuangtai-js\/react` 不能直接用于 React Native \/ Expo/u,
      /你需要 Provider|必须使用 Provider/u,
      /(?<!不)需要 React Native 专用 adapter/u,
    ]);

    containsAll(en, [
      "Core and `@zhuangtai-js/react` work directly with React Native / Expo",
      "You do not need a Provider or a React Native-specific adapter",
      "There is no Provider and no React Native adapter",
    ]);
    rejectsAll(en, [
      /Core and `@zhuangtai-js\/react` do not work directly with React Native \/ Expo/u,
      /You need a Provider|requires a Provider/u,
      /You need a React Native-specific adapter|requires a React Native-specific adapter/u,
    ]);
  });

  it("locks consumer-owned AsyncStorage and the generic structural contract", () => {
    expect.hasAssertions();
    containsAll(zh, [
      "由应用消费者安装 AsyncStorage",
      "是消费者自己的依赖，不是 ZhuàngTài 的依赖",
      "结构上满足 `getItem`、`setItem` 和 `removeItem` 的 storage",
      "不需要安装或配置 ZhuàngTài 专用的 RN storage 包",
      "作为同一个 `persist` 插件的 `storage` 传入",
      "没有把 AsyncStorage 加进 `@zhuangtai-js/persist` 的运行时依赖",
    ]);
    rejectsAll(zh, [
      /AsyncStorage 是 ZhuàngTài 的(?:包|运行时)?依赖|而是 ZhuàngTài 的依赖/u,
      /ZhuàngTài (?:会)?特判 AsyncStorage/u,
      /必须使用 ZhuàngTài 专用的 (?:AsyncStorage|storage) 类型/u,
      /需要专用的 AsyncStorage (?:adapter|插件)/u,
    ]);

    containsAll(en, [
      "the app consumer installs AsyncStorage separately",
      "is the consumer's dependency, not a ZhuàngTài dependency",
      "storage object with the `getItem`, `setItem`, and `removeItem` shape",
      "there is no ZhuàngTài-specific RN storage package",
      "as the `storage` for the same `persist` plugin",
      "AsyncStorage is not added to `@zhuangtai-js/persist`'s runtime dependencies",
    ]);
    rejectsAll(en, [
      /AsyncStorage is a ZhuàngTài (?:package |runtime )?dependency|it is a ZhuàngTài dependency/u,
      /ZhuàngTài special-cases AsyncStorage/u,
      /must use a ZhuàngTài-specific (?:AsyncStorage|storage) type/u,
      /requires a dedicated AsyncStorage (?:adapter|plugin)/u,
    ]);
  });

  it("locks initial visibility and ordered asynchronous writes", () => {
    expect.hasAssertions();
    containsAll(zh, [
      "### initialValue 先于 hydration",
      "`createPersistedAtom(initialValue, ...)` 会立即返回 atom，并先暴露 `initialValue`",
      "异步读取完成后才会尝试恢复存储值",
      "### 写入按调用顺序排队",
      "每次写入会按 `set` 的逻辑顺序排队",
      "即使某次写入失败，后续写入也会继续执行",
    ]);
    rejectsAll(zh, [
      /等待 hydration 完成后才返回 atom/u,
      /hydration 完成前不暴露 `initialValue`/u,
      /持久化写入可以乱序|不保证按 `set` 调用顺序写入/u,
      /某次写入失败(?:会|后)停止后续写入/u,
    ]);

    containsAll(en, [
      "### `initialValue` comes before hydration",
      "`createPersistedAtom(initialValue, ...)` returns an atom immediately and exposes `initialValue` first",
      "The stored value is considered only after the async read finishes",
      "### Writes are queued in call order",
      "Each write is queued in the logical order of `set` calls",
      "A failed write does not stop later writes",
    ]);
    rejectsAll(en, [
      /waits for hydration before returning an atom/u,
      /does not expose `initialValue` until hydration finishes/u,
      /writes may complete out of order|does not preserve the order of `set` calls/u,
      /A failed write stops later writes/u,
    ]);
  });

  it("locks local-write-wins and the native renderer validation boundary", () => {
    expect.hasAssertions();
    containsAll(zh, [
      "本地更新赢过迟到的读取",
      "这个本地 revision 会优先",
      "迟到的旧 storage 值不会覆盖用户刚写入的内存值",
      "不是对每一种 React Native、Expo 或其他 native renderer 都做了独立测试的声明",
      "不是对所有 native renderer 的覆盖承诺",
    ]);
    rejectsAll(zh, [
      /迟到的旧 storage 值会覆盖用户刚写入的内存值/u,
      /每一种 React Native、Expo 或其他 native renderer 都完成了独立端到端测试/u,
      /承诺覆盖所有 native renderer/u,
    ]);

    containsAll(en, [
      "Local updates win late reads",
      "that local revision wins",
      "A late, stale storage value cannot overwrite the value the user just wrote in memory",
      "it is not a claim that every React Native, Expo, or other native renderer has been independently tested",
      "without claiming coverage for every native renderer",
    ]);
    rejectsAll(en, [
      /A late, stale storage value can overwrite the value the user just wrote in memory/u,
      /every React Native, Expo, or other native renderer has been independently end-to-end tested/u,
      /claims coverage for every native renderer/u,
    ]);
  });
});
