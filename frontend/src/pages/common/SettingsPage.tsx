import { useRef, useState } from 'react';
import { useCurrentAccount, useDAppKit } from '@mysten/dapp-kit-react';
import { ConnectModal } from '@mysten/dapp-kit-react/ui';
import type { DAppKitConnectModal } from '@mysten/dapp-kit-core/web';

import { requestWalletChallenge } from '../../api/auth';
import { Button } from '../../components/Common';
import { useToast } from '../../components/Common/Toast';
import { useAuth } from '../../contexts/AuthContext';

const TESTNET_GRPC = 'https://fullnode.testnet.sui.io:443';
const TESTNET_GRAPHQL = 'https://graphql.testnet.sui.io/graphql';

export function SettingsPage() {
  const { user, walletLogin } = useAuth();
  const { showToast } = useToast();
  const currentAccount = useCurrentAccount();
  const dAppKit = useDAppKit();
  const connectModal = useRef<DAppKitConnectModal>(null);
  const [binding, setBinding] = useState(false);

  const bindWallet = async () => {
    if (!currentAccount) {
      await connectModal.current?.show();
      return;
    }

    setBinding(true);
    try {
      const challenge = await requestWalletChallenge(currentAccount.address);
      const signed = await dAppKit.signPersonalMessage({
        message: new TextEncoder().encode(challenge.message),
      });
      await walletLogin(challenge.challenge_id, signed.signature);
      showToast('Wallet ownership verified and account binding saved.', 'success');
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Wallet binding failed. Please retry with the connected wallet.';
      showToast(message, 'error');
    } finally {
      setBinding(false);
    }
  };

  const connectedAddress = currentAccount?.address ?? null;
  const boundAddress = user?.sui_public_key ?? null;
  const connectedWalletMatches = Boolean(
    connectedAddress && boundAddress
      && connectedAddress.toLowerCase() === boundAddress.toLowerCase(),
  );

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 tracking-tight font-display">
          Account & deployment settings
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Review your account identity and prove ownership of the Sui wallet used for custody records.
        </p>
      </div>

      <section className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
        <h2 className="text-base font-semibold text-slate-200 border-b border-slate-800 pb-2">
          User profile
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ReadOnlyField label="Full name" value={user?.full_name || 'Unavailable'} />
          <ReadOnlyField label="Email address" value={user?.email || 'Unavailable'} />
          <ReadOnlyField label="Assigned role" value={user?.role || 'Unavailable'} accent />
          <ReadOnlyField
            label="Verified Sui address"
            value={boundAddress || 'No wallet has been verified for this account.'}
            mono
          />
        </div>
      </section>

      <section className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-200">Wallet ownership</h2>
          <p className="text-xs text-slate-400 mt-1">
            Binding requires a short-lived, single-use server challenge signed by the connected wallet.
            A wallet cannot be assigned merely by typing or submitting its address.
          </p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Connected wallet
          </p>
          <p className="mt-1 break-all font-mono text-sm text-cyan-300">
            {connectedAddress || 'No wallet connected in this browser.'}
          </p>
        </div>

        {boundAddress ? (
          <p className={connectedWalletMatches ? 'text-sm text-emerald-400' : 'text-sm text-amber-300'}>
            {connectedWalletMatches
              ? 'The connected wallet matches this account’s verified address.'
              : 'This account is already bound. Wallet rotation requires administrator-assisted recovery.'}
          </p>
        ) : (
          <Button type="button" variant="primary" size="md" onClick={bindWallet} disabled={binding}>
            {binding
              ? 'Verifying ownership…'
              : connectedAddress
                ? 'Sign challenge and bind wallet'
                : 'Connect a wallet to continue'}
          </Button>
        )}

        <ConnectModal ref={connectModal} />
      </section>

      <section className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
        <h2 className="text-base font-semibold text-slate-200">Blockchain deployment</h2>
        <ReadOnlyField label="Network" value="Sui Testnet" />
        <ReadOnlyField label="Wallet gRPC endpoint" value={TESTNET_GRPC} mono />
        <ReadOnlyField label="Verification GraphQL endpoint" value={TESTNET_GRAPHQL} mono />
        <p className="text-xs text-slate-500">
          Network and package identifiers are deployment configuration. They are not editable per user.
        </p>
      </section>
    </div>
  );
}

function ReadOnlyField({
  label,
  value,
  mono = false,
  accent = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  accent?: boolean;
}) {
  return (
    <div>
      <span className="block text-xs font-semibold text-slate-400 mb-1">{label}</span>
      <div
        className={[
          'min-h-10 break-all rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm',
          mono ? 'font-mono' : '',
          accent ? 'text-emerald-400' : 'text-slate-300',
        ].join(' ')}
      >
        {value}
      </div>
    </div>
  );
}
