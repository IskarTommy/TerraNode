// src/api/client.ts
import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL } from "../utils/constants";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// ─── Request Interceptor ───────────────────────────
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem("terranode_access");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response Interceptor ──────────────────────────
// Auto-refresh on 401, then retry the original request once.
// Avoids the need for the caller to know about JWT rotation.
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve();
  });
  failedQueue = [];
};

const REFRESH_URL = "/auth/login/refresh/";

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status !== 401 || !originalRequest || originalRequest._retry) {
      // For non-401 errors, or if the failed request is the refresh endpoint itself,
      // just reject and let upstream AuthContext clean up local state.
      if (error.response?.status === 401 && originalRequest?.url?.includes(REFRESH_URL)) {
        localStorage.removeItem("terranode_access");
        localStorage.removeItem("terranode_refresh");
        localStorage.removeItem("terranode_user");
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }
      return Promise.reject(error);
    }

    const refresh = localStorage.getItem("terranode_refresh");
    if (!refresh) {
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Queue concurrent 401s until refresh completes
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then(() => apiClient(originalRequest));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const response = await axios.post(`${API_BASE_URL}${REFRESH_URL}`, {
        refresh,
      });
      const newAccess = response.data.access as string;
      localStorage.setItem("terranode_access", newAccess);
      processQueue(null);
      if (originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
      }
      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError);
      localStorage.removeItem("terranode_access");
      localStorage.removeItem("terranode_refresh");
      localStorage.removeItem("terranode_user");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default apiClient;
