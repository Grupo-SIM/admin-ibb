
import axios from "axios";

const api = axios.create({
  baseURL: process.env.API_URL || "https://api-bosque.jbmidia.com",
});

export const imageService = {
  uploadImage: async (formData: FormData) => {
    const response = await api.post(`/images/upload/`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },
};
