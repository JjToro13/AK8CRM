import DashboardView from "../components/DashboardView";
import type { DashboardProps } from "../types/dashboard.types";

export default function DashboardPage(props: DashboardProps) {
  return <DashboardView {...props} />;
}
