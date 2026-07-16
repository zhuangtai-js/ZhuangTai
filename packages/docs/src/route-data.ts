import { defineRouteMiddleware, type StarlightRouteData } from "@astrojs/starlight/route-data";
import { enhancePageHead } from "./seo/page-head";

export const onRequest = defineRouteMiddleware((context) => {
  const route: StarlightRouteData = context.locals.starlightRoute;
  enhancePageHead({
    head: route.head,
    lang: route.lang,
    sidebar: route.sidebar,
  });
});
