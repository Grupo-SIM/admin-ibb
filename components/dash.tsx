import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Video,
  Book,
  CircleDollarSign,
  CalendarCheck,
  Gamepad,
  User2,
} from "lucide-react";
import { Card } from "@/components/ui/global";
import { getCookie } from "@/hooks/set-cookie";

const DashboardTiles = () => {
  const [roles, setRoles] = useState("");
  const router = useRouter();

  useEffect(() => {
    getCookie("roles").then((roles) => {
      setRoles(roles?.value ?? "");
    });
  }, []);

  const tiles = [
    {
      id: "/admin",
      label: "Pedidos de Oração",
      icon: FileText,
      roles: "pray::admin",
      bgColor: "white",
      iconColor: "text-blue-600",
      description: "Gerenciar pedidos de oração",
    },
    {
      id: "/admin/videos",
      label: "Posts",
      icon: Video,
      roles: "video::admin",
      bgColor: "white",
      iconColor: "text-purple-600",
      description: "Gerenciar conteúdo",
    },
    {
      id: "/admin/study",
      label: "Estudos",
      icon: Book,
      roles: "study::admin",
      bgColor: "white",
      iconColor: "text-green-600",
      description: "Gerenciar materiais de estudo",
    },
    {
      id: "/admin/donate",
      label: "Ofertas",
      icon: CircleDollarSign,
      roles: "donate::admin",
      bgColor: "white",
      iconColor: "text-red-600",
      description: "Gerenciar doações e ofertas",
    },
    {
      id: "/admin/quiz",
      label: "Quiz",
      icon: Gamepad,
      roles: "quiz::admin",
      bgColor: "white",
      iconColor: "text-indigo-600",
      description: "Gerenciar quizzes",
    },
    {
      id: "/admin/users",
      label: "Usuários",
      icon: User2,
      roles: "admin",
      bgColor: "white",
      iconColor: "text-gray-600",
      description: "Gerenciar usuários",
    },
  ];

  const filteredTiles = tiles.filter((tile) =>
    roles.split(":").some((role) => tile.roles.includes(role))
  );

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Igreja do Bosque</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTiles.map((tile) => (
          <Card
            key={tile.id}
            className={`${tile.bgColor} cursor-pointer transition-transform duration-200 hover:scale-105`}
            onClick={() => router.push(tile.id)}
          >
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className={`p-2 rounded-lg ${tile.iconColor}`}>
                  <tile.icon className="w-6 h-6" />
                </div>
                <h2 className="ml-3 text-lg font-semibold">{tile.label}</h2>
              </div>
              <p className="text-gray-600">{tile.description}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default DashboardTiles;
