import { createServerFn } from "@tanstack/react-start";

export const webAdminSession = createServerFn({ method: "POST" }).handler(async () => {
  const { readWebAdminSession } = await import("./admin-session.server");
  return { ok: readWebAdminSession() };
});

export const webAdminLogin = createServerFn({ method: "POST" })
  .inputValidator((input: { username: string; password: string }) => input)
  .handler(async () => {
    throw new Error("Admin panel ijara egasining Telegram ID si bilan, Mini App ichida ochiladi.");
  });

export const webAdminLogout = createServerFn({ method: "POST" }).handler(async () => {
  const { clearWebAdminSession } = await import("./admin-session.server");
  clearWebAdminSession();
  return { ok: true };
});
