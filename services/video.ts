// services/videoService.ts
import axios from 'axios';

export interface Video {
  id: string;
  title: string;
  videoId: string;
  type: 'MINISTRACAO' | 'TESTEMUNHO' | 'DEVOCIONAL' | 'PARA_FAMILIA';
  createdAt: string;
}

export interface VideoCreate {
  title: string;
  videoId: string;
  type: 'MINISTRACAO' | 'TESTEMUNHO' | 'DEVOCIONAL' | 'PARA_FAMILIA';
}

const api = axios.create({
  baseURL: process.env.API_URL || 'https://api-bosque.jbmidia.com'
});

export const videoService = {
  // Get videos by type
  getMinistracoes: async () => {
    const response = await api.get<{ data: Video[] }>('/video/ministracoes');
    return response.data;
  },

  getTestemunhos: async () => {
    const response = await api.get<{ data: Video[] }>('/video/testemunho');
    return response.data;
  },

  getDevocionais: async () => {
    const response = await api.get<{ data: Video[] }>('/video/devocional');
    return response.data;
  },

  getParaFamilia: async () => {
    const response = await api.get<{ data: Video[] }>('/video/para-familia');
    return response.data;
  },

  // Create new video
  createVideo: async (videoData: VideoCreate) => {
    const response = await api.post<Video>('/video', videoData);
    return response.data;
  },

  // Delete video
  deleteVideo: async (id: string) => {
    const response = await api.delete<Video>(`/video/${id}`);
    return response.data;
  },

  // Delete video by YouTube ID
  deleteByYouTubeId: async (videoId: string) => {
    const response = await api.delete<Video>(`/video/youtube/${videoId}`);
    return response.data;
  },

  // Delete multiple videos
  deleteMultipleVideos: async (ids: string[]) => {
    const response = await api.delete('/video/batch', { data: { ids } });
    return response.data;
  },

  // Delete all videos by type
  deleteAllByType: async (type: Video['type']) => {
    const response = await api.delete(`/video/type/${type}`);
    return response.data;
  }
};