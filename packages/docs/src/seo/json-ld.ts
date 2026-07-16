export type PageSchemaType = "SoftwareSourceCode" | "TechArticle";

export type PageJsonLdInput = {
  readonly canonical: URL;
  readonly description: string;
  readonly imageUrl: string;
  readonly lang: string;
  readonly title: string;
  readonly breadcrumbLabel: string;
  readonly homeLabel: string;
  readonly homeUrl: string;
  readonly schemaType: PageSchemaType;
};

export class JsonLdSerializationError extends Error {
  readonly code = "JSON_LD_SERIALIZATION_FAILED";

  constructor() {
    super("[docs/seo] JSON-LD serialization returned no output.");
    this.name = "JsonLdSerializationError";
  }
}

export function serializeJsonLd(value: unknown): string {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) throw new JsonLdSerializationError();
  return serialized.replaceAll("<", "\\u003c");
}

export function createPageJsonLd(input: PageJsonLdInput): object {
  const canonical = input.canonical.href;
  const primary =
    input.schemaType === "SoftwareSourceCode"
      ? {
          "@type": "SoftwareSourceCode",
          "@id": `${canonical}#software`,
          name: input.title,
          description: input.description,
          url: canonical,
          image: input.imageUrl,
          inLanguage: input.lang,
          programmingLanguage: "JavaScript",
        }
      : {
          "@type": "TechArticle",
          "@id": `${canonical}#article`,
          headline: input.title,
          description: input.description,
          url: canonical,
          image: input.imageUrl,
          inLanguage: input.lang,
          mainEntityOfPage: canonical,
          author: {
            "@type": "Organization",
            name: "ZhuàngTài",
          },
          publisher: {
            "@type": "Organization",
            name: "ZhuàngTài",
          },
        };
  const itemListElement = [
    {
      "@type": "ListItem",
      position: 1,
      name: input.homeLabel,
      item: input.homeUrl,
    },
  ];

  if (canonical !== input.homeUrl) {
    itemListElement.push({
      "@type": "ListItem",
      position: 2,
      name: input.breadcrumbLabel,
      item: canonical,
    });
  }

  return {
    "@context": "https://schema.org",
    "@graph": [
      primary,
      {
        "@type": "BreadcrumbList",
        "@id": `${canonical}#breadcrumb`,
        itemListElement,
      },
    ],
  };
}

type JsonObject = {
  readonly [key: string]: unknown;
};

export class JsonLdMergeError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(`[docs/seo] ${message}`);
    this.name = "JsonLdMergeError";
    this.code = code;
  }
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseJsonLd(content: string, index: number): unknown {
  try {
    return JSON.parse(content);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new JsonLdMergeError(
        "INVALID_EXISTING_JSON_LD",
        `Existing JSON-LD script ${index + 1} is malformed.`,
      );
    }
    throw error;
  }
}

function graphNodes(value: unknown, label: string): readonly JsonObject[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => graphNodes(entry, label));
  }
  if (!isJsonObject(value)) {
    throw new JsonLdMergeError("INVALID_JSON_LD_SHAPE", `${label} must contain JSON-LD objects.`);
  }

  const context = value["@context"];
  const graph = value["@graph"];
  if (graph !== undefined) {
    if (!Array.isArray(graph)) {
      throw new JsonLdMergeError("INVALID_JSON_LD_GRAPH", `${label} has a non-array @graph.`);
    }
    if (context === undefined || context === "https://schema.org") {
      return graph.flatMap((entry) => graphNodes(entry, label));
    }
    return [value];
  }

  const nodeEntries = Object.entries(value).filter(([key]) => key !== "@context");
  if (nodeEntries.length === 0) return [];
  return context === "https://schema.org" ? [Object.fromEntries(nodeEntries)] : [value];
}

function breadcrumbTargetsCanonical(value: JsonObject, canonical: string): boolean {
  if (value["@type"] !== "BreadcrumbList") return false;
  const items = value.itemListElement;
  return (
    Array.isArray(items) && items.some((item) => isJsonObject(item) && item.item === canonical)
  );
}

function hasAbsoluteOffsiteId(value: JsonObject, canonical: URL): boolean {
  const id = value["@id"];
  if (typeof id !== "string") return false;
  try {
    return new URL(id).origin !== canonical.origin;
  } catch {
    return false;
  }
}

function idTargetsPageFragment(value: JsonObject, canonical: URL, fragment: string): boolean {
  const id = value["@id"];
  if (typeof id !== "string") return false;
  try {
    return new URL(id, canonical).href === `${canonical.href}#${fragment}`;
  } catch {
    return false;
  }
}

function isZhuangTaiPageNode(value: JsonObject, canonical: URL): boolean {
  const type = value["@type"];
  if (type !== "SoftwareSourceCode" && type !== "TechArticle" && type !== "BreadcrumbList") {
    return false;
  }
  if (hasAbsoluteOffsiteId(value, canonical)) return false;
  if (type === "BreadcrumbList") {
    return (
      idTargetsPageFragment(value, canonical, "breadcrumb") ||
      breadcrumbTargetsCanonical(value, canonical.href)
    );
  }
  const fragment = type === "SoftwareSourceCode" ? "software" : "article";
  return idTargetsPageFragment(value, canonical, fragment) || value.url === canonical.href;
}

export function mergePageJsonLd(
  existingContents: readonly string[],
  pageJsonLd: object,
  canonical: URL,
): object {
  const existingNodes = existingContents.flatMap((content, index) =>
    graphNodes(parseJsonLd(content, index), `Existing JSON-LD script ${index + 1}`),
  );
  const pageNodes = graphNodes(pageJsonLd, "Generated page JSON-LD");

  return {
    "@context": "https://schema.org",
    "@graph": [
      ...existingNodes.filter((node) => !isZhuangTaiPageNode(node, canonical)),
      ...pageNodes,
    ],
  };
}
