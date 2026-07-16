import type { StarlightRouteData } from "@astrojs/starlight/route-data";
import { site } from "../config/site.mjs";
import { mergePageJsonLdIntoHead } from "./head-json-ld";
import { createPageJsonLd } from "./json-ld";

export type PageHeadInput = {
  readonly head: StarlightRouteData["head"];
  readonly lang: StarlightRouteData["lang"];
  readonly sidebar: StarlightRouteData["sidebar"];
};

type HeadEntry = StarlightRouteData["head"][number];
type MetaSpec = {
  readonly attribute: "name" | "property";
  readonly value: string;
  readonly content: string;
};
type LocaleSeo = {
  readonly alternateLocale: string;
  readonly homeLabel: string;
  readonly homePath: string;
  readonly imageAlt: string;
};

export class SeoMetadataError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(`[docs/seo] ${message}`);
    this.name = "SeoMetadataError";
    this.code = code;
  }
}

function readAttribute(entry: HeadEntry, name: string): string | undefined {
  const value = entry.attrs?.[name];
  return typeof value === "string" ? value : undefined;
}

function requireSingle(
  head: StarlightRouteData["head"],
  predicate: (entry: HeadEntry) => boolean,
  label: string,
): HeadEntry {
  const matches = head.filter(predicate);
  if (matches.length !== 1) {
    throw new SeoMetadataError(
      "INVALID_HEAD_CARDINALITY",
      `Expected exactly one ${label}, received ${matches.length}.`,
    );
  }
  const entry = matches[0];
  if (entry === undefined) {
    throw new SeoMetadataError("MISSING_HEAD_ENTRY", `Missing ${label}.`);
  }
  return entry;
}

function requireContent(entry: HeadEntry, label: string): string {
  const content = entry.content ?? readAttribute(entry, "content");
  if (content === undefined || content.trim().length === 0) {
    throw new SeoMetadataError("INVALID_HEAD_CONTENT", `${label} must have text content.`);
  }
  return content;
}

function requireMetaContent(
  head: StarlightRouteData["head"],
  attribute: "name" | "property",
  value: string,
): string {
  const entry = requireSingle(
    head,
    (candidate) => candidate.tag === "meta" && readAttribute(candidate, attribute) === value,
    `meta[${attribute}="${value}"]`,
  );
  return requireContent(entry, `meta[${attribute}="${value}"]`);
}

function requireCanonical(head: StarlightRouteData["head"]): URL {
  const entry = requireSingle(
    head,
    (candidate) => candidate.tag === "link" && readAttribute(candidate, "rel") === "canonical",
    'link[rel="canonical"]',
  );
  const href = readAttribute(entry, "href");
  if (href === undefined || !URL.canParse(href)) {
    throw new SeoMetadataError("INVALID_CANONICAL", "Canonical URL must be absolute.");
  }
  const canonical = new URL(href);
  if (canonical.origin !== new URL(site).origin) {
    throw new SeoMetadataError("INVALID_CANONICAL_ORIGIN", `Canonical URL must use ${site}.`);
  }
  return canonical;
}

function ensureMeta(head: StarlightRouteData["head"], spec: MetaSpec): void {
  const matches = head.filter(
    (entry) => entry.tag === "meta" && readAttribute(entry, spec.attribute) === spec.value,
  );
  if (matches.length > 1) {
    throw new SeoMetadataError(
      "DUPLICATE_META",
      `Expected at most one meta[${spec.attribute}="${spec.value}"].`,
    );
  }
  const existing = matches[0];
  if (existing !== undefined) {
    if (requireContent(existing, spec.value) !== spec.content) {
      throw new SeoMetadataError(
        "CONFLICTING_META",
        `Existing ${spec.value} metadata does not match the page value.`,
      );
    }
    return;
  }
  head.push({
    tag: "meta",
    attrs: {
      [spec.attribute]: spec.value,
      content: spec.content,
    },
  });
}

function localeSeo(lang: string): LocaleSeo {
  switch (lang) {
    case "zh-CN":
      return {
        alternateLocale: "en",
        homeLabel: "首页",
        homePath: "/",
        imageAlt: "ZhuàngTài 状态：简单、直接的 JavaScript 状态原语。",
      };
    case "en":
      return {
        alternateLocale: "zh-CN",
        homeLabel: "Home",
        homePath: "/en/",
        imageAlt: "ZhuàngTài: Simple, direct state primitives for JavaScript.",
      };
    default:
      throw new SeoMetadataError("UNSUPPORTED_LOCALE", `Unsupported page locale: ${lang}.`);
  }
}

function findCurrentLabel(entries: StarlightRouteData["sidebar"]): string | undefined {
  for (const entry of entries) {
    switch (entry.type) {
      case "link":
        if (entry.isCurrent) return entry.label;
        break;
      case "group": {
        const nested = findCurrentLabel(entry.entries);
        if (nested !== undefined) return nested;
        break;
      }
    }
  }
  return undefined;
}

function normalizeHomeTitle(
  head: StarlightRouteData["head"],
  canonical: URL,
  pageTitle: string,
): void {
  const title = requireSingle(head, (entry) => entry.tag === "title", "title");
  if (canonical.pathname === "/" || canonical.pathname === "/en/") {
    title.content = pageTitle;
  }
}

function applyPageHeadEnhancements(input: PageHeadInput): void {
  const canonical = requireCanonical(input.head);
  const title = requireMetaContent(input.head, "property", "og:title");
  const description = requireMetaContent(input.head, "property", "og:description");
  const currentLocale = requireMetaContent(input.head, "property", "og:locale");
  const locale = localeSeo(input.lang);
  const homeUrl = new URL(locale.homePath, site).href;
  const imageUrl = new URL("/og.png", site).href;

  if (currentLocale !== input.lang) {
    throw new SeoMetadataError(
      "INVALID_OG_LOCALE",
      "Open Graph locale must match the route locale.",
    );
  }

  normalizeHomeTitle(input.head, canonical, title);
  for (const spec of [
    { attribute: "property", value: "og:locale:alternate", content: locale.alternateLocale },
    { attribute: "property", value: "og:image:alt", content: locale.imageAlt },
    { attribute: "name", value: "twitter:title", content: title },
    { attribute: "name", value: "twitter:description", content: description },
  ] satisfies readonly MetaSpec[]) {
    ensureMeta(input.head, spec);
  }

  const jsonLd = createPageJsonLd({
    canonical,
    description,
    imageUrl,
    lang: input.lang,
    title,
    breadcrumbLabel: findCurrentLabel(input.sidebar) ?? title,
    homeLabel: locale.homeLabel,
    homeUrl,
    schemaType:
      canonical.pathname === "/" || canonical.pathname === "/en/"
        ? "SoftwareSourceCode"
        : "TechArticle",
  });
  mergePageJsonLdIntoHead(input.head, jsonLd, canonical);
}

export function enhancePageHead(input: PageHeadInput): void {
  const plannedHead = structuredClone(input.head);
  applyPageHeadEnhancements({
    head: plannedHead,
    lang: input.lang,
    sidebar: input.sidebar,
  });
  input.head.splice(0, input.head.length, ...plannedHead);
}
