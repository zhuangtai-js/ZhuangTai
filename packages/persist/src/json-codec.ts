import type { PersistCodec } from "./types.js";

const PACKAGE_NAME = "@zhuangtai-js/persist";

export const jsonCodec: PersistCodec = {
  encode(value) {
    return encodeDefaultJson(value, PACKAGE_NAME);
  },
  decode(rawValue) {
    return JSON.parse(rawValue);
  },
};

function encodeDefaultJson(value: unknown, packageName: string): string {
  assertDefaultJsonEncodable(value, packageName);

  const encodedValue = JSON.stringify(value);

  if (typeof encodedValue !== "string") {
    throw new TypeError(
      `[${packageName}] The default JSON codec can only encode JSON-serializable values.`,
    );
  }

  return encodedValue;
}

function assertDefaultJsonEncodable(
  value: unknown,
  packageName: string,
  seen: Set<object> = new Set(),
): void {
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new TypeError(
      `[${packageName}] The default JSON codec cannot encode non-finite numbers (NaN or ±Infinity). Use a custom codec if you need those values.`,
    );
  }

  if (value === null || typeof value !== "object") {
    return;
  }

  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) {
      throw new TypeError(
        `[${packageName}] The default JSON codec cannot encode invalid Date values. Use a custom codec if you need those values.`,
      );
    }

    return;
  }

  if (seen.has(value)) {
    return;
  }

  seen.add(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      assertDefaultJsonEncodable(item, packageName, seen);
    }

    return;
  }

  for (const key of Reflect.ownKeys(value)) {
    if (typeof key === "symbol") {
      continue;
    }

    assertDefaultJsonEncodable(Reflect.get(value, key), packageName, seen);
  }
}
