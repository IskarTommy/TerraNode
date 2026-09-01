// src/api/auth.ts
import apiClient from "./client";

// ─── Types ────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  full_name: string;
  role: "FARMER" | "LOGISTICS" | "ADMIN";
  sui_public_key: string | null;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface RegisterPayload {
  email: string;
  password: string;
  full_name: string;
  role: "FARMER" | "LOGISTICS";
}

// ─── API Calls ────────────────────────────────────
export const login = async (data: { email: string; password: string }) => {
  // Custom token obtain returns { access, refresh, user } (see serializers.py)
  const response = await apiClient.post<LoginResponse>("/auth/login/", data);
  return response.data;
};

export interface WalletChallengeResponse {
  challenge_id: string;
  nonce: string;
  message: string;
  expires_at: string;
}

export const requestWalletChallenge = async (wallet_address: string) => {
  const response = await apiClient.post<WalletChallengeResponse>("/auth/wallet-challenge/", {
    wallet_address,
  });
  return response.data;
};

export const walletLogin = async (data: { challenge_id: string; signature: string }) => {
  const response = await apiClient.post<LoginResponse>("/auth/wallet-login/", data);
  return response.data;
};

export const register = async (data: RegisterPayload) => {
  const response = await apiClient.post<User>("/auth/register/", data);
  return response.data;
};

// Logout requires the refresh token in the body and the access token in Authorization header.
// Returns true if the server acknowledged; false if the call failed (we still clear local state either way).
export const logout = async (refreshToken: string): Promise<boolean> => {
  try {
    await apiClient.post("/auth/logout/", { refresh: refreshToken });
    return true;
  } catch {
    return false;
  }
};

export const refreshToken = async (refresh: string) => {
  const response = await apiClient.post<{ access: string }>(
    "/auth/login/refresh/",
    { refresh }
  );
  return response.data.access;
};

export const getProfile = async () => {
  const response = await apiClient.get<User>("/auth/profile/");
  return response.data;
};
