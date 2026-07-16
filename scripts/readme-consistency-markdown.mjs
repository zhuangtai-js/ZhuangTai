import assert from "node:assert/strict";

function blockquoteContent(line, maximumDepth = Number.POSITIVE_INFINITY) {
  let content = line;
  let depth = 0;
  let marker;

  while (depth < maximumDepth && (marker = /^ {0,3}>[ \t]?/u.exec(content)) !== null) {
    content = content.slice(marker[0].length);
    depth += 1;
  }

  return { content, depth };
}

function visibleMarkdownLines(markdown) {
  const visibleLines = [];
  let fence;

  for (const line of markdown.split(/\r?\n/u)) {
    if (fence !== undefined) {
      const container = blockquoteContent(line, fence.blockquoteDepth);
      if (container.depth === fence.blockquoteDepth) {
        const closing = /^( {0,3})(`{3,}|~{3,})\s*$/u.exec(container.content);
        if (
          closing !== null &&
          closing[2][0] === fence.marker[0] &&
          closing[2].length >= fence.marker.length
        ) {
          fence = undefined;
        }
        continue;
      }

      fence = undefined;
    }

    const container = blockquoteContent(line);
    const opening = /^( {0,3})(`{3,}|~{3,})(.*)$/u.exec(container.content);
    if (opening !== null && !(opening[2][0] === "`" && opening[3].includes("`"))) {
      fence = { marker: opening[2], blockquoteDepth: container.depth };
      continue;
    }

    visibleLines.push(line);
  }

  return visibleLines;
}

function commands(markdown, prefix) {
  return markdown
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.startsWith(`${prefix} `));
}

function markdownSection(markdown, title, source) {
  const lines = markdown.split(/\r?\n/u);
  const matches = [];
  let fence;
  let start;
  let level;

  for (const [index, line] of lines.entries()) {
    const opening = /^( {0,3})(`{3,}|~{3,})(.*)$/u.exec(line);
    if (
      fence === undefined &&
      opening !== null &&
      !(opening[2][0] === "`" && opening[3].includes("`"))
    ) {
      fence = opening[2];
      continue;
    }
    if (fence !== undefined) {
      const closing = /^( {0,3})(`{3,}|~{3,})\s*$/u.exec(line);
      if (closing !== null && closing[2][0] === fence[0] && closing[2].length >= fence.length) {
        fence = undefined;
      }
      continue;
    }

    const heading = /^(#{1,6})\s+(.+?)\s*#*\s*$/u.exec(line);
    if (heading === null) {
      continue;
    }
    if (start !== undefined && heading[1].length <= level) {
      matches.push(lines.slice(start, index).join("\n"));
      start = undefined;
      level = undefined;
    }
    if (heading[2] === title) {
      assert.equal(start, undefined, `${source} nests duplicate ${title} sections`);
      start = index + 1;
      level = heading[1].length;
    }
  }

  if (start !== undefined) {
    matches.push(lines.slice(start).join("\n"));
  }
  assert.equal(matches.length, 1, `${source} must contain exactly one ${title} section`);
  return matches[0];
}

function markdownSlug(heading) {
  return heading
    .toLowerCase()
    .replace(/<[^>]+>/gu, "")
    .replace(/[`*_~]/gu, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/gu, "-")
    .replace(/-+/gu, "-");
}

function markdownAnchors(markdown, source) {
  const anchors = new Set();
  const slugCounts = new Map();

  for (const line of visibleMarkdownLines(markdown, source)) {
    const heading = /^ {0,3}#{1,6}\s+(.+?)\s*#*\s*$/u.exec(line)?.[1];
    if (heading !== undefined) {
      const baseSlug = markdownSlug(heading);
      const count = slugCounts.get(baseSlug) ?? 0;
      anchors.add(count === 0 ? baseSlug : `${baseSlug}-${count}`);
      slugCounts.set(baseSlug, count + 1);
    }

    for (const match of line.matchAll(/\b(?:id|name)=["']([^"']+)["']/gu)) {
      anchors.add(match[1]);
    }
  }

  return anchors;
}

function localDocumentationTargets(markdown, source) {
  const visible = visibleMarkdownLines(markdown, source).join("\n");
  const targets = [];

  for (const match of visible.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/gu)) {
    targets.push(
      match[1]
        .trim()
        .replace(/^<|>$/gu, "")
        .split(/\s+["']/u, 1)[0],
    );
  }
  for (const match of visible.matchAll(/^ {0,3}\[[^\]]+\]:\s*(\S+)/gmu)) {
    targets.push(match[1].replace(/^<|>$/gu, ""));
  }
  for (const match of visible.matchAll(/\b(?:href|src)=["']([^"']+)["']/gu)) {
    targets.push(match[1]);
  }

  return targets
    .map((target) => {
      if (target.startsWith("https://zhuangtai.yojigen.cn/")) {
        const url = new URL(target);
        return `${url.pathname}${url.search}${url.hash}`;
      }

      return target;
    })
    .filter(
      (target) =>
        target.length > 0 && (target.startsWith("#") || !/^[a-z][a-z\d+.-]*:/iu.test(target)),
    );
}

export {
  commands,
  localDocumentationTargets,
  markdownAnchors,
  markdownSection,
  visibleMarkdownLines,
};
