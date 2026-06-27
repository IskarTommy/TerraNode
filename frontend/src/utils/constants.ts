// src/utils/constants.ts

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";
export const SUI_PACKAGE_ID = import.meta.env.VITE_SUI_PACKAGE_ID || "";
export const SUI_NETWORK = import.meta.env.VITE_SUI_NETWORK || "testnet";

export enum Role {
  FARMER = "FARMER",
  LOGISTICS = "LOGISTICS",
  ADMIN = "ADMIN",
}
