import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

const tenantMiddleware = createMiddleware().server(async ({ next }) => {
  const { runInTenant } = await import("./lib/tenant-scope.server");
  return runInTenant(() => next());
});

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware, tenantMiddleware, csrfMiddleware],
}));
