import React, { useState } from 'react';
import { X, ShieldAlert, AlertOctagon, CheckCircle2, Lock, Unlock } from 'lucide-react';
import { PolicyVaultData } from '../config/genlayer';

interface QuarantineModalProps {
  isOpen: boolean;
  vault: PolicyVaultData | null;
  onClose: () => void;
  onQuarantine: (vaultId: string, reason: string) => Promise<void>;
  onLiftQuarantine: (vaultId: string, restoreStatus: number, justification: string) => Promise<void>;
  isProcessing: boolean;
}

export const QuarantineModal: React.FC<QuarantineModalProps> = ({
  isOpen,
  vault,
  onClose,
  onQuarantine,
  onLiftQuarantine,
  isProcessing,
}) => {
  const [reason, setReason] = useState<string>('');
  const [restoreStatus, setRestoreStatus] = useState<number>(0); // 0 = STATUS_POLICY_ACTIVE
  const [justification, setJustification] = useState<string>('');

  if (!isOpen || !vault) return null;

  const isQuarantined = vault.status === 8;

  const handleQuarantineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim().length < 8) return;
    await onQuarantine(vault.vault_id, reason.trim());
    setReason('');
  };

  const handleLiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (justification.trim().length < 8) return;
    await onLiftQuarantine(vault.vault_id, restoreStatus, justification.trim());
    setJustification('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#0F1420] border border-rose-500/50 p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-2xl ${isQuarantined ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40' : 'bg-rose-950/80 text-rose-400 border border-rose-500/40'}`}>
              {isQuarantined ? <Unlock className="w-5 h-5" /> : <AlertOctagon className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-white">
                {isQuarantined ? 'Lift Emergency Quarantine' : 'Curator Emergency Quarantine'}
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Vault #{vault.vault_id} ({vault.agent_model_id})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning / Explanation Box */}
        <div className={`p-4 rounded-2xl border text-xs leading-relaxed ${isQuarantined ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200' : 'bg-rose-950/20 border-rose-500/30 text-rose-200'}`}>
          {isQuarantined ? (
            <p>
              <strong>Security Protocol:</strong> Lifting the quarantine will restore this policy vault to active arbitration or coverage status. Ensure the forensic security verification is documented.
            </p>
          ) : (
            <p>
              <strong>Emergency Powers:</strong> Executing an emergency quarantine instantly freezes all escrow disbursements, claims, and settlement windows for this vault until reviewed by the Curator Council.
            </p>
          )}
        </div>

        {/* Action Form */}
        {!isQuarantined ? (
          <form onSubmit={handleQuarantineSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono font-semibold uppercase text-slate-300 mb-2">
                Quarantine Justification (Min 8 Chars)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="e.g., Critical adversarial prompt injection vector discovered in model weights..."
                required
                className="w-full rounded-xl bg-[#090D16] border border-slate-700 focus:border-rose-500 px-4 py-3 text-xs text-slate-200 font-mono placeholder:text-slate-600 focus:outline-none transition-colors"
              />
            </div>

            <div className="pt-2 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isProcessing || reason.trim().length < 8}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold font-mono transition-colors disabled:opacity-50 shadow-md"
              >
                {isProcessing ? 'Freezing On-Chain...' : 'Freeze Vault Immediately'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleLiftSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono font-semibold uppercase text-slate-300 mb-2">
                Target Restoration Status
              </label>
              <select
                value={restoreStatus}
                onChange={(e) => setRestoreStatus(Number(e.target.value))}
                className="w-full rounded-xl bg-[#090D16] border border-slate-700 focus:border-emerald-500 px-4 py-2.5 text-xs text-slate-200 font-mono focus:outline-none transition-colors"
              >
                <option value={0}>Status 0: Policy Active (Normal Coverage)</option>
                <option value={1}>Status 1: Claim Filed (Awaiting Adjudication)</option>
                <option value={2}>Status 2: Awaiting Payout (Cooling-off)</option>
                <option value={6}>Status 6: Disputed (Appellate Court)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono font-semibold uppercase text-slate-300 mb-2">
                Restoration Audit Rationale (Min 8 Chars)
              </label>
              <textarea
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                rows={3}
                placeholder="e.g., Security vulnerability patched, verified model sandbox cleared..."
                required
                className="w-full rounded-xl bg-[#090D16] border border-slate-700 focus:border-emerald-500 px-4 py-3 text-xs text-slate-200 font-mono placeholder:text-slate-600 focus:outline-none transition-colors"
              />
            </div>

            <div className="pt-2 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isProcessing || justification.trim().length < 8}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-mono transition-colors disabled:opacity-50 shadow-md"
              >
                {isProcessing ? 'Restoring...' : 'Lift Quarantine & Resume'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
