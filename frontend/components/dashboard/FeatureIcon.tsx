import { MessageSquare, Video, Clapperboard } from "lucide-react";
import { cn } from "@/lib/utils";

type Feature = "chat" | "video" | "studio";

const config: Record<Feature, { icon: React.ElementType; bg: string; color: string }> = {
  chat: { icon: MessageSquare, bg: "bg-blue-50", color: "text-blue-600" },
  video: { icon: Video, bg: "bg-violet-50", color: "text-violet-600" },
  studio: { icon: Clapperboard, bg: "bg-amber-50", color: "text-amber-600" },
};

export function FeatureIcon({ feature, size = "md" }: { feature: string; size?: "sm" | "md" }) {
  const f = (feature as Feature) in config ? (feature as Feature) : "chat";
  const { icon: Icon, bg, color } = config[f];
  const dim = size === "sm" ? "h-7 w-7" : "h-8 w-8";
  const iconDim = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <span className={cn("inline-flex items-center justify-center rounded-lg flex-shrink-0", dim, bg)}>
      <Icon className={cn(iconDim, color)} />
    </span>
  );
}
