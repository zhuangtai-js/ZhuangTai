import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import {
  docsSiteRoutes,
  generatedSiteRoutes,
  normalizeDocumentationRoute,
  readText,
  rootPath,
} from "./readme-consistency-context.mjs";
import { markdownAnchors } from "./readme-consistency-markdown.mjs";

function assertMarkdownFragment(sourcePath, targetPath, rawFragment, target) {
  if (rawFragment === undefined || rawFragment.length === 0) {
    return;
  }

  const fragment = decodeURIComponent(rawFragment);
  const anchors = markdownAnchors(readText(targetPath), targetPath);
  assert.ok(anchors.has(fragment), `${sourcePath} links to missing fragment ${target}`);
}

function assertLocalTarget(sourcePath, target) {
  const [rawPath, rawFragment] = target.split("#", 2);
  const pathOnly = decodeURIComponent(rawPath.split("?", 1)[0]);

  if (pathOnly.startsWith("/")) {
    if (generatedSiteRoutes.has(pathOnly)) {
      assert.equal(rawFragment, undefined, `${sourcePath} links to a fragment on ${target}`);
      return;
    }

    const route = normalizeDocumentationRoute(pathOnly);
    const targetPath = docsSiteRoutes.get(route);
    assert.notEqual(targetPath, undefined, `${sourcePath} links to missing site route ${target}`);
    assertMarkdownFragment(sourcePath, targetPath, rawFragment, target);
    return;
  }

  const targetPath = pathOnly.length === 0 ? sourcePath : join(dirname(sourcePath), pathOnly);
  const absoluteTarget = resolve(rootPath, targetPath);

  assert.ok(existsSync(absoluteTarget), `${sourcePath} links to missing path ${target}`);

  if ([".md", ".mdx"].includes(extname(absoluteTarget))) {
    assertMarkdownFragment(sourcePath, targetPath, rawFragment, target);
  }
}

export { assertLocalTarget };
