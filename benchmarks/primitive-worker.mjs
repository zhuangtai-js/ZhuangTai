import { performance } from "node:perf_hooks";
import { atom as zhuangtaiAtom } from "@zhuangtai-js/core";
import { atom as jotaiAtom, createStore as createJotaiStore } from "jotai/vanilla";
import { createStore as createZustandStore } from "zustand/vanilla";

const library = process.argv[2];
const iterations = Number.parseInt(process.env.BENCH_ITERATIONS ?? "100000", 10);

if (!Number.isSafeInteger(iterations) || iterations <= 0) {
  throw new Error("BENCH_ITERATIONS must be a positive safe integer");
}

const benchmark = createBenchmark(library);

for (let index = 0; index < 3; index += 1) {
  benchmark(iterations);
}

const samples = [];
for (let index = 0; index < 9; index += 1) {
  samples.push(benchmark(iterations));
}

samples.sort((left, right) => left - right);
process.stdout.write(JSON.stringify({ library, iterations, medianMs: samples[4] }));

function createBenchmark(name) {
  if (name === "zhuangtai") {
    return (count) => {
      const state = zhuangtaiAtom(0);
      const stop = state.watch(() => {});
      const startedAt = performance.now();
      for (let index = 1; index <= count; index += 1) {
        state.set(index);
      }
      const duration = performance.now() - startedAt;
      stop();
      return duration;
    };
  }

  if (name === "zustand") {
    return (count) => {
      const store = createZustandStore(() => 0);
      const stop = store.subscribe(() => {});
      const startedAt = performance.now();
      for (let index = 1; index <= count; index += 1) {
        store.setState(index, true);
      }
      const duration = performance.now() - startedAt;
      stop();
      return duration;
    };
  }

  if (name === "jotai") {
    return (count) => {
      const state = jotaiAtom(0);
      const store = createJotaiStore();
      const stop = store.sub(state, () => {});
      const startedAt = performance.now();
      for (let index = 1; index <= count; index += 1) {
        store.set(state, index);
      }
      const duration = performance.now() - startedAt;
      stop();
      return duration;
    };
  }

  throw new Error(`Unknown benchmark library: ${String(name)}`);
}
