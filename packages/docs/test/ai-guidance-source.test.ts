import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { formatContractFailures, inspectLlmOutput } from "./llms-contract";

const repositoryRoot = fileURLToPath(new URL("../../..", import.meta.url));

const sourceGroups = [
  {
    label: "AI pages",
    paths: ["packages/docs/src/content/docs/ai.md", "packages/docs/src/content/docs/en/ai.md"],
  },
  {
    label: "installation guides",
    paths: ["docs/guide/installation.md", "docs/guide/README.en.md"],
  },
  {
    label: "zhuangtai skill",
    paths: ["skills/zhuangtai/SKILL.md"],
  },
  {
    label: "zhuangtai-react skill",
    paths: ["skills/zhuangtai-react/SKILL.md"],
  },
  {
    label: "zhuangtai-plugins skill",
    paths: ["skills/zhuangtai-plugins/SKILL.md"],
  },
  {
    label: "zhuangtai-framework-adapters skill",
    paths: ["skills/zhuangtai-framework-adapters/SKILL.md"],
  },
] as const;

function readGroup(paths: readonly string[]): string {
  return paths.map((path) => readFileSync(join(repositoryRoot, path), "utf8")).join("\n");
}

describe("AI guidance sources", () => {
  it.each(sourceGroups)("keeps Todo 9 semantics in $label", ({ label, paths }) => {
    const failures = inspectLlmOutput(label, readGroup(paths));
    if (failures.length > 0) {
      throw new Error(formatContractFailures(failures));
    }
    expect(failures).toEqual([]);
  });
});
