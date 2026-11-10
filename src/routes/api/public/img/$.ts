import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/img/$")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const path = (params as Record<string, string>)["_splat"] ?? "";
        if (!path || path.includes("..")) return new Response("Not found", { status: 404 });

        const { getImage } = await import("@/lib/local-images.server");
        const local = getImage(path);
        if (local) {
          return new Response(new Uint8Array(local.bytes), {
            headers: {
              "content-type": local.type,
              "cache-control": "private, max-age=3600",
            },
          });
        }

        if (!process.env["SUPABASE_URL"] || !process.env["SUPABASE_SERVICE_ROLE_KEY"]) {
          return new Response("Not found", { status: 404 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        if (path.startsWith("receipt/")) {
          const { data, error } = await supabaseAdmin.storage.from("listing-images").download(path);
          if (error || !data) return new Response("Not found", { status: 404 });
          return new Response(await data.arrayBuffer(), {
            headers: {
              "content-type": data.type || "image/jpeg",
              "cache-control": "private, max-age=3600",
            },
          });
        }
        const { data: listing } = await supabaseAdmin
          .from("listings")
          .select("id, status")
          .contains("images", [path])
          .limit(1)
          .maybeSingle();
        if (!listing) return new Response("Not found", { status: 404 });
        if (listing.status !== "approved") {
          const token = new URL(request.url).searchParams.get("t");
          const { verifyListingAccess } = await import("@/lib/image-access.server");
          if (!verifyListingAccess(token, listing.id)) {
            return new Response("Not found", { status: 404 });
          }
        }

        const { data, error } = await supabaseAdmin.storage.from("listing-images").download(path);
        if (error || !data) return new Response("Not found", { status: 404 });

        return new Response(await data.arrayBuffer(), {
          headers: {
            "content-type": data.type || "image/jpeg",
            "cache-control": "public, max-age=31536000, immutable",
          },
        });
      },
    },
  },
});
