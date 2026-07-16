import { describe, expect, it } from "vitest";
import { enhancePageHead, SeoMetadataError, type PageHeadInput } from "../src/seo/page-head";

type Head = PageHeadInput["head"];

function pageHead(title: string): Head {
  return [
    { tag: "title", content: `${title} | ZhuàngTài 状态` },
    {
      tag: "link",
      attrs: { rel: "canonical", href: "https://zhuangtai.yojigen.cn/guides/react/" },
    },
    { tag: "meta", attrs: { property: "og:title", content: title } },
    {
      tag: "meta",
      attrs: { property: "og:description", content: "A safe route description." },
    },
    { tag: "meta", attrs: { property: "og:locale", content: "en" } },
  ];
}

function enhance(head: Head): void {
  enhancePageHead({ head, lang: "en", sidebar: [] });
}

function jsonLdScripts(head: Head): Head {
  return head.filter((entry) => {
    const type = entry.attrs?.type;
    return (
      entry.tag === "script" &&
      typeof type === "string" &&
      type.toLowerCase() === "application/ld+json"
    );
  });
}

type JsonObject = {
  readonly [key: string]: unknown;
};

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readGraph(content: string | undefined): readonly JsonObject[] {
  const parsed: unknown = JSON.parse(content ?? "");
  if (!isJsonObject(parsed) || !Array.isArray(parsed["@graph"])) {
    throw new Error("Expected a JSON-LD @graph array.");
  }
  const graph = parsed["@graph"];
  if (!graph.every(isJsonObject)) throw new Error("Expected JSON-LD graph objects.");
  return graph;
}

function captureSeoError(action: () => void): SeoMetadataError {
  try {
    action();
  } catch (error) {
    if (error instanceof SeoMetadataError) return error;
    throw error;
  }
  throw new Error("Expected SeoMetadataError.");
}

