import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Node (unlike the browser) also ships a global BroadcastChannel, and Node's
// implementation keeps the event loop alive. The probe must run in a real
// child process because the behavior under test is that the process EXITS
// naturally: without unref, a synced atom would hang SSR runs and scripts
// forever.
const probeScript = `
import { createAtom } from "@zhuangtai-js/core";
import { sync } from "@zhuangtai-js/sync";

const createState = createAtom().use(sync);
const state = createState(1, { sync: { key: "node-exit-probe" } });

state.set(2);

if (state.get() !== 2) {
  process.exit(1);
}
`;

describe("sync on Node", () => {
  it("does not keep the process alive after creating a synced atom", () => {
    const packageRootPath = fileURLToPath(new URL("../..", import.meta.url));

    const result = spawnSync(process.execPath, ["--input-type=module", "-e", probeScript], {
      cwd: packageRootPath,
      encoding: "utf8",
      timeout: 10_000,
    });

    expect(result.error).toBeUndefined();
    expect(result.stderr).toBe("");
    expect(result.signal).toBeNull();
    expect(result.status).toBe(0);
  });
});
