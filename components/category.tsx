// app/admin/categories/page.tsx
"use client";
import React, { useState, useEffect } from "react";
import { Plus, Trash2, Edit, Video } from "lucide-react";
import { videoCategoryService, VideoCategory } from "@/services/category";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/global";
import { Button } from "@/components/ui/global";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<VideoCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingCategory, setEditingCategory] = useState<VideoCategory | null>(
    null
  );
  const { toast } = useToast();

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const response = await videoCategoryService.getAllCategories();
      setCategories(response.data);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar as categorias.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleDeleteCategory = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta categoria?")) {
      try {
        await videoCategoryService.deleteCategory(id);
        toast({
          title: "Sucesso",
          description: "Categoria excluída com sucesso!",
        });
        fetchCategories();
      } catch (error) {
        toast({
          title: "Erro",
          description: "Não foi possível excluir a categoria.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gerenciar Categorias</h1>
        <CategoryModal mode="create" onSuccess={fetchCategories} />
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome da Categoria</TableHead>
                <TableHead className="text-center">Qtd. Vídeos</TableHead>
                <TableHead>Data de Criação</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>{category.name}</TableCell>
                  <TableCell className="text-center">
                    {category.Video0?.length || 0}
                  </TableCell>
                  <TableCell>
                    {new Date(category.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingCategory(category)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCategory(category.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {categories.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center py-8 text-gray-500"
                  >
                    Nenhuma categoria encontrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {editingCategory && (
        <CategoryModal
          mode="edit"
          initialData={editingCategory}
          onSuccess={() => {
            fetchCategories();
            setEditingCategory(null);
          }}
        />
      )}
    </div>
  );
}

interface CategoryModalProps {
  mode: "create" | "edit";
  onSuccess: () => void;
  initialData?: VideoCategory;
}

export function CategoryModal({
  mode,
  onSuccess,
  initialData,
}: CategoryModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(initialData?.name ?? "");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();



  
  useEffect(() => {
    if (initialData) {
      setIsOpen(true);
      setName(initialData.name);
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({
        title: "Erro",
        description: "O nome da categoria é obrigatório",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      if (mode === "create") {
        await videoCategoryService.createCategory({ name });
        toast({
          title: "Sucesso",
          description: "Categoria criada com sucesso!",
        });
      } else if (mode === "edit" && initialData) {
        await videoCategoryService.updateCategory(initialData.id, { name });
        toast({
          title: "Sucesso",
          description: "Categoria atualizada com sucesso!",
        });
      }
      setIsOpen(false);
      setName("");
      onSuccess();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar a categoria.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          setName("");
        }
      }}
    >
      {mode === "create" && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Categoria
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Nova Categoria" : "Editar Categoria"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              placeholder="Nome da categoria"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isLoading}>
              {isLoading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              )}
              {mode === "create" ? "Criar" : "Atualizar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
