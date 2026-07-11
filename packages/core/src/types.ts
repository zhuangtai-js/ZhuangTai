export type StopWatch = () => void;

export type Watcher<Value> = (value: Value, prevValue: Value | undefined) => void;

export type NextValue<Value> = Value | ((prevValue: Value) => Value);

export type RejectFunctionValue<Value> = Value extends (...args: never[]) => unknown
  ? "[@zhuangtai-js/core] atom() does not support function values. Wrap it in an object, e.g. atom({ fn })."
  : Value;

export type ReadableAtom<Value> = {
  readonly get: () => Value;
  readonly watch: (watcher: Watcher<Value>) => StopWatch;
};

export type Atom<Value> = ReadableAtom<Value> & {
  readonly set: (nextValue: NextValue<Value>) => void;
};

export interface AtomKindRegistry<Value> {
  readonly default: Atom<Value>;
}

export type AtomKind = keyof AtomKindRegistry<unknown>;

export type AtomOf<Kind extends AtomKind, Value> = AtomKindRegistry<Value>[Kind];

export type AtomCreatorPluginContext<Value, Options extends object> = {
  readonly initialValue: Value;
  readonly options: Options | undefined;
  readonly next: (initialValue: Value) => Atom<Value>;
};

export type AtomCreatorPlugin<
  Name extends string,
  Options extends object,
  Kind extends AtomKind = "default",
> = {
  readonly id: Name;
  readonly kind?: Kind;
  readonly create: <Value>(
    context: AtomCreatorPluginContext<Value, Options>,
  ) => AtomOf<NoInfer<Kind>, Value>;
};

export type AtomCreatorOptions<OptionsByPlugin extends Record<string, object>> = {
  readonly [Name in keyof OptionsByPlugin]?: OptionsByPlugin[Name];
};

export type AtomCreatorArgs<OptionsByPlugin extends Record<string, object>> =
  keyof OptionsByPlugin extends never ? [] : [options?: AtomCreatorOptions<OptionsByPlugin>];

export type AtomCreator<
  OptionsByPlugin extends Record<string, object> = Record<never, never>,
  Kind extends AtomKind = "default",
> = {
  <Value>(
    initialValue: RejectFunctionValue<Value>,
    ...args: AtomCreatorArgs<OptionsByPlugin>
  ): AtomOf<Kind, Value>;
  readonly use: <
    Name extends string,
    Options extends object,
    PluginKind extends AtomKind = "default",
  >(
    plugin: AtomCreatorPlugin<Name, Options, PluginKind>,
  ) => AtomCreator<OptionsByPlugin & { readonly [Key in Name]: Options }, PluginKind>;
};

export type Computed<Value> = ReadableAtom<Value>;

export type AtomValue<Source> = Source extends ReadableAtom<infer Value> ? Value : never;
