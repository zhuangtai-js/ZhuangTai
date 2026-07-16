import { describe, it } from "node:test";
import { runAdapterCompatibilityCase } from "./pack-consumer-adapter-case.mjs";
import { runPrimaryPackConsumerCase } from "./pack-consumer-primary-case.mjs";

describe("packed package consumer", () => {
  it(
    "installs packed core, persist, react, freeze, immer, and sync tarballs in a fresh consumer",
    runPrimaryPackConsumerCase,
  );
  it(
    "verifies minimum and current framework peers in isolated consumers",
    runAdapterCompatibilityCase,
  );
});
