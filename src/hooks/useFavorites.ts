import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";

import { useTelegramSession } from "@/hooks/useTelegramSession";
import { useWebUser } from "@/hooks/useWebUser";
import { userFavorites, userToggleFavorite } from "@/lib/listings.functions";

const KEY = "elonlar-favs";

function readIds() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function useFavorites() {
  const { initData, user, ready } = useTelegramSession();
  const web = useWebUser();
  const signed = Boolean(user || web.user);
  const ownerKey = user?.id ?? web.user?.id ?? 0;
  const fetchFavs = useServerFn(userFavorites);
  const toggleRemote = useServerFn(userToggleFavorite);
  const qc = useQueryClient();
  const [local, setLocal] = useState<string[]>([]);

  useEffect(() => {
    setLocal(readIds());
  }, []);

  const query = useQuery({
    queryKey: ["favorites", ownerKey],
    enabled: ready && web.ready && signed,
    queryFn: () => fetchFavs({ data: { initData, localIds: readIds() } }),
  });

  useEffect(() => {
    if (!signed || !query.data) return;
    localStorage.removeItem(KEY);
    setLocal([]);
  }, [signed, query.data]);

  const mutation = useMutation({
    mutationFn: (id: string) => toggleRemote({ data: { initData, id } }),
    onSuccess: (result) => {
      qc.setQueryData(["favorites", ownerKey], result);
    },
  });

  const toggleLocal = (id: string) => {
    setLocal((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [id, ...prev];
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  };

  return {
    ids: signed ? (query.data?.ids ?? []) : local,
    toggle: (id: string) => {
      if (signed) mutation.mutate(id);
      else toggleLocal(id);
    },
  };
}
