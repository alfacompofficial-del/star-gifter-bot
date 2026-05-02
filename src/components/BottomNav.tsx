import { Gift, Sparkles, Settings, ScrollText } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

export function BottomNav({ isAdmin }: { isAdmin: boolean }) {
  const { pathname } = useLocation();
  const items = [
    { to: "/", icon: Gift, label: "Catalog" },
    { to: "/inbox", icon: Sparkles, label: "Inbox" },
    { to: "/history", icon: ScrollText, label: "History" },
    ...(isAdmin ? [{ to: "/admin", icon: Settings, label: "Admin" }] : []),
  ];
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/90 backdrop-blur-xl">
      <ul className="mx-auto flex max-w-xl items-stretch justify-around px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {items.map(({ to, icon: Icon, label }) => {
          const active = pathname === to;
          return (
            <li key={to} className="flex-1">
              <Link
                to={to}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl py-2 text-xs transition",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_8px_hsl(var(--primary))]")} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
