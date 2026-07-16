// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { pagePairs, parseHtml, readBuiltFile, readJsonLd, site } from "./seo-output-fixtures.mjs";

function validatePage(html, page, pair) {
  const jsonLdMatch = html.match(
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/,
  );
  if (jsonLdMatch === null) throw new Error("JSON-LD fixture not found");
  if (jsonLdMatch[1]?.includes("<")) throw new Error("JSON-LD contains an unescaped <");

  const document = parseHtml(html);
  const canonical = [...document.querySelectorAll('link[rel="canonical"]')];
  if (canonical.length !== 1) {
    throw new Error(`canonical count must be 1, received ${canonical.length}`);
  }

  const alternates = [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map(
    (link) => [link.getAttribute("hreflang"), link.getAttribute("href")],
  );
  const expectedAlternates = [
    ["zh-CN", `${site}${pair.zh.path}`],
    ["en", `${site}${pair.en.path}`],
    ["x-default", `${site}${pair.zh.path}`],
  ];
  if (JSON.stringify(alternates) !== JSON.stringify(expectedAlternates)) {
    throw new Error(`broken hreflang for ${page.path}`);
  }

  const blocks = readJsonLd(document);
  if (blocks.length !== 1) throw new Error(`JSON-LD count must be 1, received ${blocks.length}`);
}

function duplicateCanonical(html) {
  const match = html.match(/<link rel="canonical"[^>]*>/);
  if (match === null) throw new Error("canonical fixture not found");
  return html.replace(match[0], `${match[0]}${match[0]}`);
}

function breakEnglishAlternate(html, pair) {
  return html.replace(
    `hreflang="en" href="${site}${pair.en.path}"`,
    `hreflang="en" href="${site}/broken-locale/"`,
  );
}

function breakJsonLd(html) {
  return html.replace(
    /(<script[^>]*type="application\/ld\+json"[^>]*>)[\s\S]*?(<\/script>)/,
    "$1{malformed-json$2",
  );
}

function duplicateJsonLd(html) {
  const match = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/);
  if (match === null) throw new Error("JSON-LD fixture not found");
  return html.replace(match[0], `${match[0]}${match[0]}`);
}

function injectRawScriptTag(html) {
  return html.replace('"headline":"', '"headline":"<script>alert(1)</script>');
}

describe("generated SEO mutation guards", () => {
  const pair = pagePairs.find(({ key }) => key === "react");
  if (pair === undefined) throw new Error("React SEO fixture is missing.");
  const page = pair.zh;
  const html = readBuiltFile(page.file);

  it("rejects a duplicate canonical mutation", () => {
    expect(() => validatePage(duplicateCanonical(html), page, pair)).toThrow(/canonical count/);
  });

  it("rejects a broken reciprocal hreflang mutation", () => {
    expect(() => validatePage(breakEnglishAlternate(html, pair), page, pair)).toThrow(
      /broken hreflang/,
    );
  });

  it("rejects malformed JSON-LD output", () => {
    expect(() => validatePage(breakJsonLd(html), page, pair)).toThrow(
      /Expected property name|Unexpected token/,
    );
  });

  it("rejects duplicate JSON-LD output", () => {
    expect(() => validatePage(duplicateJsonLd(html), page, pair)).toThrow(/JSON-LD count/);
  });

  it("rejects raw script-like JSON-LD content before it can escape the data block", () => {
    expect(() => validatePage(injectRawScriptTag(html), page, pair)).toThrow(/unescaped/);
  });
});
