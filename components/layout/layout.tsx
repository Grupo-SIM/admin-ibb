"use client";
import React, { useEffect, useState } from "react";
import {
  Menu,
  X,
  FileText,
  Video,
  Book,
  CircleDollarSign,
  CalendarCheck,
  Gamepad,
  User2,
} from "lucide-react";
import Header from "./header";
import { useRouter } from "next/navigation";
import { getCookie } from "@/hooks/set-cookie";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [currentSection, setCurrentSection] = useState("/admin");
  const { push } = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [roles, setRoles] = useState("");
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };
  useEffect(() => {
    getCookie("roles").then((roles) => {
      console.log(roles);
      setRoles(roles?.value ?? "");
    });
  }, []);
  const menuItems = [
    {
      id: "/admin",
      label: "Pagina Inicial",
      icon: FileText,
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

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Overlay */}
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
          <h1 className="text-xl font-bold text-blue-600">Igreja do Bosque</h1>
          <button
            className="lg:hidden text-gray-500 hover:text-gray-700"
            onClick={toggleSidebar}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="p-4">
          <ul className="space-y-2">
            {menuItems
              .filter((item) =>
                roles.split(":").some((role) => item.roles.includes(role))
              )
              .map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      push(item.id);
                      setCurrentSection(item.id);
                      setIsSidebarOpen(false);
                    }}
                    className={`flex items-center w-full p-3 rounded-lg ${
                      currentSection === item.id
                        ? "bg-blue-50 text-blue-600"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <item.icon className="w-5 h-5 mr-3" />
                    <span>{item.label}</span>
                  </button>
                </li>
              ))}
          </ul>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="lg:ml-64">
        <Header toggleSidebar={toggleSidebar} />
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
};
