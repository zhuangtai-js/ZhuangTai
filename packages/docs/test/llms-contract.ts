export const generatedNames = ["llms-small.txt", "llms.txt", "llms-full.txt"] as const;

export type GeneratedName = (typeof generatedNames)[number];

type RequiredEvidence = {
  readonly expected: string;
  readonly pattern: RegExp;
};

type ForbiddenEvidence = {
  readonly expected: string;
  readonly pattern: RegExp;
};

export type ContractFailure = {
  readonly source: string;
  readonly expected: string;
  readonly actual: string;
};

const guideSlugs = ["react", "preact", "vue", "svelte", "solid", "react-native-expo"] as const;

const guideEvidence: readonly RequiredEvidence[] = guideSlugs.flatMap((slug) => [
  {
    expected: `generated guide route /guides/${slug}/`,
    pattern: new RegExp(`/guides/${slug}/`),
  },
  {
    expected: `generated guide route /en/guides/${slug}/`,
    pattern: new RegExp(`/en/guides/${slug}/`),
  },
]);

const semanticEvidence: readonly RequiredEvidence[] = [
  {
    expected: "Core is used outside UI lifecycles",
    pattern:
      /(?:UI|界面|组件)[^。.;\n]{0,100}(?:生命周期|lifecycle)[^。.;\n]{0,100}(?:Core|@zhuangtai-js\/core)|(?:Core|@zhuangtai-js\/core)[^。.;\n]{0,100}(?:UI|界面|组件)[^。.;\n]{0,100}(?:生命周期|lifecycle)/i,
  },
  {
    expected: "components choose the matching framework adapter",
    pattern:
      /(?:组件|components?)[^。.;\n]{0,120}(?:对应|matching)[^。.;\n]{0,80}(?:adapter|适配器)/i,
  },
  {
    expected: "Expo uses @zhuangtai-js/react",
    pattern: /Expo[^。.;\n]{0,100}@zhuangtai-js\/react|@zhuangtai-js\/react[^。.;\n]{0,100}Expo/i,
  },
  {
    expected: "Promise-returning storage is structurally compatible",
    pattern:
      /PersistStorage[^。.;\n]{0,200}(?:结构|structur)[^。.;\n]{0,200}(?:PromiseLike|Promise-returning|返回\s*Promise)|PersistStorage[^。.;\n]{0,200}(?:PromiseLike|Promise-returning|返回\s*Promise)[^。.;\n]{0,120}(?:结构|structur)/i,
  },
  {
    expected: "AsyncStorage remains consumer-provided",
    pattern:
      /AsyncStorage[^。.;\n]{0,120}(?:consumer-provided|consumer only|consumer-only|由使用方|由消费者|应用侧)/i,
  },
  {
    expected: "first-render hydration awaits persist.ready",
    pattern:
      /(?:首屏|首次渲染|first render)[^。.;\n]{0,140}(?:hydration|水合|持久化状态)[^。.;\n]{0,100}persist\.ready|persist\.ready[^。.;\n]{0,140}(?:首屏|首次渲染|first render)/i,
  },
  {
    expected: "durable boundaries await persist.flush and handle errors",
    pattern:
      /(?:durable boundary|durable boundaries|持久化边界|耐久边界)[^。.;\n]{0,140}persist\.flush[^。.;\n]{0,120}(?:错误|失败|error|reject)/i,
  },
  {
    expected: "rehydrate, clear, onError, migration, and SSR guidance",
    pattern:
      /persist\.rehydrate[\s\S]{0,500}persist\.clear[\s\S]{0,500}onError[\s\S]{0,800}migration[\s\S]{0,800}SSR/i,
  },
];

const forbiddenEvidence: readonly ForbiddenEvidence[] = [
  {
    expected: "no dedicated AsyncStorage package",
    pattern:
      /@zhuangtai-js\/(?:async-storage|asyncstorage|expo|persist-async-storage|react-native)(?![\p{L}\p{N}_-])/iu,
  },
  {
    expected: "no stale guide route",
    pattern: /\/(?:en\/)?guides\/(?:expo|react-native|frameworks)\//i,
  },
  {
    expected: "persist.ready is not described as optional for hydration-dependent first render",
    pattern:
      /(?:persist\.ready[^。.;\n]{0,100}(?:可选|无需|不用|不必|optional|not required)|(?:可选|无需|不用|不必|optional|not required)[^。.;\n]{0,100}persist\.ready)/i,
  },
  {
    expected: "persist.flush errors are not ignored",
    pattern:
      /(?:忽略|ignore)[^。.;\n]{0,100}(?:persist\.flush|flush)[^。.;\n]{0,80}(?:错误|失败|error)|(?:persist\.flush|flush)[^。.;\n]{0,100}(?:错误|失败|error)[^。.;\n]{0,80}(?:忽略|ignore)/i,
  },
  {
    expected: "no stale four-adapter count",
    pattern: /(?:四个|4\s*个|four)\s+(?:framework\s+)?(?:adapter|adapters|适配器)/i,
  },
];

export function inspectLlmOutput(source: string, output: string): readonly ContractFailure[] {
  const required = [...guideEvidence, ...semanticEvidence].flatMap((evidence) =>
    evidence.pattern.test(output)
      ? []
      : [
          {
            source,
            expected: evidence.expected,
            actual: "missing",
          },
        ],
  );
  const forbidden = forbiddenEvidence.flatMap((evidence) => {
    const match = output.match(evidence.pattern);
    return match === null
      ? []
      : [
          {
            source,
            expected: evidence.expected,
            actual: match[0],
          },
        ];
  });
  return [...required, ...forbidden];
}

export function formatContractFailures(failures: readonly ContractFailure[]): string {
  return failures
    .map(
      ({ source, expected, actual }) =>
        `source: ${source}\nexpected: ${expected}\nactual: ${actual}`,
    )
    .join("\n\n");
}
