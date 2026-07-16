function isWhitespace(character) {
  return character === " " || character === "\t" || character === "\r" || character === "\n";
}

function fenceMarker(line) {
  let index = 0;
  while (index < 3 && line[index] === " ") index += 1;
  const character = line[index];
  if (character !== "`" && character !== "~") return null;

  let end = index;
  while (line[end] === character) end += 1;
  const length = end - index;
  return length >= 3 ? { character, length } : null;
}

function stripComments(line, commentEnd) {
  let output = "";
  let index = 0;
  while (index < line.length) {
    if (commentEnd) {
      const end = line.indexOf(commentEnd, index);
      if (end === -1) return { line: output, commentEnd };
      output += " ";
      index = end + commentEnd.length;
      commentEnd = null;
      continue;
    }

    if (line.startsWith("<!--", index)) {
      output += " ";
      index += 4;
      commentEnd = "-->";
      continue;
    }
    if (line.startsWith("{/*", index)) {
      output += " ";
      index += 3;
      commentEnd = "*/}";
      continue;
    }

    output += line[index];
    index += 1;
  }
  return { line: output, commentEnd };
}

export function stripNonSemanticMarkdown(source) {
  let fence = null;
  let commentEnd = null;
  return source
    .split(/\r?\n/u)
    .map((line) => {
      if (fence) {
        const marker = fenceMarker(line);
        if (marker?.character === fence.character && marker.length >= fence.length) fence = null;
        return "";
      }
      if (commentEnd) {
        const result = stripComments(line, commentEnd);
        commentEnd = result.commentEnd;
        return result.line;
      }
      const marker = fenceMarker(line);
      if (marker) {
        fence = marker;
        return "";
      }

      const result = stripComments(line, commentEnd);
      commentEnd = result.commentEnd;
      return result.line;
    })
    .join("\n");
}

function stripInlineCode(source) {
  let output = "";
  let delimiterLength = 0;
  let index = 0;
  while (index < source.length) {
    if (delimiterLength === 0 && source[index] !== "`") {
      output += source[index];
      index += 1;
      continue;
    }

    let end = index;
    while (source[end] === "`") end += 1;
    if (end === index) {
      output += source[index] === "\n" ? "\n" : " ";
      index += 1;
      continue;
    }

    const length = end - index;
    if (delimiterLength === 0) delimiterLength = length;
    else if (length >= delimiterLength) delimiterLength = 0;
    output += " ".repeat(length);
    index = end;
  }
  return output;
}

function semanticSource(source) {
  return stripInlineCode(stripNonSemanticMarkdown(source));
}

function isTagBoundary(character) {
  return (
    character === undefined || isWhitespace(character) || character === "/" || character === ">"
  );
}

function findTagStart(source, name, fromIndex) {
  const prefix = `<${name}`;
  let index = source.indexOf(prefix, fromIndex);
  while (index !== -1 && !isTagBoundary(source[index + prefix.length])) {
    index = source.indexOf(prefix, index + prefix.length);
  }
  return index;
}

function findTagEnd(source, start) {
  let quote = null;
  let braces = 0;
  for (let index = start + 1; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (character === quote && source[index - 1] !== "\\") quote = null;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === "{") {
      braces += 1;
      continue;
    }
    if (character === "}" && braces > 0) {
      braces -= 1;
      continue;
    }
    if (character === ">" && braces === 0) return index + 1;
  }
  return -1;
}

function readAttribute(source, start, end, tagName, wantedName) {
  let index = start + tagName.length + 1;
  while (index < end - 1) {
    while (isWhitespace(source[index])) index += 1;
    if (source[index] === "/" || source[index] === ">") return null;

    const nameStart = index;
    while (
      index < end &&
      !isWhitespace(source[index]) &&
      source[index] !== "=" &&
      source[index] !== "/" &&
      source[index] !== ">"
    ) {
      index += 1;
    }
    const name = source.slice(nameStart, index);
    while (isWhitespace(source[index])) index += 1;
    if (source[index] !== "=") continue;

    index += 1;
    while (isWhitespace(source[index])) index += 1;
    const quote = source[index];
    if (quote === '"' || quote === "'") {
      const valueStart = index + 1;
      const valueEnd = source.indexOf(quote, valueStart);
      if (valueEnd === -1) return null;
      if (name === wantedName) return source.slice(valueStart, valueEnd);
      index = valueEnd + 1;
      continue;
    }

    if (source[index] === "{") {
      let depth = 1;
      index += 1;
      while (index < end && depth > 0) {
        if (source[index] === "{") depth += 1;
        if (source[index] === "}") depth -= 1;
        index += 1;
      }
      continue;
    }
    while (index < end && !isWhitespace(source[index]) && source[index] !== ">") index += 1;
  }
  return null;
}

function findClosingTag(source, name, fromIndex) {
  const prefix = `</${name}`;
  let index = source.indexOf(prefix, fromIndex);
  while (index !== -1 && !isTagBoundary(source[index + prefix.length])) {
    index = source.indexOf(prefix, index + prefix.length);
  }
  if (index === -1) return null;
  const end = findTagEnd(source, index);
  return end === -1 ? null : { start: index, end };
}

function firstAnchorHref(source, fromIndex, endIndex) {
  let index = findTagStart(source, "a", fromIndex);
  while (index !== -1 && index < endIndex) {
    const end = findTagEnd(source, index);
    if (end === -1 || end > endIndex) return null;
    const href = readAttribute(source, index, end, "a", "href");
    if (href !== null) return href;
    index = findTagStart(source, "a", end);
  }
  return null;
}

function firstHeadingLabel(source, fromIndex, endIndex) {
  const body = source.slice(fromIndex, endIndex);
  const match = body.match(/<h([1-6])(?:\s[^>]*)?>([\s\S]*?)<\/h\1\s*>/u);
  return match ? match[2].replace(/<[^>]+>/gu, " ").trim() : null;
}

export function homepageCardLinks(source) {
  const cards = new Map();
  const semantic = semanticSource(source);
  let index = findTagStart(semantic, "Card", 0);
  while (index !== -1) {
    const openingEnd = findTagEnd(semantic, index);
    if (openingEnd === -1) break;
    const closing = findClosingTag(semantic, "Card", openingEnd);
    if (!closing) break;

    const label =
      readAttribute(semantic, index, openingEnd, "Card", "label") ??
      readAttribute(semantic, index, openingEnd, "Card", "title") ??
      firstHeadingLabel(semantic, openingEnd, closing.start);
    const href = firstAnchorHref(semantic, openingEnd, closing.start);
    if (label && href !== null && !cards.has(label)) cards.set(label, href);
    index = findTagStart(semantic, "Card", closing.end);
  }
  return cards;
}

export function internalLinks(source) {
  const links = [];
  const pattern = /(?:\]\(|href=["'])(\/[^")']+)/gu;
  for (const match of semanticSource(source).matchAll(pattern)) {
    const withoutHash = match[1].split(/[?#]/u, 1)[0];
    links.push(
      withoutHash === "/" ? "/" : withoutHash.endsWith("/") ? withoutHash : `${withoutHash}/`,
    );
  }
  return links;
}

export function exampleTargets(source) {
  const targets = [];
  const pattern = /(?:\]\(|href=["'])(?:[^")']*\/)?examples\/([a-z0-9-]+)/gu;
  for (const match of semanticSource(source).matchAll(pattern)) targets.push(match[1]);
  return targets;
}
