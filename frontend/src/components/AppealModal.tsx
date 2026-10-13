import React, { useState } from 'react';
import { X, Scale, AlertCircle, ShieldAlert, Coins, ExternalLink, Sparkles } from 'lucide-react';
import { PolicyVaultData } from '../config/genlayer';
import { formatGen } from '../utils/formatters';

interface AppealModalProps {
  isOpen: boolean;
  vault: PolicyVaultData | null;
  onClose: () => void;
  onSubmit: (vaultId: string, reason: string, supplementalUrl: string, bondWei: bigint) => Promise<void>;
  isSubmitting: boolean;
}

const PRESET_EVIDENCE = [
  {
    title: 'Independent Forensic Audit (KPMG / PwC)',
    reason: 'Independent forensic audit proves the agent output completely fabricated earnings metrics.',
    url: 'https://audit.firm.org/forensic_sec_divergence_report.txt',
  },
  {
    title: 'Model Prompt Robustness Benchmark (HELM / Stanford)',
    reason: 'Formal benchmark logs demonstrate the model maintains robust adversarial resistance and did not flatter.',
    url: 'https://crfm.stanford.edu/helm/benchmarks/sycophancy_v4_evaluation.txt',
  },
];

export const AppealModal: React.FC<AppealModalProps> = ({
  isOpen,
  vault,
  onClose,
  onSubmit,
  isSubmitting,
}) => {
  const [reason, setReason] = useState('');
  const [supplementalUrl, setSupplementalUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !vault) return null;

  // Calculate 10% required bond
  const escrowWei = BigInt(vault.escrow_amount || '0');
  const requiredBondWei = (escrowWei * 10n) / 100n > 0n ? (escrowWei * 10n) / 100n : 1n;
  const requiredBondGen = formatGen(requiredBondWei);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanReason = reason.trim();
    if (cleanReason.length < 10) {
      setError('Dispute justification must be at least 10 characters.');
      return;
    }

    const cleanUrl = supplementalUrl.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      setError('Supplemental benchmark reference must be a valid http:// or https:// URL.');
      return;
    }

    try {
      await onSubmit(vault.vault_id, cleanReason, cleanUrl, requiredBondWei);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to file appeal');
    }
  };

  const applyPreset = (p: typeof PRESET_EVIDENCE[0]) => {
    setReason(p.reason);
    setSupplementalUrl(p.url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl rounded-2xl bg-[#151C2C] border border-fuchsia-500/40 p-6 sm:p-8 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-fuchsia-950/80 border border-fuchsia-700/60 text-fuchsia-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-white">Supreme Alignment Appellate Court</h2>
              <p className="text-xs text-slate-400">
                24-block (~72s) dispute window &bull; 10% Staked Dispute Bond
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bond Requirement Card */}
        <div className="mt-4 p-4 rounded-xl bg-fuchsia-950/30 border border-fuchsia-800/50 flex items-center justify-between text-xs">
          <div className="space-y-0.5">
            <span className="font-mono text-slate-300 font-semibold block">Required 10% Dispute Bond:</span>
            <span className="text-[11px] text-slate-400">
              Forfeited to counterparty if appeal is dismissed; refunded if appeal is upheld.
            </span>
          </div>
          <div className="text-right">
            <span className="font-mono text-base font-bold text-fuchsia-400">{requiredBondGen}</span>
            <span className="text-xs font-mono text-slate-400 ml-1">GEN</span>
          </div>
        </div>

        {/* Quick test presets */}
        <div className="mt-4">
          <span className="text-xs font-mono text-fuchsia-400 flex items-center space-x-1 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Preset Forensic Benchmark Dossiers:</span>
          </span>
          <div className="space-y-2">
            {PRESET_EVIDENCE.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => applyPreset(p)}
                className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900/60 hover:border-fuchsia-500/60 text-left text-xs text-slate-300 hover:text-white transition-colors"
              >
                <div className="font-semibold text-fuchsia-300">{p.title}</div>
                <div className="text-[11px] text-slate-400 line-clamp-1">{p.reason}</div>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-xs text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Dispute Justification */}
          <div>
            <label className="block text-xs font-mono font-medium text-slate-300 mb-1.5">
              Appellate Justification & Forensic Argument (min 10 chars):
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="State the technical reasons why the AI jury verdict should be overturned..."
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F19] border border-slate-700 text-slate-200 font-sans text-xs focus:outline-none focus:border-fuchsia-500"
            />
          </div>

          {/* Supplemental Benchmark URL */}
          <div>
            <label className="block text-xs font-mono font-medium text-slate-300 mb-1.5 flex items-center space-x-1.5">
              <ExternalLink className="w-3.5 h-3.5 text-fuchsia-400" />
              <span>Bound Supplemental Benchmark / Forensic Audit Evidence URL:</span>
            </label>
            <input
              type="url"
              value={supplementalUrl}
              onChange={(e) => setSupplementalUrl(e.target.value)}
              placeholder="https://audit.firm.org/forensic_report.txt"
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F19] border border-slate-700 text-slate-200 font-mono text-xs focus:outline-none focus:border-fuchsia-500"
            />
          </div>

          <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-500 to-pink-500 hover:from-fuchsia-400 hover:to-pink-400 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Staking Bond & Submitting Appeal...' : `Stake ${requiredBondGen} GEN & Appeal`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
