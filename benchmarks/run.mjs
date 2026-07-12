import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { createAtom } from "@zhuangtai-js/core";
import { persist } from "@zhuangtai-js/persist";
import { build } from "esbuild";
import { createStore as createJotaiStore } from "jotai/vanilla";
import { atomWithStorage, createJSONStorage as createJotaiJsonStorage } from "jotai/vanilla/utils";
import {
  persist as zustandPersist,
  createJSONStorage as createZustandJsonStorage,
} from "zustand/middleware";
import { createStore as createZustandStore } from "zustand/vanilla";

const benchmarkRoot = dirname(fileURLToPath(import.meta.url));
const writeResults = process.argv.includes("--write");
const checkOnly = process.argv.includes("--check");
const processCount = Number.parseInt(process.env.BENCH_PROCESSES ?? "5", 10);

if (!Number.isSafeInteger(processCount) || processCount <= 0) {
  throw new Error("BENCH_PROCESSES must be a positive safe integer");
}

const results = {
  generatedAt: new Date().toISOString(),
  environment: {
    node: process.version,
    platform: `${process.platform}-${process.arch}`,
  },
  versions: {
    zhuangtaiCore: packageVersion("../packages/core/package.json"),
    zhuangtaiReact: packageVersion("../packages/react/package.json"),
    zustand: packageVersion("node_modules/zustand/package.json"),
    jotai: packageVersion("node_modules/jotai/package.json"),
    esbuild: packageVersion("node_modules/esbuild/package.json"),
  },
  bundleSize: await measureBundles(),
  primitiveUpdate: measurePrimitiveUpdates(processCount),
  persistenceFailure: measurePersistenceFailure(),
};

validateResults(results);

if (writeResults) {
  writeFileSync(
    join(benchmarkRoot, "results/latest.json"),
    `${JSON.stringify(results, null, 2)}\n`,
  );
}

if (!checkOnly || writeResults) {
  process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
}

async function measureBundles() {
  const cases = {
    vanilla: {
      zhuangtai: 'import { atom } from "@zhuangtai-js/core"; globalThis.state = atom(0);',
      zustand:
        'import { createStore } from "zustand/vanilla"; globalThis.state = createStore(() => 0);',
      jotai:
        'import { atom, createStore } from "jotai/vanilla"; globalThis.state = [atom(0), createStore()];',
    },
    react: {
      zhuangtai:
        'import { atom } from "@zhuangtai-js/core"; import { useAtom } from "@zhuangtai-js/react"; globalThis.state = [atom(0), useAtom];',
      zustand: 'import { create } from "zustand"; globalThis.state = create(() => 0);',
      jotai: 'import { atom, useAtom } from "jotai"; globalThis.state = [atom(0), useAtom];',
    },
    derived: {
      zhuangtai:
        'import { atom, computed } from "@zhuangtai-js/core"; const count = atom(0); globalThis.state = computed(() => count.get() * 2);',
      zustand:
        'import { createStore } from "zustand/vanilla"; import { subscribeWithSelector } from "zustand/middleware"; globalThis.state = createStore(subscribeWithSelector(() => ({ count: 0 })));',
      jotai:
        'import { atom, createStore } from "jotai/vanilla"; const count = atom(0); globalThis.state = [atom((get) => get(count) * 2), createStore()];',
    },
  };

  const output = {};
  for (const [caseName, entries] of Object.entries(cases)) {
    output[caseName] = {};
    for (const [library, source] of Object.entries(entries)) {
      const result = await build({
        bundle: true,
        format: "esm",
        minify: true,
        platform: "browser",
        stdin: { contents: source, resolveDir: benchmarkRoot },
        external: ["react", "react-dom"],
        write: false,
      });
      const bytes = result.outputFiles.reduce((total, file) => total + file.contents.byteLength, 0);
      const gzipBytes = result.outputFiles.reduce(
        (total, file) => total + gzipSync(file.contents).byteLength,
        0,
      );
      output[caseName][library] = { bytes, gzipBytes };
    }
  }
  return output;
}

function measurePrimitiveUpdates(count) {
  const output = {};
  for (const library of ["zhuangtai", "zustand", "jotai"]) {
    const medians = [];
    for (let index = 0; index < count; index += 1) {
      const raw = execFileSync(
        process.execPath,
        [join(benchmarkRoot, "primitive-worker.mjs"), library],
        {
          encoding: "utf8",
          env: process.env,
        },
      );
      medians.push(JSON.parse(raw).medianMs);
    }
    medians.sort((left, right) => left - right);
    output[library] = {
      iterations: Number.parseInt(process.env.BENCH_ITERATIONS ?? "100000", 10),
      processes: count,
      minMedianMs: medians[0],
      maxMedianMs: medians.at(-1),
      medianOfMediansMs: medians[Math.floor(medians.length / 2)],
    };
  }
  return output;
}

function measurePersistenceFailure() {
  const message = "disk full";

  const zhuangtaiState = createAtom().use(persist)(0, {
    persist: { key: "count", storage: failingStorage(message) },
  });
  captureFailure(() => zhuangtaiState.set(1), message);

  const zustandState = createZustandStore(
    zustandPersist(() => 0, {
      name: "count",
      storage: createZustandJsonStorage(() => failingStorage(message)),
    }),
  );
  captureFailure(() => zustandState.setState(1, true), message);

  const jotaiState = atomWithStorage(
    "count",
    0,
    createJotaiJsonStorage(() => failingStorage(message)),
  );
  const jotaiStore = createJotaiStore();
  captureFailure(() => jotaiStore.set(jotaiState, 1), message);

  return {
    scenario: "state starts at 0; persistence of set(1) throws 'disk full'",
    zhuangtaiMemoryValue: zhuangtaiState.get(),
    zustandMemoryValue: zustandState.getState(),
    jotaiMemoryValue: jotaiStore.get(jotaiState),
  };
}

function failingStorage(message) {
  return {
    getItem: () => null,
    removeItem: () => {},
    setItem: () => {
      throw new Error(message);
    },
  };
}

function captureFailure(operation, expectedMessage) {
  try {
    operation();
  } catch (error) {
    if (error instanceof Error && error.message === expectedMessage) {
      return;
    }
    throw error;
  }
  throw new Error(`Expected operation to throw ${expectedMessage}`);
}

function packageVersion(relativePath) {
  const manifest = JSON.parse(readFileSync(join(benchmarkRoot, relativePath), "utf8"));
  return manifest.version;
}

function validateResults(value) {
  for (const caseName of ["vanilla", "react", "derived"]) {
    for (const library of ["zhuangtai", "zustand", "jotai"]) {
      const measurement = value.bundleSize[caseName][library];
      if (!Number.isSafeInteger(measurement.gzipBytes) || measurement.gzipBytes <= 0) {
        throw new Error(`Invalid bundle measurement for ${caseName}/${library}`);
      }
    }
  }

  if (value.persistenceFailure.zhuangtaiMemoryValue !== 0) {
    throw new Error("ZhuàngTài persistence failure must leave memory unchanged");
  }
}
