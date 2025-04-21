"use client";
import React, { useState } from "react";
import { Video, FileText, X } from "lucide-react";
import { useRouter } from "next/navigation";

const AdminLayout = ({ children }: any) => {
  const [currentSection, setCurrentSection] = useState("prayers");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { push } = useRouter();
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Overlay for mobile when sidebar is open */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen bg-white shadow-lg z-50 transform transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 w-64`}
      >
        <div className="flex items-center justify-between h-16 border-b px-4">
          <h1 className="text-xl font-bold text-blue-600">Painel Admin</h1>
          <button
            className="lg:hidden text-gray-500 hover:text-gray-700"
            onClick={toggleSidebar}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="p-4">
          <ul className="space-y-2">
            <li>
              <button
                onClick={() => {
                  setIsSidebarOpen(false);
                  push("/");
                }}
                className={`flex items-center w-full p-3 rounded-lg ${
                  currentSection === "prayers"
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <FileText className="w-5 h-5 mr-3" />
                <span>Pedidos de Oração</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => {
                  setIsSidebarOpen(false);
                  push("/videos");
                }}
                className={`flex items-center w-full p-3 rounded-lg ${
                  currentSection === "videos"
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Video className="w-5 h-5 mr-3" />
                <span>Vídeos</span>
              </button>
            </li>
          </ul>
        </nav>
      </aside>

      {children}
    </div>
  );
};

export default AdminLayout;
