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
import { getCookie } from "@/hooks/set-cookie";

const tiles = [
  {
    id: "/admin/pray",
    label: "Pedidos de Oração",
    icon: FileText,
    roles: "pray::admin",
    description: "Gerenciar pedidos de oração",
  },
  {
    id: "/admin/videos",
    label: "Posts",
    icon: Video,
    roles: "video::admin",
    description: "Gerenciar conteúdo",
  },
  {
    id: "/admin/study",
    label: "Estudos",
    icon: Book,
    roles: "study::admin",
    description: "Gerenciar materiais de estudo",
  },
  {
    id: "/admin/donate",
    label: "Ofertas",
    icon: CircleDollarSign,
    roles: "donate::admin",
    description: "Gerenciar doações e ofertas",
  },
  {
    id: "/admin/quiz",
    label: "Quiz",
    icon: Gamepad,
    roles: "quiz::admin",
    description: "Gerenciar quizzes",
  },
  {
    id: "/admin/users",
    label: "Usuários",
    icon: User2,
    roles: "admin",
    description: "Gerenciar usuários",
  },
];

const DashboardTiles = () => {
  const [roles, setRoles] = useState("");
  const router = useRouter();

  useEffect(() => {
    getCookie("roles").then((r) => setRoles(r?.value ?? ""));
  }, []);

  const filtered = tiles.filter((tile) =>
    roles.split(":").some((role) => tile.roles.includes(role))
  );

  return (
    <div className="container mx-auto">
      <h1 className="text-xl font-semibold mb-6 text-black/80 dark:text-white/80">
        Igreja do Bosque
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((tile) => (
          <button
            key={tile.id}
            onClick={() => router.push(tile.id)}
            className="group text-left p-6 rounded-xl border
              border-black/[0.08] dark:border-white/[0.08]
              bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl
              hover:border-black/[0.16] dark:hover:border-white/[0.16]
              hover:bg-white/80 dark:hover:bg-white/[0.07]
              transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <div className="flex items-center mb-3">
              <div className="p-2 rounded-lg bg-black/[0.06] dark:bg-white/[0.06] mr-3 transition-colors group-hover:bg-black/[0.10] dark:group-hover:bg-white/[0.10]">
                <tile.icon className="w-5 h-5 text-black dark:text-white" />
              </div>
              <h2 className="text-sm font-semibold text-black dark:text-white">
                {tile.label}
              </h2>
            </div>
            <p className="text-xs text-black/50 dark:text-white/50 leading-relaxed">
              {tile.description}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default DashboardTiles;
