import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const npmPublishWorkflow = readFileSync(
  new URL("../.github/workflows/npm-publish.yml", import.meta.url),
  "utf8",
);

function workflowRunBlocks(workflow) {
  const blocks = [];
  let current = undefined;

  for (const line of workflow.split(/\r?\n/u)) {
    const runMatch = /^(?<indent>\s*)run:\s*(?<command>.*)$/u.exec(line);

    if (runMatch !== null) {
      current = {
        indent: runMatch.groups.indent.length,
        lines: runMatch.groups.command === "|" ? [] : [runMatch.groups.command],
      };
      blocks.push(current);
      continue;
    }

    if (current === undefined || line.trim() === "") {
      continue;
    }

    const indent = line.match(/^\s*/u)?.[0].length ?? 0;
    if (indent <= current.indent) {
      current = undefined;
      continue;
    }

    current.lines.push(line);
  }

  return blocks.map(({ lines }) => lines.join("\n"));
}

function workflowSection(start, end) {
  const startIndex = npmPublishWorkflow.indexOf(start);
  const endIndex = npmPublishWorkflow.indexOf(end, startIndex + start.length);

  assert.notEqual(startIndex, -1, `Missing workflow section: ${start}`);
  assert.notEqual(endIndex, -1, `Missing workflow section boundary: ${end}`);
  return npmPublishWorkflow.slice(startIndex, endIndex);
}

export function registerPublishWorkflowCases() {
  describe("npm publish workflow input handling", () => {
    it("does not interpolate workflow_dispatch inputs directly in shell commands", () => {
      const runBlocks = workflowRunBlocks(npmPublishWorkflow);

      assert.ok(runBlocks.length > 0);
      assert.ok(
        runBlocks.every(
          (block) => !/\$\{\{\s*(?:inputs|github\.event\.inputs)\.[^}]+\}\}/u.test(block),
        ),
      );
    });

    it("maps release inputs through env and quotes shell arguments", () => {
      const dryRunStep = workflowSection("      - name: Dry-run publish", "\n  publish:");
      const publishStep = workflowSection("      - name: Publish", "\n  github-release:");

      for (const step of [dryRunStep, publishStep]) {
        assert.match(step, /CHANNEL: \$\{\{ inputs\.channel \}\}/u);
        assert.match(step, /PACKAGE_NAME: \$\{\{ inputs\.package_name \}\}/u);
        assert.match(step, /--channel "\$CHANNEL"/u);
        assert.match(step, /--package "\$PACKAGE_NAME"/u);
      }
    });
  });
}
