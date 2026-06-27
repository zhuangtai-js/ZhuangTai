# ZhuangTai

ZhuangTai is a tiny TypeScript store library inspired by Nano Stores and Jotai.

The first package is `@zhuangtai/core`: a framework-agnostic store body with no runtime dependencies.

## Packages

- `@zhuangtai/core`: the zero-runtime-dependency store core.
- `@zhuangtai/react`: planned React adapter, not implemented yet.

## Status

The repository infrastructure is in place. Store APIs will be implemented in a later step.

## Development

```sh
pnpm install
pnpm build
pnpm typecheck
pnpm test
pnpm lint
pnpm format:check
pnpm check
```

`@zhuangtai/core` intentionally has no third-party runtime dependencies. Framework adapters live in separate packages.
