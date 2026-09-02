import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { useSuiClient, useSignTransaction, useCurrentAccount } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';

interface WalletState {
  address: string | null;
  balance: string | null;
  connected: boolean;
  connecting: boolean;
  network: string;
}

interface WalletContextValue extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => void;
  signAndExecute: (tx: Transaction) => Promise<{ digest: string }>;
  refreshBalance: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    balance: null,
    connected: false,
    connecting: false,
    network: 'testnet',
  });

  const client = useSuiClient();
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signTransaction } = useSignTransaction();

  const refreshBalance = useCallback(async () => {
    if (!currentAccount?.address) return;
    try {
      const balance = await client.getBalance({ owner: currentAccount.address });
      setWallet((prev) => ({
        ...prev,
        balance: (Number(balance.totalBalance) / 1_000_000_000).toFixed(4),
      }));
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    }
  }, [client, currentAccount]);

  useEffect(() => {
    if (currentAccount?.address) {
      setWallet((prev) => ({
        ...prev,
        address: currentAccount.address,
        connected: true,
        connecting: false,
      }));
      refreshBalance();
    } else {
      setWallet((prev) => ({
        ...prev,
        address: null,
        balance: null,
        connected: false,
        connecting: false,
      }));
    }
  }, [currentAccount, refreshBalance]);

  const connect = useCallback(async () => {
    setWallet((prev) => ({ ...prev, connecting: true }));
    try {
      // Connection is handled by @mysten/dapp-kit's wallets
      // The user clicks connect in the wallet UI
    } catch (error) {
      console.error('Failed to connect:', error);
      setWallet((prev) => ({ ...prev, connecting: false }));
    }
  }, []);

  const disconnect = useCallback(() => {
    setWallet({
      address: null,
      balance: null,
      connected: false,
      connecting: false,
      network: 'testnet',
    });
  }, []);

  const executeTransaction = useCallback(
    async (tx: Transaction) => {
      // Step 1: Sign only (wallet popup) — isolates the wallet from execution
      const { bytes, signature } = await signTransaction({ transaction: tx });

      // Step 2: Execute via RPC (no wallet involvement)
      const result = await client.executeTransactionBlock({
        transactionBlock: bytes,
        signature,
        options: { showEffects: true, showObjectChanges: true },
      });

      await refreshBalance();
      return { digest: result.digest };
    },
    [signTransaction, client, refreshBalance]
  );

  return (
    <WalletContext.Provider
      value={{
        ...wallet,
        connect,
        disconnect,
        signAndExecute: executeTransaction,
        refreshBalance,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
