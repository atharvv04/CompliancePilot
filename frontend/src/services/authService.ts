import axios from "axios";
import type { User, LoginRequest, RegisterRequest, AuthToken, ApiResponse } from "@/types";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach bearer
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Refresh on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as any;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem("refresh_token");
        if (refreshToken) {
          const res = await axios.post<ApiResponse<AuthToken>>(
            `${API_BASE_URL}/auth/refresh`,
            { refresh_token: refreshToken }
          );
          
          // Narrow the payload explicitly for TS
          const payload = res.data?.data as AuthToken;
          const { access_token, refresh_token } = payload;
          
          localStorage.setItem("access_token", access_token);
          localStorage.setItem("refresh_token", refresh_token);
          
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return apiClient(originalRequest);
        }
      } catch {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  // Returns ApiResponse<{ user } & AuthToken>
  async login(credentials: LoginRequest): Promise<ApiResponse<{ user: User } & AuthToken>> {
    const res = await apiClient.post<ApiResponse<{ user: User } & AuthToken>>("/auth/login", credentials);
    return res.data;
  },

  async register(data: RegisterRequest): Promise<ApiResponse<{ user: User } & AuthToken>> {
    const res = await apiClient.post<ApiResponse<{ user: User } & AuthToken>>("/auth/register", data);
    return res.data;
  },

  async getProfile(): Promise<User> {
    const res = await apiClient.get<ApiResponse<User>>("/auth/profile");
    return res.data.data as User;
  },

  async refreshToken(refreshToken: string): Promise<ApiResponse<AuthToken>> {
    const res = await apiClient.post<ApiResponse<AuthToken>>("/auth/refresh", { refresh_token: refreshToken });
    return res.data;
  },

  async logout(): Promise<void> {
    await apiClient.post("/auth/logout");
  },
};
