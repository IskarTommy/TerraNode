import axios from 'axios';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { ledgerApi } from '../api/ledger';
import { Button } from '../components/Common/Button';
import { Card } from '../components/Common/Card';
import { Input } from '../components/Common/Input';
import { Logo } from '../components/Logo';
import type { PublicBatchVerification } from '../types/ledger';


function CheckRow({ label, passed }: { label: string; passed: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border-primary py-3 last:border-b-0">
      <span className="text-fg-secondary">{label}</span>
      <span className={passed ? 'font-semibold text-emerald-400' : 'font-semibold text-red-300'}>
        {passed ? 'PASS' : 'FAIL'}
      </span>
    </div>
  );
}

export function PublicVerifyPage() {
  const [identifier, setIdentifier] = useState('');
  const [result, setResult] = useState<PublicBatchVerification | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verify = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = identifier.trim();
    if (!normalized) return;

    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await ledgerApi.verifyPublic(normalized));
    } catch (caught) {
      if (axios.isAxiosError<PublicBatchVerification>(caught) && caught.response?.data) {
        setResult(caught.response.data);
      } else {
        setError('Verification service is unavailable. No positive result was assumed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary text-fg-primary">
      <header className="border-b border-border-primary bg-bg-secondary/80">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4" aria-label="Public verification">
          <Link to="/" aria-label="TerraNode home"><Logo size={30} showText /></Link>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-body-sm text-fg-muted hover:text-fg-primary">Home</Link>
            <Link to="/login" className="text-body-sm text-cyan-300 hover:text-cyan-200">Sign in</Link>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-5 py-12">
        <div>
          <p className="text-body-xs font-semibold uppercase tracking-widest text-cyan-300">Public evidence</p>
          <h1 className="mt-2 text-display-lg font-bold">Verify a produce batch</h1>
          <p className="mt-2 max-w-2xl text-fg-muted">
            Enter a TerraNode batch UUID or Sui object ID. Verification fails closed unless local integrity,
            the batch hash, the mint transaction, every custody handoff, and the current owner all agree.
          </p>
        </div>

        <Card variant="glass" padding="lg">
          <form onSubmit={verify} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Input
              label="Batch UUID or Sui object ID"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="Enter a TerraNode UUID or 0x... object ID"
              autoComplete="off"
              required
            />
            <Button type="submit" variant="primary" loading={loading}>Verify batch</Button>
          </form>
        </Card>

        {error && <Card variant="glass" padding="md"><p role="alert" className="text-red-300">{error}</p></Card>}

        {result && (
          <div className="space-y-5" aria-live="polite">
            <Card variant="glass-strong" padding="lg">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-body-xs uppercase tracking-wider text-fg-muted">Overall result</p>
                  <h2
                    role="status"
                    className={result.verified ? 'mt-1 text-heading-lg font-bold text-emerald-400' : 'mt-1 text-heading-lg font-bold text-red-300'}
                  >
                    {result.verified ? 'VERIFIED' : 'NOT VERIFIED'}
                  </h2>
                </div>
                {result.status && <span className="rounded-full border border-border-primary px-3 py-1 text-body-xs">{result.status}</span>}
              </div>
              <p className="mt-4 text-body-sm text-fg-muted">
                {result.error || (
                  result.verified
                    ? 'All required local and Sui checks passed.'
                    : 'One or more required checks failed or no compatible on-chain anchor exists.'
                )}
              </p>
            </Card>

            <div className="grid gap-5 md:grid-cols-2">
              <Card variant="glass" padding="md">
                <h2 className="mb-2 text-heading-sm font-semibold">Verification checks</h2>
                <CheckRow label="Local telemetry integrity" passed={result.local_integrity} />
                <CheckRow label="Batch hash link" passed={result.batch_hash_match} />
                <CheckRow label="Sui mint transaction" passed={result.sui_tx_verified} />
                <CheckRow label="Custody chain and owner" passed={Boolean(result.custody_chain_verified)} />
              </Card>

              <Card variant="glass" padding="md">
                <h2 className="mb-3 text-heading-sm font-semibold">Batch evidence</h2>
                {result.batch_id ? (
                  <dl className="space-y-3 text-body-sm">
                    <div><dt className="text-fg-muted">Batch UUID</dt><dd className="break-all font-mono">{result.batch_id}</dd></div>
                    <div><dt className="text-fg-muted">Crop / weight</dt><dd>{result.crop_type} / {result.weight_grams?.toLocaleString()} g</dd></div>
                    <div><dt className="text-fg-muted">Farmer wallet</dt><dd className="break-all font-mono text-body-xs">{result.farmer_address || 'No wallet bound'}</dd></div>
                    <div><dt className="text-fg-muted">Current custodian wallet</dt><dd className="break-all font-mono text-body-xs">{result.current_custodian_address || 'No wallet bound'}</dd></div>
                    <div><dt className="text-fg-muted">Integrity hash</dt><dd className="break-all font-mono text-body-xs">{result.data_integrity_hash}</dd></div>
                  </dl>
                ) : (
                  <p className="text-fg-muted">No matching local batch record exists.</p>
                )}
              </Card>
            </div>

            {result.sui_verification?.error && (
              <Card variant="glass" padding="md">
                <h2 className="text-heading-sm font-semibold">Sui verification detail</h2>
                <p className="mt-2 text-body-sm text-fg-muted">{result.sui_verification.error}</p>
              </Card>
            )}

            {result.sui_explorer_url && (
              <a href={result.sui_explorer_url} target="_blank" rel="noreferrer" className="inline-flex text-cyan-300 hover:underline">
                Inspect the object on Sui Testnet
              </a>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
