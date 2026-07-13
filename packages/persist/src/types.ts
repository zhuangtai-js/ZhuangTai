export type PersistStorage = {
  readonly getItem: (key: string) => string | null;
  readonly setItem: (key: string, value: string) => void;
  readonly removeItem: (key: string) => void;
};

export type PersistCodec = {
  readonly encode: (value: unknown) => string;
  readonly decode: <Value>(rawValue: string, initialValue: Value) => Value;
};

export type PersistMigration = (value: unknown) => unknown;

export function definePersistMigration<Value>(
  migration: (value: unknown) => Value,
): (value: unknown) => Value {
  return migration;
}

export type PersistOptions = {
  readonly key: string;
  readonly storage?: PersistStorage;
  readonly codec?: PersistCodec;
  readonly version?: number;
  readonly migrations?: Readonly<Record<number, PersistMigration>>;
};
