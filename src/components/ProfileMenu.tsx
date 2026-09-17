import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { LayoutDashboard, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getRoleHome, UserAvatar } from "@/components/UserAvatar";

type ProfileMenuProps = {
  user?: { name?: string | null; avatar?: string | null; role?: string | null } | null;
  className?: string;
};

export function ProfileMenu({ user, className = "" }: ProfileMenuProps) {
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeOnPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnPointerDown);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnPointerDown);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <div ref={menuRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Open profile menu"
        aria-expanded={open}
        className="rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      >
        <UserAvatar user={user} size="md" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-3 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <div className="border-b border-slate-100 px-3 py-2.5 dark:border-slate-800">
            <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{user?.name || "MarketVerse User"}</p>
          </div>
          <Link
            to={getRoleHome(user?.role)}
            onClick={() => setOpen(false)}
            role="menuitem"
            className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
          <button
            type="button"
            onClick={logout}
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}