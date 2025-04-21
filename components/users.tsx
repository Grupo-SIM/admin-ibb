"use client";
import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/global";
import { Button } from "@/components/ui/global";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/global";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/global";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const getTranslation = (role: string) => {
  switch (role) {
    case "admin":
      return "Administrador";
    case "pray":
      return "Oracão";
    case "post":
      return "Posts";
    case "study":
      return "Estudos";
    case "schedule":
      return "Agenda";
    case "donate":
      return "Contribuiçoes";
    case "quiz":
      return "Quiz";
    default:
      return role;
  }
};
interface User {
  id: string;
  password?: string;
  email: string;
  roles: string[];
}

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<User, "id">) => void;
  initialData?: User;
  mode: "create" | "edit";
}

const AVAILABLE_ROLES = ["admin", "pray", "post", "study", "schedule", "donate", "quiz"];

const UserModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  mode,
}: UserModalProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    roles?: string;
  }>({});

  useEffect(() => {
    if (initialData) {
      setEmail(initialData.email);
      setRoles(initialData.roles);
    } else {
      setEmail("");
      setRoles([]);
    }
    setErrors({});
  }, [initialData, isOpen]);

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!email.trim()) {
      newErrors.email = "O email é obrigatório";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Email inválido";
    }

    if (roles.length === 0) {
      newErrors.roles = "Selecione pelo menos uma função";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    onSubmit({
      email,
      password,
      roles,
    });
    onClose();
  };

  const handleRoleAdd = (role: string) => {
    if (!roles.includes(role)) {
      setRoles([...roles, role]);
      setErrors((prev) => ({ ...prev, roles: undefined }));
    }
  };

  const handleRoleRemove = (roleToRemove: string) => {
    setRoles(roles.filter((role) => role !== roleToRemove));
  };



  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Novo Usuário" : "Editar Usuário"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="email" className="text-base font-semibold">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              disabled={mode === "edit"}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrors((prev) => ({ ...prev, email: undefined }));
              }}
              placeholder="Digite o email"
              className={`mt-2 ${errors.email ? "border-red-500" : ""}`}
            />
            {errors.email && (
              <p className="text-sm text-red-500 mt-1">{errors.email}</p>
            )}
          </div>

          <div>
            <Label htmlFor="passsword" className="text-base font-semibold">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrors((prev) => ({ ...prev, email: undefined }));
              }}
              placeholder="Digite o password"
              className={`mt-2 ${errors.password ? "border-red-500" : ""}`}
            />
            {errors.password && (
              <p className="text-sm text-red-500 mt-1">{errors.password}</p>
            )}
          </div>

          <div>
            <Label className="text-base font-semibold">Funções</Label>
            <div className="mt-2">
              <Select onValueChange={handleRoleAdd}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione uma função" />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {getTranslation(role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.roles && (
                <p className="text-sm text-red-500 mt-1">{errors.roles}</p>
              )}
              <div className="flex flex-wrap gap-2 mt-2">
                {roles.map((role) => (
                  <Badge key={role} variant="secondary" className="p-1">
                    {getTranslation(role)}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 ml-1 hover:bg-transparent"
                      onClick={() => handleRoleRemove(role)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setErrors({});
                onClose();
              }}
            >
              Cancelar
            </Button>
            <Button type="submit">
              {mode === "create" ? "Criar" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const UserPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: "create" | "edit";
    user?: User;
  }>({
    isOpen: false,
    mode: "create",
  });

  const { toast } = useToast();
  const API_URL = process.env.API_URL ?? "https://api-bosque.jbmidia.com";

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/users`);
      const data: User[] = await response.json();
      setUsers(data);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar os usuários.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async (data: Omit<User, "id">) => {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Failed to create user");

      toast({
        title: "Sucesso",
        description: "Usuário criado com sucesso!",
      });
      fetchUsers();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível criar o usuário.",
        variant: "destructive",
      });
    }
  };

  const handleEditUser = async (id: string, data: Omit<User, "id">) => {
    try {
      const response = await fetch(`${API_URL}/auth/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Failed to update user");

      toast({
        title: "Sucesso",
        description: "Usuário atualizado com sucesso!",
      });
      fetchUsers();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o usuário.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este usuário?")) {
      try {
        const response = await fetch(`${API_URL}/auth/users/${id}`, {
          method: "DELETE",
        });

        if (!response.ok) throw new Error("Failed to delete user");

        toast({
          title: "Sucesso",
          description: "Usuário excluído com sucesso!",
        });
        fetchUsers();
      } catch (error) {
        toast({
          title: "Erro",
          description: "Não foi possível excluir o usuário.",
          variant: "destructive",
        });
      }
    }
  };

  const handleSubmit = (data: Omit<User, "id">) => {
    if (modalState.mode === "create") {
      handleCreateUser(data);
    } else if (modalState.user) {
      handleEditUser(modalState.user.id, data);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gerenciamento de Usuários</h1>
        <Button onClick={() => setModalState({ isOpen: true, mode: "create" })}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      <UserModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ isOpen: false, mode: "create" })}
        onSubmit={handleSubmit}
        initialData={modalState.user}
        mode={modalState.mode}
      />

      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users?.map((user) => (
            <Card key={user.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-gray-500 mb-3">{user.email}</p>
                    <div className="flex flex-wrap gap-2">
                      {user.roles.map((role) => (
                        <Badge key={role} variant="secondary">
                          {getTranslation(role)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2 ml-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setModalState({
                          isOpen: true,
                          mode: "edit",
                          user,
                        })
                      }
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteUser(user.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserPage;