describe("page SEO metadata safety", () => {
  it("escapes script-like page titles before JSON-LD reaches set:html", () => {
    const unsafeTitle = "React </script><script>alert('seo')</script>";
    const head = pageHead(unsafeTitle);

    enhance(head);

    const jsonLd = head.find(
      (entry) => entry.tag === "script" && entry.attrs?.type === "application/ld+json",
    );
    expect(jsonLd?.content).not.toContain("<script");
    expect(jsonLd?.content).not.toContain("</script");
    expect(jsonLd?.content).toContain("\\u003cscript");
    const parsed = JSON.parse(jsonLd?.content ?? "");
    expect(parsed["@graph"][0].headline).toBe(unsafeTitle);
  });

  it("merges an unmarked third-party JSON-LD script into one escaped graph", () => {
    const head = pageHead("React quick start");
    head.push({
      tag: "script",
      attrs: { id: "third-party-schema", type: "Application/LD+JSON" },
      content: '{"@context":"https://schema.org","@type":"Organization","name":"Third <Party>"}',
    });

    enhance(head);

    const scripts = jsonLdScripts(head);
    expect(scripts).toHaveLength(1);
    expect(scripts[0]?.content).not.toContain("<");
    const graph = readGraph(scripts[0]?.content);
    expect(graph).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ "@type": "Organization", name: "Third <Party>" }),
        expect.objectContaining({ "@type": "TechArticle", headline: "React quick start" }),
        expect.objectContaining({ "@type": "BreadcrumbList" }),
      ]),
    );
  });

  it("replaces a stale ZhuàngTài page graph without dropping unrelated schema", () => {
    const head = pageHead("React quick start");
    const canonical = "https://zhuangtai.yojigen.cn/guides/react/";
    head.push({
      tag: "script",
      attrs: { type: "application/ld+json" },
      content: JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "TechArticle",
            "@id": `${canonical}#article`,
            headline: "Stale title",
            url: canonical,
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: [{ "@type": "ListItem", position: 1, item: canonical }],
          },
          {
            "@type": "Organization",
            "@id": "https://third.example/#organization",
            name: "Third Party",
          },
        ],
      }),
    });

    enhance(head);

    const scripts = jsonLdScripts(head);
    expect(scripts).toHaveLength(1);
    const graph = readGraph(scripts[0]?.content);
    expect(graph.filter((entry) => entry["@id"] === `${canonical}#article`)).toEqual([
      expect.objectContaining({ headline: "React quick start" }),
    ]);
    expect(graph).toContainEqual(
      expect.objectContaining({ "@id": "https://third.example/#organization" }),
    );
    expect(graph.filter((entry) => entry["@type"] === "BreadcrumbList")).toHaveLength(1);
  });

  it("preserves offsite page-schema ids while replacing local identifier variants", () => {
    const head = pageHead("React quick start");
    const canonical = "https://zhuangtai.yojigen.cn/guides/react/";
    const thirdPartyIds = [
      "https://third.example/#article",
      "https://third.example/#software",
      "https://third.example/#breadcrumb",
    ];
    head.push({
      tag: "script",
      attrs: { type: "application/ld+json" },
      content: JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "TechArticle",
            "@id": thirdPartyIds[0],
            headline: "Third-party annotation of this page",
            url: canonical,
          },
          {
            "@type": "SoftwareSourceCode",
            "@id": thirdPartyIds[1],
            name: "Third-party source annotation",
            url: canonical,
          },
          {
            "@type": "BreadcrumbList",
            "@id": thirdPartyIds[2],
            itemListElement: [{ "@type": "ListItem", position: 1, item: canonical }],
          },
          {
            "@type": "SoftwareSourceCode",
            "@id": "#software",
            name: "Stale fragment source",
            url: canonical,
          },
          {
            "@type": "BreadcrumbList",
            "@id": "./#breadcrumb",
            itemListElement: [{ "@type": "ListItem", position: 1, item: canonical }],
          },
        ],
      }),
    });

    enhance(head);

    const graph = readGraph(jsonLdScripts(head)[0]?.content);
    for (const id of thirdPartyIds) {
      expect(graph).toContainEqual(expect.objectContaining({ "@id": id }));
    }
    expect(graph).toContainEqual(
      expect.objectContaining({
        "@id": "https://third.example/#article",
        headline: "Third-party annotation of this page",
      }),
    );
    expect(graph).not.toContainEqual(expect.objectContaining({ "@id": "#software" }));
    expect(graph).not.toContainEqual(expect.objectContaining({ "@id": "./#breadcrumb" }));
    expect(graph.filter((entry) => entry["@id"] === `${canonical}#article`)).toHaveLength(1);
    expect(graph.filter((entry) => entry["@id"] === `${canonical}#breadcrumb`)).toHaveLength(1);
  });

  it("rejects malformed existing JSON-LD before mutating the head", () => {
    const head = pageHead("React quick start");
    head.push({
      tag: "script",
      attrs: { type: "application/ld+json" },
      content: "{malformed-json",
    });
    const before = structuredClone(head);

    expect(() => enhance(head)).toThrow(/Existing JSON-LD script 1 is malformed/);
    expect(head).toEqual(before);
  });

  it("rejects invalid existing JSON-LD shapes before mutating the head", () => {
    const head = pageHead("React quick start");
    head.push({
      tag: "script",
      attrs: { type: "application/ld+json" },
      content: '{"@context":"https://schema.org","@graph":{}}',
    });
    const before = structuredClone(head);

    expect(() => enhance(head)).toThrow(/non-array @graph/);
    expect(head).toEqual(before);
  });

  it("rejects late metadata conflicts before committing earlier additions", () => {
    const head = pageHead("React quick start");
    head.push({
      tag: "meta",
      attrs: { name: "twitter:title", content: "Conflicting title" },
    });
    const before = structuredClone(head);

    expect(captureSeoError(() => enhance(head)).code).toBe("CONFLICTING_META");
    expect(head).toEqual(before);
  });

  it("rejects duplicate canonical route metadata", () => {
    const head = pageHead("React quick start");
    head.push({
      tag: "link",
      attrs: { rel: "canonical", href: "https://zhuangtai.yojigen.cn/en/guides/react/" },
    });

    const before = structuredClone(head);

    expect(captureSeoError(() => enhance(head)).code).toBe("INVALID_HEAD_CARDINALITY");
    expect(head).toEqual(before);
  });

  it("rejects missing route descriptions", () => {
    const head = pageHead("React quick start").filter(
      (entry) => !(entry.tag === "meta" && entry.attrs?.property === "og:description"),
    );

    const before = structuredClone(head);

    expect(captureSeoError(() => enhance(head)).code).toBe("INVALID_HEAD_CARDINALITY");
    expect(head).toEqual(before);
  });

  it("rejects canonical URLs outside the configured site", () => {
    const head = pageHead("React quick start");
    const canonical = head.find(
      (entry) => entry.tag === "link" && entry.attrs?.rel === "canonical",
    );
    if (canonical?.attrs !== undefined) canonical.attrs.href = "https://example.com/react/";
    const before = structuredClone(head);

    expect(captureSeoError(() => enhance(head)).code).toBe("INVALID_CANONICAL_ORIGIN");
    expect(head).toEqual(before);
  });
});
