---
title: ZhuàngTài State
description: ZhuàngTài is a tiny TypeScript state library with direct synchronous semantics.
template: splash
hero:
  tagline: Lightweight, synchronous, and predictable state primitives.
  actions:
    - text: Getting Started
      link: /en/getting-started/
      icon: right-arrow
      variant: primary
    - text: Core Reference
      link: /en/reference/core/
      icon: document
---

ZhuàngTài provides a framework-agnostic state core and a persistence plugin for small state use cases that need explicit synchronous behavior.

## Features

- `@zhuangtai-js/core`: zero-runtime-dependency `atom` and `computed` primitives.
- `@zhuangtai-js/persist`: persistence plugin for synchronous Web Storage-style storage.
- No hidden scheduling: `set()` applies immediately and `watch()` runs synchronously.
