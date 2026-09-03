import { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from 'react';
import { login, register as registerApi, logout as logoutApi, walletLogin as walletLoginApi, updateProfile } from '../api/auth';
import type { User } from '../api/auth';

// ─── storage keys ─────────────────────────────────────────
const STORAGE_KEYS = {
  ACCESS: 'terranode_access',
  REFRESH: 'terranode_refresh',
  USER: 'terranode_user',
} as const;

const ROLE_STORAGE_KEY = 'terranode_user_role';

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
  walletLogin: (challenge_id: string, signature: string) => Promise<User>;
  register: (data: {
    email: string;
    password: string;
    full_name: string;
    role: User['role'];
    sui_public_key?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  setAccessToken: (token: string) => void;
  setRole: (role: User['role']) => void;
  updateUserWallet: (walletAddress: string) => Promise<void>;
  switchDemoRole: (role: 'FARMER' | 'LOGISTICS' | 'ADMIN') => Promise<boolean>;
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
    if (response.user.role === 'FARMER') {
      localStorage.setItem('terranode_farmer_email', response.user.email);
    }
    setUser(response.user);
    return response.user;
  };

  const walletLoginUser = async (challenge_id: string, signature: string) => {
    const response = await walletLoginApi({ challenge_id, signature });
    setAccessToken(response.access);
    localStorage.setItem(STORAGE_KEYS.REFRESH, response.refresh);
    setRefreshToken(response.refresh);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.user));
    setUser(response.user);
    return response.user;
  };

  const registerUser: AuthContextType['register'] = async (data) => {
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
    localStorage.removeItem(ROLE_STORAGE_KEY);
    setAccessTokenState(null);
    setRefreshToken(null);
    setUser(null);
  };

  const setRole = useCallback((role: User['role']) => {
    localStorage.setItem(ROLE_STORAGE_KEY, role);
    if (user) {
      const updatedUser = { ...user, role };
      setUser(updatedUser);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
      document.documentElement.setAttribute('data-role', role);
    }
  }, [user]);

  const updateUserWallet = useCallback(async (walletAddress: string) => {
    if (!walletAddress) return;
    try {
      await updateProfile({ sui_public_key: walletAddress });
      setUser((prev) => {
        if (!prev) return prev;
        const next = { ...prev, sui_public_key: walletAddress };
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(next));
        return next;
      });
    } catch (e) {
      console.warn('Failed to persist wallet address to profile:', e);
      setUser((prev) => {
        if (!prev) return prev;
        const next = { ...prev, sui_public_key: walletAddress };
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(next));
        return next;
      });
    }
  }, []);

  const switchDemoRole = useCallback(async (role: 'FARMER' | 'LOGISTICS' | 'ADMIN') => {
    const farmerEmail = localStorage.getItem('terranode_farmer_email') || 'iskartommy117@gmail.com';
    const creds: Record<string, { email: string; pass: string; fallbackEmail?: string }> = {
      FARMER: { email: farmerEmail, pass: 'TerraNode2026!', fallbackEmail: 'farmer@terranode.agri' },
      LOGISTICS: { email: 'logistics@terranode.agri', pass: 'TerraNode2026!' },
      ADMIN: { email: 'admin@terranode.agri', pass: 'TerraNode2026!' },
    };
    const target = creds[role];
    if (target) {
      try {
        await loginUser(target.email, target.pass);
        document.documentElement.setAttribute('data-role', role);
        return true;
      } catch (e) {
        if (target.fallbackEmail) {
          try {
            await loginUser(target.fallbackEmail, target.pass);
            document.documentElement.setAttribute('data-role', role);
            return true;
          } catch (e2) {
            console.error('Failed to switch demo role via fallback login:', e2);
          }
        }
        console.error('Failed to switch demo role via login:', e);
        setRole(role);
        return false;
      }
    }
    return false;
  }, [setRole]);

  // Set initial role on document
  useEffect(() => {
    if (user) {
      const savedRole = localStorage.getItem(ROLE_STORAGE_KEY) as User['role'] | null;
      if (savedRole) {
        document.documentElement.setAttribute('data-role', savedRole);
      } else {
        document.documentElement.setAttribute('data-role', user.role);
      }
    }
  }, [user]);

  const value: AuthContextType = {
    user,
    accessToken,
    refreshToken: refreshTokenValue,
    isAuthenticated: !!accessToken && !!user,
    isInitialized: true,
    login: loginUser,
    walletLogin: walletLoginUser,
    register: registerUser,
    logout: logoutUser,
    setAccessToken,
    setRole,
    updateUserWallet,
    switchDemoRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
