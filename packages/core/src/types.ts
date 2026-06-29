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

export type AtomCreatorPluginContext<Value, Options extends object> = {
  readonly initialValue: Value;
  readonly options: Options | undefined;
  readonly next: (initialValue: Value) => Atom<Value>;
};

export type AtomCreatorPlugin<Name extends string, Options extends object> = {
  readonly id: Name;
  readonly create: <Value>(context: AtomCreatorPluginContext<Value, Options>) => Atom<Value>;
};

export type AtomCreatorOptions<OptionsByPlugin extends Record<string, object>> = {
  readonly [Name in keyof OptionsByPlugin]?: OptionsByPlugin[Name];
};

export type AtomCreatorArgs<OptionsByPlugin extends Record<string, object>> =
  keyof OptionsByPlugin extends never ? [] : [options?: AtomCreatorOptions<OptionsByPlugin>];

export type AtomCreator<OptionsByPlugin extends Record<string, object> = Record<never, never>> = {
  <Value>(initialValue: Value, ...args: AtomCreatorArgs<OptionsByPlugin>): Atom<Value>;
  readonly use: <Name extends string, Options extends object>(
    plugin: AtomCreatorPlugin<Name, Options>,
  ) => AtomCreator<OptionsByPlugin & { readonly [Key in Name]: Options }>;
};

export type Computed<Value> = ReadableAtom<Value>;

export type AtomValue<Source> = Source extends ReadableAtom<infer Value> ? Value : never;

export type AtomValues<Sources extends readonly ReadableAtom<unknown>[]> = {
  readonly [Index in keyof Sources]: AtomValue<Sources[Index]>;
};
