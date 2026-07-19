declare namespace JSX {
  interface Element {
    readonly __reactNativeElement: unique symbol;
  }

  interface ElementChildrenAttribute {
    children: unknown;
  }
}

declare module "react" {
  type StateAction<Value> = Value | ((current: Value) => Value);

  export function useEffect(
    effect: () => void | (() => void),
    dependencies: readonly unknown[],
  ): void;
  export function useState<Value>(
    initialValue: Value,
  ): readonly [Value, (nextValue: StateAction<Value>) => void];
}

declare module "react-native" {
  type NativeNode = JSX.Element | string | number | null | undefined;
  type NativeChildren = NativeNode | readonly NativeNode[];

  type NativeViewProps = {
    readonly children?: NativeChildren;
  };

  type NativePressableProps = NativeViewProps & {
    readonly disabled?: boolean;
    readonly onPress: () => void | Promise<void>;
  };

  export function Pressable(props: NativePressableProps): JSX.Element;
  export function Text(props: NativeViewProps): JSX.Element;
  export function View(props: NativeViewProps): JSX.Element;
}
