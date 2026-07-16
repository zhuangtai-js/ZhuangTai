import type { StarlightRouteData } from "@astrojs/starlight/route-data";
import { mergePageJsonLd, serializeJsonLd } from "./json-ld";

type HeadEntry = StarlightRouteData["head"][number];

function readAttribute(entry: HeadEntry, name: string): string | undefined {
  const value = entry.attrs?.[name];
  return typeof value === "string" ? value : undefined;
}

function isJsonLdScript(entry: HeadEntry): boolean {
  const type = readAttribute(entry, "type");
  return entry.tag === "script" && type?.trim().toLowerCase() === "application/ld+json";
}

function requireScriptContent(entry: HeadEntry): string {
  if (typeof entry.content === "string" && entry.content.trim().length > 0) {
    return entry.content;
  }
  throw new JsonLdHeadError("INVALID_JSON_LD_CONTENT", "Existing JSON-LD must contain JSON text.");
}

export class JsonLdHeadError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(`[docs/seo] ${message}`);
    this.name = "JsonLdHeadError";
    this.code = code;
  }
}

export function mergePageJsonLdIntoHead(
  head: StarlightRouteData["head"],
  pageJsonLd: object,
  canonical: URL,
): void {
  const scriptIndices: number[] = [];
  const existingContents: string[] = [];

  for (const [index, entry] of head.entries()) {
    if (!isJsonLdScript(entry)) continue;
    scriptIndices.push(index);
    existingContents.push(requireScriptContent(entry));
  }

  const mergedScript: HeadEntry = {
    tag: "script",
    attrs: {
      type: "application/ld+json",
      "data-zhuangtai-seo": "page-json-ld",
    },
    content: serializeJsonLd(mergePageJsonLd(existingContents, pageJsonLd, canonical)),
  };
  const firstIndex = scriptIndices[0];
  if (firstIndex === undefined) {
    head.push(mergedScript);
    return;
  }

  head[firstIndex] = mergedScript;
  for (let index = scriptIndices.length - 1; index >= 1; index -= 1) {
    const duplicateIndex = scriptIndices[index];
    if (duplicateIndex !== undefined) head.splice(duplicateIndex, 1);
  }
}
