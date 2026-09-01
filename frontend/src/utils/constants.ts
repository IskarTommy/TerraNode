// src/utils/constants.ts

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";
export const SUI_PACKAGE_ID = import.meta.env.VITE_SUI_PACKAGE_ID || "";
export const SUI_NETWORK = import.meta.env.VITE_SUI_NETWORK || "testnet";

const INCOMPATIBLE_SUI_PACKAGE_IDS = new Set([
  "0x12d791039ab75e08f41140ccb9be4ce80b917f3eb2b52dab150831bc29afb92f",
]);

export const isUsableSuiPackageId = (value: string | undefined): value is string =>
  Boolean(
    value
    && /^0x[0-9a-f]{64}$/i.test(value)
    && !INCOMPATIBLE_SUI_PACKAGE_IDS.has(value.toLowerCase()),
  );

export const Role = {
  FARMER: "FARMER",
  LOGISTICS: "LOGISTICS",
  ADMIN: "ADMIN",
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const isValidRole = (role: string): role is Role =>
  Object.values(Role).includes(role as Role);
