import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { sidebar } from "../src/config/sidebar.mjs";

const docsRoot = fileURLToPath(new URL("..", import.meta.url));
const repoRoot = join(docsRoot, "../..");
const chinesePath = join(docsRoot, "src/content/docs/guides/react-native-expo.md");
const englishPath = join(docsRoot, "src/content/docs/en/guides/react-native-expo.md");
const chineseChooserPath = join(docsRoot, "src/content/docs/guides/framework-adapters.md");
const englishChooserPath = join(docsRoot, "src/content/docs/en/guides/framework-adapters.md");
const compileFixturePath = join(repoRoot, "scripts/docs-examples.test.ts");
const screenFixturePath = join(repoRoot, "scripts/docs-examples-react-native.test.tsx");

function read(path) {
  return readFileSync(path, "utf8");
}

function headings(markdown) {
  return [...markdown.matchAll(/^(#{1,3})\s+.+$/gm)].map((match) => match[1].length);
}

function codeFenceLanguages(markdown) {
  return [...markdown.matchAll(/^```(\w*)$/gm)].map((match) => match[1]);
}

function packageSourceFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      files.push(...packageSourceFiles(path));
    } else if (/\.(?:c|m)?(?:js|ts|tsx|jsx)$/.test(entry)) {
      files.push(path);
    }
  }
  return files;
}

const chinese = read(chinesePath);
const english = read(englishPath);

const requiredTechnicalShape = [
  /@zhuangtai-js\/core/,
  /@zhuangtai-js\/react/,
  /@zhuangtai-js\/persist/,
  /View/,
  /Text/,
  /Pressable/,
  /atom/,
  /computed/,
  /AsyncStorage/,
  /@react-native-async-storage\/async-storage/,
  /storage:\s*AsyncStorage/,
  /initial(?:Preferences|Value)/,
  /persist\.ready\(/,
  /persist\.flush\(/,
  /persist\.rehydrate\(/,
  /persist\.clear\(/,
  /onError/,
  /getItem/,
  /setItem/,
  /removeItem/,
  /Promise/,
];

describe("React Native / Expo guide", () => {
  it("keeps Chinese and English pages structurally mirrored", () => {
    expect(headings(chinese)).toEqual(headings(english));
    expect(codeFenceLanguages(chinese)).toEqual(codeFenceLanguages(english));
  });

  it.each([
    ["Chinese", chinese],
    ["English", english],
  ])("contains the complete %s technical shape", (_language, page) => {
    for (const pattern of requiredTechnicalShape) {
      expect(page).toMatch(pattern);
    }
  });

  it.each([
    ["Chinese", chinese],
    ["English", english],
  ])("contains install, loading, lifecycle, and next-step routes in %s", (_language, page) => {
    expect(page).toMatch(
      /pnpm add @zhuangtai-js\/core @zhuangtai-js\/react @zhuangtai-js\/persist/,
    );
    expect(page).toMatch(/@react-native-async-storage\/async-storage/);
    expect(page).toMatch(/hydration|hydrated/i);
    expect(page).toMatch(/onError/);
    expect(page).toMatch(/\]\(\/(?:en\/)?guides\/core-concepts\/\)/);
    expect(page).toMatch(/\]\(\/(?:en\/)?reference\/react\/\)/);
    expect(page).toMatch(/\]\(\/(?:en\/)?reference\/persist\/\)/);
    expect(page).toMatch(/\]\(\/(?:en\/)?guides\/framework-adapters\/\)/);
  });

  it("adds mirrored chooser cards, table rows, direct links, and sidebar routes", () => {
    const chineseChooser = read(chineseChooserPath);
    const englishChooser = read(englishChooserPath);

    expect(chineseChooser).toMatch(/### React Native \/ Expo/);
    expect(chineseChooser).toContain("/guides/react-native-expo/");
    expect(chineseChooser).toMatch(/\| React Native \/ Expo\s+\| `@zhuangtai-js\/react`/);
    expect(englishChooser).toMatch(/### React Native \/ Expo/);
    expect(englishChooser).toContain("/en/guides/react-native-expo/");
    expect(englishChooser).toMatch(/\| React Native \/ Expo\s+\| `@zhuangtai-js\/react`/);

    const frameworkSection = sidebar.find(({ label }) => label === "框架");
    const expoItem = frameworkSection?.items?.find(
      ({ slug }) => slug === "guides/react-native-expo",
    );
    expect(expoItem).toEqual({
      slug: "guides/react-native-expo",
      label: "React Native / Expo 快速指南",
      translations: { en: "React Native / Expo Quick Start" },
    });
  });

  it("compiles the full persisted PreferencesScreen shape without suppressions", () => {
    const guardFixture = read(compileFixturePath);
    expect(existsSync(screenFixturePath)).toBe(true);
    const screenFixture = read(screenFixturePath);

    for (const pattern of [
      /satisfies PersistStorage/,
      /useEffect/,
      /useState/,
      /View/,
      /Text/,
      /Pressable/,
      /Loading saved preferences/,
      /Persistence error/,
      /flushBeforeLeaving/,
      /reloadFromStorage/,
      /clearStoredPreferences/,
      /persist\.ready\(/,
      /persist\.flush\(/,
      /persist\.rehydrate\(/,
      /persist\.clear\(/,
    ]) {
      expect(screenFixture).toMatch(pattern);
    }

    expect(guardFixture).toMatch(/MissingRemoveItemMustBeRejected/);
    expect(guardFixture).toMatch(/WrongGetItemMustBeRejected/);
    expect(`${guardFixture}\n${screenFixture}`).not.toMatch(
      /\bany\b|as\s+any|@ts-(?:ignore|expect-error)/,
    );
  });

  it("does not add AsyncStorage to a publishable package manifest or source", () => {
    const packagesRoot = join(repoRoot, "packages");
    const violations = [];

    for (const packageName of readdirSync(packagesRoot)) {
      const packageRoot = join(packagesRoot, packageName);
      if (!statSync(packageRoot).isDirectory()) continue;

      const manifestPath = join(packageRoot, "package.json");
      try {
        const manifest = JSON.parse(read(manifestPath));
        if (manifest.private === true || !manifest.name?.startsWith("@zhuangtai-js/")) {
          continue;
        }
      } catch {
        continue;
      }

      const candidates = [manifestPath, join(packageRoot, "src")];
      for (const candidate of candidates) {
        if (!statSync(candidate, { throwIfNoEntry: false })) continue;
        const files = statSync(candidate).isDirectory()
          ? packageSourceFiles(candidate)
          : [candidate];
        for (const file of files) {
          if (read(file).includes("@react-native-async-storage/async-storage")) {
            violations.push(file);
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
