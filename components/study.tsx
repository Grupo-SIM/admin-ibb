import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/global';
import { Button } from '@/components/ui/global';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/global';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, BookOpen, Pencil, Trash2, FolderPlus, Image } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { imageService } from '@/services/image';

interface Category {
  id: string;
  name: string;
  description?: string;
  thumbnail: string;
}

interface Study {
  id: string;
  title: string;
  content: string;
  categoryId: string;
  postDate: string;
}

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Category>) => void;
  initialData?: Category;
  mode: 'create' | 'edit';
}

interface StudyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Study>) => void;
  categories: Category[];
  initialData?: Study;
  mode: 'create' | 'edit';
}

const CategoryModal = ({ isOpen, onClose, onSubmit, initialData, mode }: CategoryModalProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDescription(initialData.description || '');
      setPreviewUrl(initialData.thumbnail);
    } else {
      setName('');
      setDescription('');
      setSelectedFile(null);
      setPreviewUrl('');
    }
  }, [initialData, isOpen]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    // Create a preview URL for the selected image
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Clean up the object URL when component unmounts or when a new file is selected
    return () => URL.revokeObjectURL(objectUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!previewUrl && !selectedFile) {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione uma imagem para a categoria.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let thumbnailUrl = previewUrl;

      // Only upload if there's a new file selected
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        
        const result = await imageService.uploadImage(formData);
        thumbnailUrl = "https://api-bosque.jbmidia.com" + result.url;
      }

      // Submit the form data including the thumbnail URL
      await onSubmit({ 
        ...(initialData && { id: initialData.id }),
        name,
        description,
        thumbnail: thumbnailUrl
      });

      // Reset form
      if (!initialData) {
        setName('');
        setDescription('');
        setSelectedFile(null);
        setPreviewUrl('');
      }
      
      onClose();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar categoria.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Nova Categoria' : 'Editar Categoria'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-y"
            />
          </div>
          <div>
            <Label htmlFor="thumbnail">Thumbnail (proporção 16:9)</Label>
            <div className="mt-2 space-y-4">
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Category thumbnail"
                  className="w-40 h-40 object-cover rounded-lg"
                />
              )}
              <div>
                <Input
                  id="thumbnail"
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('thumbnail')?.click()}
                >
                  <Image className="w-4 h-4 mr-2" />
                  Selecionar Imagem
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Salvando...
                </div>
              ) : mode === 'create' ? (
                'Criar'
              ) : (
                'Salvar'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const StudyModal = ({ isOpen, onClose, onSubmit, categories, initialData, mode }: StudyModalProps) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState('');

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setContent(initialData.content);
      setCategoryId(initialData.categoryId);
    } else {
      setTitle('');
      setContent('');
      setCategoryId(categories[0]?.id || '');
    }
  }, [initialData, isOpen, categories]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ 
      ...(initialData && { id: initialData.id }),
      title,
      content,
      categoryId
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Novo Estudo Bíblico' : 'Editar Estudo Bíblico'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="category">Categoria</Label>
            <select
              id="category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              required
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="content">Conteúdo</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              className="min-h-[200px] resize-y"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">
              {mode === 'create' ? 'Criar' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const CategorizedStudiesPage = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [studies, setStudies] = useState<Study[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [categoryModal, setCategoryModal] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    category?: Category;
  }>({
    isOpen: false,
    mode: 'create'
  });
  const [studyModal, setStudyModal] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    study?: Study;
  }>({
    isOpen: false,
    mode: 'create'
  });
  
  const { toast } = useToast();
  const API_URL = process.env.API_URL ?? 'https://api-bosque.jbmidia.com';

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/categorized-studies/categories`);
      const data = await response.json();
      setCategories(data);
      if (data.length > 0 && !selectedCategory) {
        setSelectedCategory(data[0].id);
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as categorias.',
        variant: 'destructive',
      });
    }
  };

  const fetchStudies = async (categoryId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/categorized-studies/categories/${categoryId}/studies`);
      const data = await response.json();
      setStudies(data);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os estudos.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      fetchStudies(selectedCategory);
    }
  }, [selectedCategory]);

  // Category CRUD operations
  const handleCreateCategory = async (categoryData: Partial<Category>) => {
    try {
      const response = await fetch(`${API_URL}/categorized-studies/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData),
      });

      if (!response.ok) throw new Error('Failed to create category');

      toast({ title: 'Sucesso', description: 'Categoria criada com sucesso!' });
      fetchCategories();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível criar a categoria.',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateCategory = async (categoryData: Partial<Category>) => {
    try {
      const response = await fetch(`${API_URL}/categorized-studies/categories/${categoryData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData),
      });

      if (!response.ok) throw new Error('Failed to update category');

      toast({ title: 'Sucesso', description: 'Categoria atualizada com sucesso!' });
      fetchCategories();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a categoria.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta categoria?')) {
      try {
        const response = await fetch(`${API_URL}/categorized-studies/categories/${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) throw new Error('Failed to delete category');

        toast({ title: 'Sucesso', description: 'Categoria excluída com sucesso!' });
        fetchCategories();
        if (selectedCategory === id) {
          setSelectedCategory(null);
        }
      } catch (error) {
        toast({
          title: 'Erro',
          description: 'Não foi possível excluir a categoria.',
          variant: 'destructive',
        });
      }
    }
  };

  // Study CRUD operations
  const handleCreateStudy = async (studyData: Partial<Study>) => {
    try {
      const response = await fetch(`${API_URL}/categorized-studies/studies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studyData),
      });

      if (!response.ok) throw new Error('Failed to create study');

      toast({ title: 'Sucesso', description: 'Estudo criado com sucesso!' });
      if (selectedCategory) {
        fetchStudies(selectedCategory);
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o estudo.',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateStudy = async (studyData: Partial<Study>) => {
    try {
      const response = await fetch(`${API_URL}/categorized-studies/studies/${studyData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studyData),
      });

      if (!response.ok) throw new Error('Failed to update study');

      toast({ title: 'Sucesso', description: 'Estudo atualizado com sucesso!' });
      if (selectedCategory) {
        fetchStudies(selectedCategory);
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o estudo.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteStudy = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este estudo?')) {
      try {
        const response = await fetch(`${API_URL}/categorized-studies/studies/${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) throw new Error('Failed to delete study');

        toast({ title: 'Sucesso', description: 'Estudo excluído com sucesso!' });
        if (selectedCategory) {
          fetchStudies(selectedCategory);
        }
      } catch (error) {
        toast({
          title: 'Erro',
          description: 'Não foi possível excluir o estudo.',
          variant: 'destructive',
        });
      }}
    };
  
    const handleCategorySubmit = (data: Partial<Category>) => {
      if (categoryModal.mode === 'create') {
        handleCreateCategory(data);
      } else {
        handleUpdateCategory(data);
      }
    };
  
    const handleStudySubmit = (data: Partial<Study>) => {
      if (studyModal.mode === 'create') {
        handleCreateStudy(data);
      } else {
        handleUpdateStudy(data);
      }
    };
  
    return (
      <div className="p-6">
        {/* Modals */}
        <CategoryModal
          isOpen={categoryModal.isOpen}
          onClose={() => setCategoryModal({ isOpen: false, mode: 'create' })}
          onSubmit={handleCategorySubmit}
          initialData={categoryModal.category}
          mode={categoryModal.mode}
        />
        <StudyModal
          isOpen={studyModal.isOpen}
          onClose={() => setStudyModal({ isOpen: false, mode: 'create' })}
          onSubmit={handleStudySubmit}
          categories={categories}
          initialData={studyModal.study}
          mode={studyModal.mode}
        />
  
        {/* Categories Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Categorias</h2>
            <Button
              onClick={() => setCategoryModal({ isOpen: true, mode: 'create' })}
            >
              <FolderPlus className="w-4 h-4 mr-2" />
              Nova Categoria
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {categories.map((category) => (
              <Card
                key={category.id}
                className={`cursor-pointer transition-all ${
                  selectedCategory === category.id
                    ? 'ring-2 ring-primary'
                    : 'hover:shadow-lg'
                }`}
                onClick={() => setSelectedCategory(category.id)}
              >
                <CardContent className="p-4">
                  <div className="relative">
                    <img
                      src={category.thumbnail}
                      alt={category.name}
                      className="w-full h-40 object-cover rounded-lg mb-3"
                    />
                    <div className="absolute top-2 right-2 flex space-x-2">
                      <Button
                        variant="secondary"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCategoryModal({
                            isOpen: true,
                            mode: 'edit',
                            category,
                          });
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCategory(category.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <h3 className="font-semibold text-lg mb-1">{category.name}</h3>
                  {category.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {category.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
  
        {/* Studies Section */}
        {selectedCategory && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">
                Estudos -{' '}
                {categories.find((c) => c.id === selectedCategory)?.name}
              </h2>
              <Button
                onClick={() => setStudyModal({ isOpen: true, mode: 'create' })}
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Estudo
              </Button>
            </div>
  
            {isLoading ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {studies.map((study) => (
                  <Card key={study.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold mb-2">
                            {study.title}
                          </h3>
                          <p className="text-sm text-gray-600 mb-4">
                            {new Date(study.postDate).toLocaleDateString()}
                          </p>
                          <p className="text-gray-700 line-clamp-3 whitespace-pre-wrap">
                            {study.content}
                          </p>
                        </div>
                        <div className="flex flex-col space-y-2 ml-4">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setStudyModal({
                                isOpen: true,
                                mode: 'edit',
                                study,
                              })
                            }
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteStudy(study.id)}
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
        )}
      </div>
    );
  };
  
  export default CategorizedStudiesPage;