import { createAtom } from "../../packages/core/dist/index.js";
import { persist } from "../../packages/persist/dist/index.js";

const createPersistedAtom = createAtom().use(persist);
createPersistedAtom(0, { persist: { key: "counter", storage: {} } });
