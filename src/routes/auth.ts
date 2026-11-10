import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/auth")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get("demo") === "admin") {
          const { demoAdminCookie } = await import("@/lib/operator.server");
          const demoCookie = demoAdminCookie();
          if (!demoCookie) return new Response("Namuna admin yo'q", { status: 404 });
          return new Response(null, {
            status: 302,
            headers: { location: "/admin", "set-cookie": demoCookie },
          });
        }
        const token = url.searchParams.get("sa_op") || "";
        const { operatorEnterCookie } = await import("@/lib/operator.server");
        const cookie = await operatorEnterCookie(token);
        if (!cookie) return new Response("Kirish tokeni yaroqsiz", { status: 401 });
        return new Response(null, {
          status: 302,
          headers: {
            location: "/admin",
            "set-cookie": cookie,
          },
        });
      },
    },
  },
});