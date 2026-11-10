import { readTenantKey, tenantBrand, writeTenantBrand, writeTenantKey } from "./tenant-scope.server";

export type PlatformSettings = {
  campaignName: string;
  managerName: string;
  coverage: "country" | "region";
  region: string;
  userPosting: boolean;
  payCard: string;
  payClick: string;
  payPayme: string;
};

const DEFAULTS: PlatformSettings = {
  campaignName: "E'lonlar",
  managerName: "",
  coverage: "country",
  region: "",
  userPosting: true,
  payCard: "8600 4912 3456 7890",
  payClick: "+998 90 700 11 22",
  payPayme: "+998 90 700 11 22",
};

function current(): PlatformSettings {
  const stored = readTenantKey<PlatformSettings>("platform");
  if (stored && typeof stored.campaignName === "string") return stored;
  const brand = tenantBrand();
  const next = { ...DEFAULTS, campaignName: brand || DEFAULTS.campaignName };
  writeTenantKey("platform", next);
  return next;
}

export function readPlatform(): PlatformSettings {
  return { ...current() };
}

export function writePlatform(next: PlatformSettings): PlatformSettings {
  const campaignName = next.campaignName.trim().slice(0, 40);
  const managerName = next.managerName.trim().slice(0, 40);
  if (campaignName.length < 2) throw new Error("Ilova nomini yozing");
  const coverage = next.coverage === "region" ? "region" : "country";
  const region = next.region.trim().slice(0, 60);
  if (coverage === "region" && region.length < 2) throw new Error("Hudud nomini yozing");
  const saved: PlatformSettings = {
    campaignName,
    managerName,
    coverage,
    region: coverage === "region" ? region : "",
    userPosting: Boolean(next.userPosting),
    payCard: next.payCard.trim().slice(0, 40),
    payClick: next.payClick.trim().slice(0, 40),
    payPayme: next.payPayme.trim().slice(0, 40),
  };
  writeTenantKey("platform", saved);
  writeTenantBrand(saved.campaignName);
  return { ...saved };
}

export function parsePlatform(raw: string): PlatformSettings {
  const base = current();
  try {
    const value = JSON.parse(raw) as Partial<PlatformSettings>;
    return writePlatform({
      campaignName: typeof value.campaignName === "string" ? value.campaignName : base.campaignName,
      managerName: typeof value.managerName === "string" ? value.managerName : "",
      coverage: value.coverage === "region" ? "region" : "country",
      region: typeof value.region === "string" ? value.region : "",
      userPosting: value.userPosting !== false,
      payCard: typeof value.payCard === "string" ? value.payCard : base.payCard,
      payClick: typeof value.payClick === "string" ? value.payClick : base.payClick,
      payPayme: typeof value.payPayme === "string" ? value.payPayme : base.payPayme,
    });
  } catch {
    return readPlatform();
  }
}
