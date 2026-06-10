import { AlertCircle, CheckCircle, Clock, XCircle } from "lucide-react";
import type { Call } from "../../../lib/supabase";

type CallStatusIconProps = {
  status: Call["status"];
};

export default function CallStatusIcon({ status }: CallStatusIconProps) {
  switch (status) {
    case "completed":
      return <CheckCircle className="h-4 w-4 text-emerald-600" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-red-600" />;
    case "no_answer":
      return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    case "in_progress":
      return <Clock className="h-4 w-4 text-brand animate-pulse" />;
    default:
      return <Clock className="h-4 w-4 text-muted" />;
  }
}
