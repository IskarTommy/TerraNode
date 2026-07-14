import { createContext, useContext, useState, type ReactNode, useCallback } from "react";
import { login, register as registerApi, logout as logoutApi } from "../api/auth";
import type { User } from "../api/auth";

// ─── storage keys ─────────────────────────────────────────
const STORAGE_KEYS = {
  ACCESS: "terranode_access",
  REFRESH: "terranode_refresh",
  USER: "terranode_user",
} as const;

const safeJSON = <T,>(value: string | null): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: {
    email: string;
    password: string;
    full_name: string;
    role: User["role"];
  }) => Promise<void>;
  logout: () => Promise<void>;
  setAccessToken: (token: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() =>
    safeJSON<User>(localStorage.getItem(STORAGE_KEYS.USER))
  );
  const [accessToken, setAccessTokenState] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEYS.ACCESS)
  );
  const [refreshTokenValue, setRefreshToken] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEYS.REFRESH)
  );

  const setAccessToken = useCallback((token: string) => {
    localStorage.setItem(STORAGE_KEYS.ACCESS, token);
    setAccessTokenState(token);
  }, []);

  const loginUser = async (email: string, password: string) => {
    const response = await login({ email, password });
    setAccessToken(response.access);
    localStorage.setItem(STORAGE_KEYS.REFRESH, response.refresh);
    setRefreshToken(response.refresh);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.user));
    setUser(response.user);
    return response.user;
  };

  const registerUser: AuthContextType["register"] = async (data) => {
    await registerApi(data);
    await loginUser(data.email, data.password);
  };

  const logoutUser = async () => {
    if (refreshTokenValue) {
      await logoutApi(refreshTokenValue);
    }
    localStorage.removeItem(STORAGE_KEYS.ACCESS);
    localStorage.removeItem(STORAGE_KEYS.REFRESH);
    localStorage.removeItem(STORAGE_KEYS.USER);
    setAccessTokenState(null);
    setRefreshToken(null);
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    accessToken,
    refreshToken: refreshTokenValue,
    isAuthenticated: !!accessToken && !!user,
    isInitialized: true,
    login: loginUser,
    register: registerUser,
    logout: logoutUser,
    setAccessToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
   </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
