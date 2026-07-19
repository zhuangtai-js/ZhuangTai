// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import {
  frameworkGuideFiles,
  jsonLdUrlErrors,
  pagePairs,
  parseHtml,
  readBuiltFile,
  readJsonLd,
  readPageDocument,
  readSitemapUrls,
  representativePages,
  site,
} from "./seo-output-fixtures.mjs";

const siteTitle = "ZhuàngTài 状态";

function contents(document, selector) {
  return [...document.querySelectorAll(selector)].map((element) => element.getAttribute("content"));
}

function linkValues(document, selector, attribute) {
  return [...document.querySelectorAll(selector)].map((element) => element.getAttribute(attribute));
}

function graphTypes(jsonLd) {
  const graph = jsonLd?.["@graph"];
  if (!Array.isArray(graph)) return [];
  return graph.map((entry) => entry?.["@type"]);
}

describe("generated page metadata", () => {
  it.each(representativePages)("keeps default metadata unique for $key", (page) => {
    const document = readPageDocument(page);
    const expectedDocumentTitle =
      page.path === "/" || page.path === "/en/" ? page.title : `${page.title} | ${siteTitle}`;

    expect([...document.querySelectorAll("title")].map((title) => title.textContent)).toEqual([
      expectedDocumentTitle,
    ]);
    expect(contents(document, 'meta[name="description"]')).toEqual([page.description]);
    expect(linkValues(document, 'link[rel="canonical"]', "href")).toEqual([`${site}${page.path}`]);
    expect(contents(document, 'meta[property="og:title"]')).toEqual([page.title]);
    expect(contents(document, 'meta[property="og:description"]')).toEqual([page.description]);
  });

  it.each(representativePages)("adds complete social metadata for $key", (page) => {
    const document = readPageDocument(page);
    const alternateLocale = page.lang === "en" ? "zh-CN" : "en";

    expect(contents(document, 'meta[property="og:url"]')).toEqual([`${site}${page.path}`]);
    expect(contents(document, 'meta[property="og:locale"]')).toEqual([page.lang]);
    expect(contents(document, 'meta[property="og:locale:alternate"]')).toEqual([alternateLocale]);
    expect(contents(document, 'meta[property="og:image"]')).toEqual([`${site}/og.png`]);
    expect(contents(document, 'meta[property="og:image:alt"]')).toHaveLength(1);
    expect(contents(document, 'meta[name="twitter:card"]')).toEqual(["summary_large_image"]);
    expect(contents(document, 'meta[name="twitter:image"]')).toEqual([`${site}/og.png`]);
    expect(contents(document, 'meta[name="twitter:title"]')).toEqual([page.title]);
    expect(contents(document, 'meta[name="twitter:description"]')).toEqual([page.description]);
  });

  it.each(representativePages)("emits valid structured data for $key", (page) => {
    const document = readPageDocument(page);
    const blocks = readJsonLd(document);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.["@context"]).toBe("https://schema.org");
    expect(graphTypes(blocks[0])).toEqual([page.schemaType, "BreadcrumbList"]);
    expect(jsonLdUrlErrors(blocks[0])).toEqual([]);
  });

  it.each(pagePairs)("keeps reciprocal hreflang links for $key", (pair) => {
    const expected = [
      ["zh-CN", `${site}${pair.zh.path}`],
      ["en", `${site}${pair.en.path}`],
      ["x-default", `${site}${pair.zh.path}`],
    ];

    for (const page of [pair.zh, pair.en]) {
      const document = readPageDocument(page);
      const alternates = [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map(
        (link) => [link.getAttribute("hreflang"), link.getAttribute("href")],
      );
      expect(alternates).toEqual(expected);
    }
  });

  it("keeps framework and Expo titles and descriptions human-readable and unique", () => {
    const pages = frameworkGuideFiles.map((file) => parseHtml(readBuiltFile(file)));
    const locales = [pages.slice(0, 7), pages.slice(7)];

    for (const localePages of locales) {
      const titles = localePages.map((document) =>
        document.querySelector('meta[property="og:title"]')?.getAttribute("content"),
      );
      const descriptions = localePages.map((document) =>
        document.querySelector('meta[name="description"]')?.getAttribute("content"),
      );

      expect(titles.every((title) => typeof title === "string" && title.length > 4)).toBe(true);
      expect(
        descriptions.every(
          (description) =>
            typeof description === "string" && description.length > 20 && description.length < 180,
        ),
      ).toBe(true);
      expect(new Set(titles).size).toBe(titles.length);
      expect(new Set(descriptions).size).toBe(descriptions.length);
    }
  });

  it("keeps robots and sitemap output complete", () => {
    const robots = readBuiltFile("robots.txt");
    const sitemapUrls = readSitemapUrls();

    expect(robots).toContain(`Sitemap: ${site}/sitemap-index.xml`);
    for (const page of representativePages) {
      expect(sitemapUrls).toContain(`${site}${page.path}`);
    }
    for (const file of frameworkGuideFiles) {
      const route = `/${file.replace(/index\.html$/, "")}`;
      expect(sitemapUrls).toContain(`${site}${route}`);
    }
  });
});
