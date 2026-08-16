import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { DotGridBackground } from "./DotGridBackground";

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { path: "/admin/orders", label: "주문현황", icon: "grid_view" },
  { path: "/admin/menu", label: "메뉴관리", icon: "restaurant_menu" },
  { path: "/admin/tables", label: "테이블관리", icon: "table_bar" },
  { path: "/admin/settings", label: "설정", icon: "settings" },
];

export function AdminShell({ title, children }: { title: string; children: ReactNode }) {
  const { role, venueSlug, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background font-body-md text-on-surface">
      <aside className="fixed left-0 top-0 h-full w-64 bg-surface-container-lowest z-50 flex flex-col shadow-[0_1px_8px_rgba(0,0,0,0.02)]">
        <div className="h-16 flex items-center px-6">
          <span className="material-symbols-outlined text-primary mr-2">local_cafe</span>
          <span className="font-headline-md text-headline-md tracking-tight">카페 매니지먼트</span>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-4 py-2.5 rounded-xl transition-all group ${
                  active
                    ? "bg-primary-container text-on-primary-container font-semibold"
                    : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                }`}
              >
                <span className="material-symbols-outlined mr-3 text-[20px]">{item.icon}</span>
                <span className="text-body-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
          {role === "super_admin" && (
            <Link
              to="/admin/venues"
              className={`flex items-center px-4 py-2.5 rounded-xl transition-all group ${
                location.pathname === "/admin/venues"
                  ? "bg-primary-container text-on-primary-container font-semibold"
                  : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined mr-3 text-[20px]">storefront</span>
              <span className="text-body-sm font-medium">전체 업장</span>
            </Link>
          )}
        </nav>
        <div className="px-6 py-6 border-t border-surface-variant/30">
          <div className="flex items-center gap-3 p-2 bg-surface-container-low rounded-xl">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-body-sm font-semibold truncate">{venueSlug ?? "플랫폼 관리자"}</p>
              <p className="text-label-caps opacity-60 truncate">
                {role === "super_admin" ? "SUPER ADMIN" : "VENUE OWNER"}
              </p>
            </div>
            <button
              onClick={logout}
              title="로그아웃"
              className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-error rounded-full transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="pl-64">
        <header className="fixed top-0 left-64 right-0 h-16 bg-surface-bright/90 backdrop-blur-md z-40 flex items-center justify-between px-margin-page shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
          <span className="text-headline-md font-headline-md text-on-surface">{title}</span>
        </header>

        <main className="pt-16 min-h-screen bg-background relative">
          <DotGridBackground />
          <div className="relative z-10 p-margin-page">{children}</div>
        </main>
      </div>
    </div>
  );
}
