import { describe, expect, it } from "vitest";
import { formatContractFailures, inspectLlmOutput, type ContractFailure } from "./llms-contract";

const source = "reviewer exact repro";
const forbiddenExpectation = "no dedicated AsyncStorage package";
const packageName = "@zhuangtai-js/async-storage";

const tokenBoundaries = [
  ["period", "."],
  ["comma", ","],
  ["semicolon", ";"],
  ["colon", ":"],
  ["closing parenthesis", ")"],
  ["closing bracket", "]"],
  ["Unicode period", "。"],
  ["Unicode comma", "，"],
  ["Unicode semicolon", "；"],
  ["Unicode colon", "："],
  ["Unicode closing parenthesis", "）"],
  ["Unicode closing bracket", "】"],
  ["whitespace", " "],
  ["line ending", ""],
] as const;

function findPackageFailure(failures: readonly ContractFailure[]): ContractFailure | undefined {
  return failures.find(({ expected }) => expected === forbiddenExpectation);
}

describe("dedicated AsyncStorage package token boundary", () => {
  it.each(tokenBoundaries)("rejects a package followed by %s", (_label, boundary) => {
    const failures = inspectLlmOutput(source, `Install ${packageName}${boundary}`);
    const failure = findPackageFailure(failures);
    const diagnostic = formatContractFailures(failure === undefined ? [] : [failure]);

    expect(failure).toEqual({
      source,
      expected: forbiddenExpectation,
      actual: packageName,
    });
    expect(diagnostic).toContain(`source: ${source}`);
    expect(diagnostic).toContain(`expected: ${forbiddenExpectation}`);
    expect(diagnostic).toContain(`actual: ${packageName}`);
  });

  it("does not reject a longer legal package substring", () => {
    const failures = inspectLlmOutput(source, `Install ${packageName}-extra.`);
    expect(findPackageFailure(failures)).toBeUndefined();
  });
});
