import axios from 'axios';

export enum PrayerRequestStatus {
  PENDING = 'PENDING',
  IN_PRAYER = 'IN_PRAYER',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

export interface PrayerRequest {
  id: string;
  name: string;
  phoneNumber: string;
  subject: string;
  description: string;
  canContact: boolean;
  status: PrayerRequestStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePrayerRequestDto {
  phoneNumber: string;
  subject: string;
  name: string;
  description: string;
  canContact: boolean;
}

export interface UpdatePrayerRequestDto {
  phoneNumber?: string;
  subject?: string;
  name?: string;
  description?: string;
  canContact?: boolean;
  status?: PrayerRequestStatus;
}

export interface PrayerRequestsResponse {
  items: PrayerRequest[];
  total: number;
  hasMore: boolean;
}

export interface PrayerStatistics {
  total: number;
  byStatus: {
    pending: number;
    inPrayer: number;
    completed: number;
    archived: number;
  };
}

const api = axios.create({
  baseURL: process.env.API_URL || 'https://api-bosque.jbmidia.com'
});

export const prayerService = {
  // Get prayer requests with filters
  getPrayerRequests: async (params?: {
    skip?: number;
    take?: number;
    status?: PrayerRequestStatus;
    search?: string;
  }): Promise<PrayerRequestsResponse> => {
    const response = await api.get('/prayer-requests', { params });
    return response.data;
  },

  // Get statistics
  getStatistics: async (): Promise<PrayerStatistics> => {
    const response = await api.get('/prayer-requests/statistics');
    return response.data;
  },

  // Create new prayer request
  createPrayerRequest: async (data: CreatePrayerRequestDto): Promise<PrayerRequest> => {
    const response = await api.post('/prayer-requests', data);
    return response.data;
  },

  // Update prayer request
  updatePrayerRequest: async (id: string, data: UpdatePrayerRequestDto): Promise<PrayerRequest> => {
    const response = await api.put(`/prayer-requests/${id}`, data);
    return response.data;
  },

  // Update prayer request status
  updateStatus: async (id: string, status: PrayerRequestStatus): Promise<PrayerRequest> => {
    const response = await api.put(`/prayer-requests/${id}/status`, { status });
    return response.data;
  },

  // Delete prayer request
  deletePrayerRequest: async (id: string): Promise<void> => {
    await api.delete(`/prayer-requests/${id}`);
  }
};