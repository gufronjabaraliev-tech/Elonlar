import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { webAdminSession } from "@/lib/admin.functions";

export function useWebAdmin() {
  const fetchSession = useServerFn(webAdminSession);
  const query = useQuery({
    queryKey: ["web-admin"],
    staleTime: 60 * 1000,
    queryFn: () => fetchSession(),
  });

  return {
    ready: !query.isPending,
    isWebAdmin: query.data?.ok === true,
  };
}
