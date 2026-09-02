import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createNetworkConfig, SuiClientProvider, WalletProvider as SuiWalletProvider } from "@mysten/dapp-kit";
import "@mysten/dapp-kit/dist/index.css";
import "./styles/index.css";
import App from "./App";

const queryClient = new QueryClient();

const { networkConfig } = createNetworkConfig({
  testnet: { url: "https://testnet.sui.rpcpool.com", network: "testnet" as any },
  mainnet: { url: "https://mainnet.sui.rpcpool.com", network: "mainnet" as any },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
        <SuiWalletProvider autoConnect={true}>
          <App />
        </SuiWalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  </StrictMode>
);
