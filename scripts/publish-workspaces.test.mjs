import { describe } from "node:test";
import { registerPublishContractCases } from "./publish-workspaces-contract-cases.mjs";
import { registerPublishWorkspacePreflightCases } from "./publish-workspaces-preflight-cases.mjs";
import { registerPublishWorkspaceSelectionCases } from "./publish-workspaces-selection-cases.mjs";
import { registerPublishUnitCases } from "./publish-workspaces-unit-cases.mjs";
import { registerPublishWorkflowCases } from "./publish-workspaces-workflow-cases.mjs";

registerPublishWorkflowCases();
registerPublishUnitCases();
registerPublishContractCases();

describe("publishWorkspaces", () => {
  registerPublishWorkspaceSelectionCases();
  registerPublishWorkspacePreflightCases();
});
