import { createFileRoute, Outlet } from "@tanstack/react-router";

import { AdminGate } from "@/components/AdminGate";

export const Route = createFileRoute("/admin_/chat")({
  component: ChatLayout,
});

function ChatLayout() {
  return (
    <AdminGate>
      <Outlet />
    </AdminGate>
  );
}
