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
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Quiz {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  bibleReference: string;
}

interface PaginationMeta {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
}

interface QuizResponse {
  data: Quiz[];
  meta: PaginationMeta;
}

interface QuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Quiz, "id">) => void;
  initialData?: Quiz;
  mode: "create" | "edit";
}

interface QuizModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: Omit<Quiz, 'id'>) => void;
    initialData?: Quiz;
    mode: 'create' | 'edit';
  }
  
  import { Check, Circle } from "lucide-react";

  interface QuizModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: Omit<Quiz, 'id'>) => void;
    initialData?: Quiz;
    mode: 'create' | 'edit';
  }
  
  const QuizModal = ({ isOpen, onClose, onSubmit, initialData, mode }: QuizModalProps) => {
    const [question, setQuestion] = useState('');
    const [options, setOptions] = useState<string[]>(['', '', '', '']);
    const [correctAnswer, setCorrectAnswer] = useState('');
    const [bibleReference, setBibleReference] = useState('');
    const [errors, setErrors] = useState<{
      question?: string;
      options?: string;
      correctAnswer?: string;
      bibleReference?: string;
    }>({});
  
    useEffect(() => {
      if (initialData) {
        setQuestion(initialData.question);
        setOptions(initialData.options);
        setCorrectAnswer(initialData.correctAnswer);
        setBibleReference(initialData.bibleReference);
      } else {
        setQuestion('');
        setOptions(['', '', '', '']);
        setCorrectAnswer('');
        setBibleReference('');
      }
      setErrors({});
    }, [initialData, isOpen]);
  
    const validateForm = () => {
      const newErrors: typeof errors = {};
  
      if (!question.trim()) {
        newErrors.question = 'A pergunta é obrigatória';
      }
  
      const filledOptions = options.filter(opt => opt.trim() !== '');
      if (filledOptions.length < 2) {
        newErrors.options = 'Pelo menos duas opções são necessárias';
      }
  
      if (!correctAnswer) {
        newErrors.correctAnswer = 'Selecione a resposta correta';
      }
  
      if (!bibleReference.trim()) {
        newErrors.bibleReference = 'A referência bíblica é obrigatória';
      }
  
      // Check for duplicate options
      const uniqueOptions = new Set(options.filter(opt => opt.trim() !== ''));
      if (uniqueOptions.size !== filledOptions.length) {
        newErrors.options = 'As opções não podem ser repetidas';
      }
  
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };
  
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
  
      if (!validateForm()) {
        return;
      }
  
      const filteredOptions = options.filter(option => option.trim() !== '');
      onSubmit({
        question,
        options: filteredOptions,
        correctAnswer,
        bibleReference
      });
      onClose();
    };
  
    const updateOption = (index: number, value: string) => {
      const newOptions = [...options];
      newOptions[index] = value;
      setOptions(newOptions);
      
      // If this option was the correct answer, update it
      if (options[index] === correctAnswer) {
        setCorrectAnswer(value);
      }
    };
  
    const selectCorrectAnswer = (option: string) => {
      if (option.trim()) {
        setCorrectAnswer(option);
        setErrors(prev => ({ ...prev, correctAnswer: undefined }));
      }
    };
  
    const removeEmptyOptions = () => {
      const filteredOptions = options.filter(opt => opt.trim() !== '');
      if (filteredOptions.length < 4) {
        setOptions([...filteredOptions, ...Array(4 - filteredOptions.length).fill('')]);
      }
    };
  
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {mode === 'create' ? 'Nova Questão' : 'Editar Questão'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="question" className="text-base font-semibold">
                Pergunta
              </Label>
              <Input
                id="question"
                value={question}
                onChange={(e) => {
                  setQuestion(e.target.value);
                  setErrors(prev => ({ ...prev, question: undefined }));
                }}
                placeholder="Digite a pergunta"
                className={`mt-2 ${errors.question ? 'border-red-500' : ''}`}
              />
              {errors.question && (
                <p className="text-sm text-red-500 mt-1">{errors.question}</p>
              )}
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-base font-semibold">Opções</Label>
                {errors.correctAnswer && (
                  <p className="text-sm text-red-500">{errors.correctAnswer}</p>
                )}
              </div>
              {errors.options && (
                <p className="text-sm text-red-500 mb-2">{errors.options}</p>
              )}
              <div className="space-y-3">
                {options.map((option, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={`h-9 w-9 ${option === correctAnswer ? 'text-green-600 hover:text-green-700' : 'text-gray-400 hover:text-gray-500'}`}
                      onClick={() => selectCorrectAnswer(option)}
                      disabled={!option.trim()}
                    >
                      {option === correctAnswer ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <Circle className="h-5 w-5" />
                      )}
                    </Button>
                    <div className="flex-1">
                      <Input
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                        placeholder={`Digite a opção ${index + 1}`}
                        onBlur={removeEmptyOptions}
                        className="w-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
  
            <div>
              <Label htmlFor="bibleReference" className="text-base font-semibold">
                Referência Bíblica
              </Label>
              <Input
                id="bibleReference"
                value={bibleReference}
                onChange={(e) => {
                  setBibleReference(e.target.value);
                  setErrors(prev => ({ ...prev, bibleReference: undefined }));
                }}
                placeholder="Ex: João 3:16"
                className={`mt-2 ${errors.bibleReference ? 'border-red-500' : ''}`}
              />
              {errors.bibleReference && (
                <p className="text-sm text-red-500 mt-1">{errors.bibleReference}</p>
              )}
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
                {mode === 'create' ? 'Criar' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  };

const QuizPage = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: "create" | "edit";
    quiz?: Quiz;
  }>({
    isOpen: false,
    mode: "create",
  });

  const { toast } = useToast();
  const API_URL = process.env.API_URL ?? "https://api-bosque.jbmidia.com";

  const fetchQuizzes = async () => {
    setIsLoading(true);
    try {

      const response = await fetch(
        `${API_URL}/quizzes`
      );
      const data: any = await response.json();
      setQuizzes(data);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar as questões.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };


 

  const handleCreateQuiz = async (data: Omit<Quiz, "id">) => {
    try {
      const response = await fetch(`${API_URL}/quizzes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Failed to create quiz");

      toast({
        title: "Sucesso",
        description: "Questão criada com sucesso!",
      });
      fetchQuizzes();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível criar a questão.",
        variant: "destructive",
      });
    }
  };

  const handleEditQuiz = async (id: string, data: Omit<Quiz, "id">) => {
    try {
      const response = await fetch(`${API_URL}/quizzes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Failed to update quiz");

      toast({
        title: "Sucesso",
        description: "Questão atualizada com sucesso!",
      });
      fetchQuizzes();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a questão.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteQuiz = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir esta questão?")) {
      try {
        const response = await fetch(`${API_URL}/quizzes/${id}`, {
          method: "DELETE",
        });

        if (!response.ok) throw new Error("Failed to delete quiz");

        toast({
          title: "Sucesso",
          description: "Questão excluída com sucesso!",
        });


          fetchQuizzes();
  
      } catch (error) {
        toast({
          title: "Erro",
          description: "Não foi possível excluir a questão.",
          variant: "destructive",
        });
      }
    }
  };

  const handleSubmit = (data: Omit<Quiz, "id">) => {
    if (modalState.mode === "create") {
      handleCreateQuiz(data);
    } else if (modalState.quiz) {
      handleEditQuiz(modalState.quiz.id, data);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Quiz Bíblico</h1>
        <Button onClick={() => setModalState({ isOpen: true, mode: "create" })}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Questão
        </Button>
      </div>

      <QuizModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ isOpen: false, mode: "create" })}
        onSubmit={handleSubmit}
        initialData={modalState.quiz}
        mode={modalState.mode}
      />

      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzes?.map((quiz) => (
              <Card key={quiz.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2">
                        {quiz.question}
                      </h3>
                      <div className="space-y-2">
                        {quiz.options.map((option, index) => (
                          <p key={index} className="text-black/70 dark:text-white/70">
                            {index + 1}. {option}
                          </p>
                        ))}
                      </div>
                      <p className="mt-4 text-sm text-black/50 dark:text-white/50">
                        Referência: {quiz.bibleReference}
                      </p>
                    </div>
                    <div className="flex flex-col space-y-2 ml-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setModalState({
                            isOpen: true,
                            mode: "edit",
                            quiz,
                          })
                        }
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteQuiz(quiz.id)}
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
        </>
      )}
    </div>
  );
};

export default QuizPage;
