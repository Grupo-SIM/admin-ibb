"use client";
import React from "react";
import { Menu, LogOut } from "lucide-react";
import { clearCookie } from "@/hooks/set-cookie";
import { toast } from "react-toastify";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface HeaderProps {
  toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const handleLogout = async () => {
    try {
      await clearCookie();
      toast.success("Logout realizado com sucesso!");
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch {
      toast.error("Erro ao realizar logout");
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-16 z-30
      bg-white/60 dark:bg-black/60 backdrop-blur-xl
      border-b border-black/[0.06] dark:border-white/[0.06]">
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        <button
          onClick={toggleSidebar}
          className="lg:hidden h-8 w-8 flex items-center justify-center rounded-lg
            text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white
            hover:bg-black/[0.06] dark:hover:bg-white/[0.06] transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex-1" />

        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="h-8 w-8 flex items-center justify-center rounded-lg
              text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white
              hover:bg-black/[0.06] dark:hover:bg-white/[0.06] transition-colors"
            aria-label="Sair"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
