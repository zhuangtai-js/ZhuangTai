import { describe } from "node:test";
import { registerCoreReadmeTests } from "./readme-consistency-core.mjs";
import { registerFrameworkDocumentationTests } from "./readme-consistency-frameworks.mjs";
import { registerPublicDocumentationTests } from "./readme-consistency-public.mjs";
import { registerRouteAndIdentityTests } from "./readme-consistency-routes.mjs";

describe("README consistency", () => {
  registerCoreReadmeTests();
  registerFrameworkDocumentationTests();
  registerPublicDocumentationTests();
  registerRouteAndIdentityTests();
});
