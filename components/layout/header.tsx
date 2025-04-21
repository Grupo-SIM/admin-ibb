"use client";
// Header.tsx
import React from "react";
import { Bell, Search, Menu, User, LogOut } from "lucide-react";
import { clearCookie } from "@/hooks/set-cookie";

interface HeaderProps {
  toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  return (
    <header className="h-16 bg-white shadow-sm">
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        <div className="flex items-center">
          <button
            onClick={toggleSidebar}
            className="lg:hidden"
          >
            <Menu className="w-6 h-6 text-gray-500" />
          </button>

        </div>

        <div className="flex items-center space-x-4">

          <div className="flex items-center">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <LogOut onClick={()=>{
                console.log("LogOut");
                clearCookie().then(()=>{
                  window.location.reload();
                });
              }} style={{cursor:"pointer"}} className="w-5 h-5 text-gray-600" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;