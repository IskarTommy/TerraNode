import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { useCurrentAccount, useCurrentClient, useDAppKit } from '@mysten/dapp-kit-react';
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

  const client = useCurrentClient();
  const dAppKit = useDAppKit();
  const currentAccount = useCurrentAccount();

  const refreshBalance = useCallback(async () => {
    if (!currentAccount?.address) return;
    try {
      const { balance } = await client.getBalance({ owner: currentAccount.address });
      setWallet((prev) => ({
        ...prev,
        balance: (Number(balance.balance) / 1_000_000_000).toFixed(4),
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
    void dAppKit.disconnectWallet().catch((error) => {
      console.error('Failed to disconnect wallet:', error);
    });
  }, [dAppKit]);

  const executeTransaction = useCallback(
    async (tx: Transaction) => {
      const result = await dAppKit.signAndExecuteTransaction({ transaction: tx });
      if (result.$kind !== 'Transaction') {
        throw new Error(
          result.FailedTransaction.status.error?.message
          || 'Sui rejected the transaction.',
        );
      }
      await refreshBalance();
      return { digest: result.Transaction.digest };
    },
    [dAppKit, refreshBalance]
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
