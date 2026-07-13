import type { PersistCodec, PersistMigration, PersistOptions, PersistStorage } from "./types.js";

const PACKAGE_NAME = "@zhuangtai-js/persist";
const MARKER_KEY = "__zhuangtai_persist__";
const ENVELOPE_KEYS = [MARKER_KEY, "version", "payload"] as const;

type StoredRecord = {
  readonly version: number;
  readonly payload: string;
};

type RestoreVersionedParams<Value> = {
  readonly rawValue: string;
  readonly initialValue: Value;
  readonly key: string;
  readonly version: number;
  readonly migrations: PersistOptions["migrations"];
  readonly storage: PersistStorage;
  readonly codec: PersistCodec;
};

export function assertPersistVersion(version: number, key: string): void {
  if (!Number.isSafeInteger(version) || version <= 0) {
    throw new TypeError(
      `[${PACKAGE_NAME}] Persist version for key "${key}" must be a positive safe integer.`,
    );
  }
}

export function restoreVersioned<Value>({
  rawValue,
  initialValue,
  key,
  version,
  migrations,
  storage,
  codec,
}: RestoreVersionedParams<Value>): Value {
  const record = parseStoredRecord(rawValue, key, version);

  if (record.version > version) {
    throw new Error(
      `[${PACKAGE_NAME}] Stored value for key "${key}" uses future version ${record.version}, but the configured version ${version} is older.`,
    );
  }

  if (record.version === version) {
    return decodeVersioned(codec, record.payload, initialValue, key, version);
  }

  const migrationSteps = collectMigrations(migrations, record.version, version, key);
  let migratedValue = decodeVersioned<unknown>(
    codec,
    record.payload,
    undefined,
    key,
    record.version,
  );

  for (const step of migrationSteps) {
    try {
      migratedValue = step.migration(migratedValue);
    } catch (error) {
      throw new Error(
        `[${PACKAGE_NAME}] Migration for key "${key}" from version ${step.version} to version ${step.version + 1} failed while restoring target version ${version}.`,
        { cause: error },
      );
    }
  }

  const payload = encodePayload(codec, migratedValue, key, version);
  writeVersioned(storage, key, version, payload);

  return decodeVersioned(codec, payload, initialValue, key, version);
}

export function encodeVersioned(
  codec: PersistCodec,
  value: unknown,
  key: string,
  version: number,
): string {
  const payload = encodePayload(codec, value, key, version);

  return JSON.stringify({ [MARKER_KEY]: true, version, payload });
}

export function writeEncodedVersioned(
  storage: PersistStorage,
  key: string,
  version: number,
  encodedValue: string,
): void {
  try {
    storage.setItem(key, encodedValue);
  } catch (error) {
    throw new Error(
      `[${PACKAGE_NAME}] Failed to write the value for key "${key}" at version ${version}.`,
      { cause: error },
    );
  }
}

function encodePayload(codec: PersistCodec, value: unknown, key: string, version: number): string {
  try {
    return codec.encode(value);
  } catch (error) {
    throw new Error(
      `[${PACKAGE_NAME}] Failed to encode the value for key "${key}" at version ${version}.`,
      { cause: error },
    );
  }
}

function decodeVersioned<Value>(
  codec: PersistCodec,
  payload: string,
  initialValue: Value,
  key: string,
  version: number,
): Value {
  try {
    return codec.decode(payload, initialValue);
  } catch (error) {
    throw new Error(
      `[${PACKAGE_NAME}] Failed to decode the stored value for key "${key}" at version ${version}.`,
      { cause: error },
    );
  }
}

function writeVersioned(
  storage: PersistStorage,
  key: string,
  version: number,
  payload: string,
): void {
  writeEncodedVersioned(
    storage,
    key,
    version,
    JSON.stringify({ [MARKER_KEY]: true, version, payload }),
  );
}

function parseStoredRecord(rawValue: string, key: string, targetVersion: number): StoredRecord {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawValue);
  } catch {
    return { version: 0, payload: rawValue };
  }

  if (!isObject(parsed) || !Object.hasOwn(parsed, MARKER_KEY)) {
    return { version: 0, payload: rawValue };
  }

  if (!isExactEnvelope(parsed)) {
    throw new Error(
      `[${PACKAGE_NAME}] Found a malformed marked record for key "${key}" while restoring version ${targetVersion}.`,
    );
  }

  return {
    version: Reflect.get(parsed, "version"),
    payload: Reflect.get(parsed, "payload"),
  };
}

function isExactEnvelope(value: object): boolean {
  const keys = Object.keys(value);

  return (
    keys.length === ENVELOPE_KEYS.length &&
    ENVELOPE_KEYS.every((key) => Object.hasOwn(value, key)) &&
    Reflect.get(value, MARKER_KEY) === true &&
    isPositiveSafeInteger(Reflect.get(value, "version")) &&
    typeof Reflect.get(value, "payload") === "string"
  );
}

function isObject(value: unknown): value is object {
  return typeof value === "object" && value !== null;
}

function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

type MigrationStep = {
  readonly version: number;
  readonly migration: PersistMigration;
};

function collectMigrations(
  migrations: PersistOptions["migrations"],
  sourceVersion: number,
  targetVersion: number,
  key: string,
): readonly MigrationStep[] {
  const steps: MigrationStep[] = [];

  for (let version = sourceVersion; version < targetVersion; version += 1) {
    const migration = migrations?.[version];

    if (migration === undefined) {
      throw new Error(
        `[${PACKAGE_NAME}] Missing migration for key "${key}" from version ${version} to version ${version + 1} while restoring target version ${targetVersion}.`,
      );
    }

    steps.push({ version, migration });
  }

  return steps;
}
