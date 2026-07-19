export const llmsDetails = `ZhuàngTài 关键上下文：

- 在 UI/组件生命周期之外直接使用 \`@zhuangtai-js/core\`；在组件内选择对应的 framework adapter。React Native / Expo 使用 \`@zhuangtai-js/react\`。
- 六个中文指南：\`/guides/react/\`、\`/guides/preact/\`、\`/guides/vue/\`、\`/guides/svelte/\`、\`/guides/solid/\`、\`/guides/react-native-expo/\`。
- Six English guides: \`/en/guides/react/\`, \`/en/guides/preact/\`, \`/en/guides/vue/\`, \`/en/guides/svelte/\`, \`/en/guides/solid/\`, \`/en/guides/react-native-expo/\`.
- \`PersistStorage\` 是结构契约：storage 方法返回普通值或 \`PromiseLike\` 都结构兼容。AsyncStorage 只由使用方提供给 \`@zhuangtai-js/persist\`，不存在 ZhuàngTài 专用 AsyncStorage 包。
- 如果用内存回退包装 storage，必须按每次调用保留同步值或 \`PromiseLike\` 返回形状；异步 \`getItem\` 在完成后再校验和缓存，异步 \`setItem\` / \`removeItem\` 要观察 rejection 后再切换回退，不能直接丢弃 Promise。
- 如果首屏依赖 hydration 后的持久化状态，先 await \`persist.ready(atom)\`。在退出、提交或其他持久化边界 await \`persist.flush(atom)\`，并处理 rejection/错误。
- \`persist.rehydrate(atom)\` 重新读取，\`persist.clear(atom)\` 删除持久化值；用 \`onError\` 接收异步失败。migration 输入来自 storage，按版本同步迁移；SSR 为每个请求创建独立 atom，并显式提供 storage 或仅在客户端创建。
- Core 的 \`set\` 立即生效，\`watch\` 同步执行，等价性使用 \`Object.is\`；对象和数组需要 immutable 更新。adapter 和 Persist 都不向 Core 添加隐藏调度。

English mirror:

- Use \`@zhuangtai-js/core\` directly outside UI/component lifecycles; choose the matching framework adapter inside components. React Native / Expo uses \`@zhuangtai-js/react\`.
- Chinese guide routes: \`/guides/react/\`, \`/guides/preact/\`, \`/guides/vue/\`, \`/guides/svelte/\`, \`/guides/solid/\`, \`/guides/react-native-expo/\`.
- English guide routes: \`/en/guides/react/\`, \`/en/guides/preact/\`, \`/en/guides/vue/\`, \`/en/guides/svelte/\`, \`/en/guides/solid/\`, \`/en/guides/react-native-expo/\`.
- \`PersistStorage\` is structural: storage methods returning plain values or \`PromiseLike\` values are structurally compatible. AsyncStorage is consumer-provided to \`@zhuangtai-js/persist\`; there is no ZhuàngTài-specific AsyncStorage package.
- When wrapping storage with an in-memory fallback, preserve each call's synchronous or \`PromiseLike\` return shape; validate and cache async \`getItem\` after it settles, and observe async \`setItem\` / \`removeItem\` rejections before switching to the fallback instead of discarding the Promise.
- If first render depends on hydrated persistent state, await \`persist.ready(atom)\`. At exit, submit, or another durable boundary, await \`persist.flush(atom)\` and handle rejection/error.
- \`persist.rehydrate(atom)\` reads again and \`persist.clear(atom)\` removes the persisted value; use \`onError\` for asynchronous failures. Migration input comes from storage and migrations run synchronously one version at a time. For SSR, create an independent atom per request and pass explicit storage or create it only on the client.
- Core \`set\` applies immediately, \`watch\` runs synchronously, equality uses \`Object.is\`, and object/array updates must be immutable. Adapters and Persist add no hidden scheduling to Core.`;
