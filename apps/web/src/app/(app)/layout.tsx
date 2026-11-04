import { AppShell } from "../../components/shell/AppShell";

/** Every signed-in screen lives inside one persistent shell. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
