"use client";
import React, { useEffect, useState } from "react";
import {
  X,
  FileText,
  Video,
  Book,
  CircleDollarSign,
  CalendarCheck,
  Gamepad,
  User2,
  Home,
  ChevronLeft,
  ChevronRight,
  Menu,
} from "lucide-react";
import Header from "./header";
import { useRouter, usePathname } from "next/navigation";
import { getCookie } from "@/hooks/set-cookie";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const pathname = usePathname();
  const { push } = useRouter();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [roles, setRoles] = useState("");

  useEffect(() => {
    getCookie("roles").then((r) => setRoles(r?.value ?? ""));
  }, []);

  const menuItems = [
    {
      id: "/admin",
      label: "Página Inicial",
      icon: Home,
      roles: "admin::pray::video::study::schedule::donate::quiz",
    },
    {
      id: "/admin/pray",
      label: "Pedidos de Oração",
      icon: FileText,
      roles: "pray::admin",
    },
    {
      id: "/admin/categories",
      label: "Categorias",
      icon: Video,
      roles: "post::admin",
    },
    {
      id: "/admin/videos",
      label: "Posts",
      icon: Video,
      roles: "post::admin",
    },
    {
      id: "/admin/study",
      label: "Estudos",
      icon: Book,
      roles: "study::admin",
    },
    {
      id: "/admin/donate",
      label: "Ofertas",
      icon: CircleDollarSign,
      roles: "donate::admin",
    },
    {
      id: "/admin/quiz",
      label: "Quiz",
      icon: Gamepad,
      roles: "quiz::admin",
    },
    {
      id: "/admin/users",
      label: "Usuários",
      icon: User2,
      roles: "admin",
    },
  ];

  const filtered = menuItems.filter((item) =>
    roles.split(":").some((role) => item.roles.includes(role))
  );

  const sidebarWidth = collapsed ? "w-16" : "w-64";
  const mainMargin = collapsed ? "lg:ml-16" : "lg:ml-64";

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen z-50 ${sidebarWidth} transform transition-all duration-300 ease-in-out
          bg-white/70 dark:bg-black/70 backdrop-blur-2xl
          border-r border-black/[0.07] dark:border-white/[0.07]
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0`}
      >
        {/* Brand row */}
        <div className="flex items-center h-16 px-3 border-b border-black/[0.07] dark:border-white/[0.07]">
          {!collapsed && (
            <span className="flex-1 text-sm font-semibold text-black dark:text-white tracking-tight truncate pl-1">
              Igreja do Bosque
            </span>
          )}
          {collapsed && <div className="flex-1" />}

          {/* Desktop collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex h-7 w-7 items-center justify-center rounded-lg
              text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white
              hover:bg-black/[0.06] dark:hover:bg-white/[0.06] transition-colors shrink-0"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>

          {/* Mobile close */}
          <button
            className="lg:hidden flex h-7 w-7 items-center justify-center rounded-lg
              text-black/40 dark:text-white/40 transition-colors"
            onClick={() => setIsMobileOpen(false)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="p-2">
          <ul className="space-y-0.5">
            {filtered.map((item) => {
              const isActive = pathname === item.id;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      push(item.id);
                      setIsMobileOpen(false);
                    }}
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center w-full rounded-lg text-sm font-medium transition-all duration-150
                      ${collapsed ? "px-0 justify-center h-10" : "px-3 py-2.5"}
                      ${isActive
                        ? "bg-black text-white dark:bg-white dark:text-black shadow-sm"
                        : "text-black/60 dark:text-white/60 hover:bg-black/[0.06] dark:hover:bg-white/[0.06] hover:text-black dark:hover:text-white"
                      }`}
                  >
                    <item.icon className={`w-4 h-4 shrink-0 ${!collapsed ? "mr-3" : ""}`} />
                    {!collapsed && <span>{item.label}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* Main content */}
      <div className={`${mainMargin} flex flex-col min-h-screen transition-all duration-300`}>
        <Header toggleSidebar={() => setIsMobileOpen(!isMobileOpen)} />
        <main className="flex-1 p-4 lg:p-6 mt-16">{children}</main>
      </div>
    </div>
  );
};
