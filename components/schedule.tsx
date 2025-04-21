"use client";
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/global';
import { Button } from '@/components/ui/global';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/global';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Calendar, Trash2, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Schedule {
  id: string;
  date: string;
  list: string[];
}

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { date: string; events: string[] }) => void;
  initialData?: Schedule;
  mode: 'create' | 'edit';
}

const ScheduleModal = ({ isOpen, onClose, onSubmit, initialData, mode }: ScheduleModalProps) => {
  const [date, setDate] = useState('');
  const [events, setEvents] = useState<string[]>(['']);

  useEffect(() => {
    if (initialData) {
      setDate(initialData.date);
      setEvents(initialData.list.length ? initialData.list : ['']);
    } else {
      setDate('');
      setEvents(['']);
    }
  }, [initialData, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const filteredEvents = events.filter(event => event.trim() !== '');
    onSubmit({ date, events: filteredEvents });
    onClose();
  };

  const addEvent = () => {
    setEvents([...events, '']);
  };

  const removeEvent = (index: number) => {
    const newEvents = events.filter((_, i) => i !== index);
    setEvents(newEvents.length ? newEvents : ['']);
  };

  const updateEvent = (index: number, value: string) => {
    const newEvents = [...events];
    newEvents[index] = value;
    setEvents(newEvents);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Novo Evento' : 'Editar Evento'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="date">Data (DD/MM)</Label>
            <Input
              id="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              placeholder="DD/MM"
              required
              pattern="\d{2}/\d{2}"
            />
          </div>
          <div className="space-y-4">
            <Label>Eventos</Label>
            {events.map((event, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={event}
                  onChange={(e) => updateEvent(index, e.target.value)}
                  placeholder="Nome do evento"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeEvent(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addEvent}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Evento
            </Button>
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

const SchedulePage = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    schedule?: Schedule;
  }>({
    isOpen: false,
    mode: 'create'
  });
  
  const { toast } = useToast();
  const API_URL = process.env.API_URL ?? 'https://api-bosque.jbmidia.com';

  const fetchSchedules = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/schedule`);
      const data = await response.json();
      setSchedules(data.data);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os eventos.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const handleCreateSchedule = async (data: { date: string; events: string[] }) => {
    try {
      const response = await fetch(`${API_URL}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to create schedule');

      toast({
        title: 'Sucesso',
        description: 'Evento criado com sucesso!',
      });
      fetchSchedules();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o evento.',
        variant: 'destructive',
      });
    }
  };

  const handleEditSchedule = async (id: string, data: { date: string; events: string[] }) => {
    try {
      const response = await fetch(`${API_URL}/schedule/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to update schedule');

      toast({
        title: 'Sucesso',
        description: 'Evento atualizado com sucesso!',
      });
      fetchSchedules();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o evento.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este evento?')) {
      try {
        const response = await fetch(`${API_URL}/schedule/${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) throw new Error('Failed to delete schedule');

        toast({
          title: 'Sucesso',
          description: 'Evento excluído com sucesso!',
        });
        fetchSchedules();
      } catch (error) {
        toast({
          title: 'Erro',
          description: 'Não foi possível excluir o evento.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleSubmit = (data: { date: string; events: string[] }) => {
    if (modalState.mode === 'create') {
      handleCreateSchedule(data);
    } else if (modalState.schedule) {
      handleEditSchedule(modalState.schedule.id, data);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Agenda</h1>
        <Button onClick={() => setModalState({ isOpen: true, mode: 'create' })}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Evento
        </Button>
      </div>

      <ScheduleModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ isOpen: false, mode: 'create' })}
        onSubmit={handleSubmit}
        initialData={modalState.schedule}
        mode={modalState.mode}
      />

      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {schedules.map((schedule) => (
            <Card key={schedule.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-4">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      <h3 className="text-lg font-semibold">{schedule.date}</h3>
                    </div>
                    <ul className="space-y-2">
                      {schedule.list.map((event, index) => (
                        <li key={index} className="text-gray-700">
                          • {event}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex flex-col space-y-2 ml-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setModalState({
                        isOpen: true,
                        mode: 'edit',
                        schedule
                      })}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteSchedule(schedule.id)}
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

export default SchedulePage;