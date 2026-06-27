export type StopWatch = () => void;

export type Watcher<Value> = (value: Value, prevValue: Value | undefined) => void;

export type NextValue<Value> = Value | ((prevValue: Value) => Value);

export type ReadableAtom<Value> = {
  readonly get: () => Value;
  readonly watch: (watcher: Watcher<Value>) => StopWatch;
};

export type Atom<Value> = ReadableAtom<Value> & {
  readonly set: (nextValue: NextValue<Value>) => void;
};

export type Computed<Value> = ReadableAtom<Value>;

export type AtomValue<Source> = Source extends ReadableAtom<infer Value> ? Value : never;

export type AtomValues<Sources extends readonly ReadableAtom<unknown>[]> = {
  readonly [Index in keyof Sources]: AtomValue<Sources[Index]>;
};
