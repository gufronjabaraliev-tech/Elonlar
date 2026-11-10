import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { webUserSession } from "@/lib/listings.functions";

export function useWebUser() {
  const fetchSession = useServerFn(webUserSession);
  const query = useQuery({
    queryKey: ["web-user"],
    staleTime: 60 * 1000,
    queryFn: () => fetchSession(),
  });

  return {
    ready: !query.isPending,
    user: query.data?.user ?? null,
  };
}
