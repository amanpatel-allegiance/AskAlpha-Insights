import { BarChart3, Users, Video, Clapperboard, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DateRange } from "@/types";
import { SidebarChat } from "./SidebarChat";

function AskAlphaLogo() {
  return (
    <svg width="24" height="24" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="28" height="28" rx="7" fill="#2563eb" />
      <path d="M8 20L14 8L20 20" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 16.5H18" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

interface NavItem {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  soon?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { icon: BarChart3, label: "Usage", active: true },
  { icon: Users,     label: "Agents",  soon: true },
  { icon: Video,     label: "Videos",  soon: true },
  { icon: Clapperboard, label: "Studio", soon: true },
];

interface Props {
  range: DateRange;
}

export function Sidebar({ range }: Props) {
  return (
    <aside className="w-[220px] flex-shrink-0 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0 z-10">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-14 border-b border-gray-100 flex-shrink-0">
        <AskAlphaLogo />
        <div>
          <div className="text-sm font-semibold text-gray-900 leading-none">AskAlpha</div>
          <div className="text-[10px] text-gray-400 mt-0.5">Allegiance Real Estate</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-shrink-0 px-2 py-3 space-y-0.5">
        <div className="px-2 pb-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Analytics</span>
        </div>
        {NAV_ITEMS.map((item) => (
          <NavRow key={item.label} item={item} />
        ))}

        <div className="px-2 pt-3 pb-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">System</span>
        </div>
        <NavRow item={{ icon: Settings, label: "Settings", soon: true }} />
      </nav>

      {/* Chat fills remaining space */}
      <SidebarChat range={range} />
    </aside>
  );
}

function NavRow({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <button
      disabled={item.soon}
      className={cn(
        "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors text-left",
        item.active
          ? "bg-blue-50 text-blue-700"
          : item.soon
          ? "text-gray-300 cursor-default"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      )}
    >
      <Icon className={cn("h-4 w-4 flex-shrink-0", item.active ? "text-blue-600" : item.soon ? "text-gray-300" : "text-gray-400")} />
      <span className="flex-1">{item.label}</span>
      {item.soon && (
        <span className="text-[9px] font-semibold uppercase tracking-wide text-gray-300 bg-gray-100 rounded px-1 py-px">
          Soon
        </span>
      )}
    </button>
  );
}
