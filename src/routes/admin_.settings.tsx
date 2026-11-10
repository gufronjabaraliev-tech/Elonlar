import { createFileRoute, Outlet } from "@tanstack/react-router";

import { AdminGate } from "@/components/AdminGate";

export const Route = createFileRoute("/admin_/settings")({
  component: SettingsLayout,
});

function SettingsLayout() {
  return (
    <AdminGate>
      <Outlet />
    </AdminGate>
  );
}
