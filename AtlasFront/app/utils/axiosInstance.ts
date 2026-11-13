import { getCookie } from "@/lib/auth";
import axios from "axios";


// Backend API URL, configured in .env.local (see .env.example)
const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json"
  },
});

// Add a request interceptor
api.interceptors.request.use(
  (config) => {
    // Get token from cookie
    const token = getCookie("token");
    
    // If token exists, add it to the Authorization header
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;