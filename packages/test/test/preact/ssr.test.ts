// @vitest-environment node
import type { ReadableAtom } from "@zhuangtai-js/core";
import { useAtomValue } from "@zhuangtai-js/preact";
import { createElement } from "preact";
import { renderToString } from "preact-render-to-string";
import { describe, expect, it } from "vitest";

describe("Preact adapter SSR surface", () => {
  it("renders from getSnapshot without subscribing", () => {
    let subscriptions = 0;
    const source: ReadableAtom<string> = {
      get: () => "server value",
      watch() {
        subscriptions += 1;

        return () => {
          subscriptions -= 1;
        };
      },
    };

    function ServerReader() {
      return createElement("span", null, useAtomValue(source));
    }

    expect(renderToString(createElement(ServerReader, null))).toBe("<span>server value</span>");
    expect(subscriptions).toBe(0);
  });
});
