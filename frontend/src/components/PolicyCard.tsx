import React from 'react';
import {
  ShieldAlert,
  Cpu,
  Eye,
  Award,
  AlertOctagon,
  Unlock,
  Scale,
  Sparkles,
} from 'lucide-react';
import { PolicyVaultData } from '../config/genlayer';
import {
  getStatusBadge,
  getVerdictBadge,
  formatGen,
  shortenAddress,
} from '../utils/formatters';

interface PolicyCardProps {
  vault: PolicyVaultData;
  account: string | null;
  onFileClaim: (vault: PolicyVaultData) => void;
  onAdjudicateClaim: (vaultId: string) => Promise<void>;
  onInspect: (vault: PolicyVaultData) => void;
  onViewCertificate?: (vault: PolicyVaultData) => void;
  onAppeal: (vault: PolicyVaultData) => void;
  onAdjudicateAppeal: (vaultId: string) => Promise<void>;
  onFinalizeSettlement: (vaultId: string) => Promise<void>;
  onReclaim: (vaultId: string) => Promise<void>;
  onQuarantine?: (vault: PolicyVaultData) => void;
  onLiftQuarantine?: (vault: PolicyVaultData) => void;
  isCurator?: boolean;
  isProcessing: boolean;
}

export const PolicyCard: React.FC<PolicyCardProps> = ({
  vault,
  account,
  onFileClaim,
  onAdjudicateClaim,
  onInspect,
  onViewCertificate,
  onAppeal,
  onAdjudicateAppeal,
  onFinalizeSettlement,
  onReclaim,
  onQuarantine,
  onLiftQuarantine,
  isCurator,
  isProcessing,
}) => {
  const statusBadge = getStatusBadge(vault.status);
  const verdictBadge = getVerdictBadge(vault.verdict);
  const escrowGen = formatGen(vault.escrow_amount);
  const bondGen = formatGen(vault.dispute_bond || '0');

  const isClient = account && account.toLowerCase() === vault.client.toLowerCase();
  const isProvider = account && account.toLowerCase() === vault.provider.toLowerCase();
  const isQuarantined = vault.status === 8;

  return (
    <div className={`relative rounded-3xl bg-[#131926] border p-6 space-y-5 transition-all shadow-xl hover:shadow-glow-cyan ${isQuarantined ? 'border-rose-500/60 bg-gradient-to-b from-[#1a1217] to-[#131926]' : 'border-slate-800 hover:border-cyan-500/40'}`}>
      {/* Top row: Vault ID, Model ID, Status Badge */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-2xl bg-[#090D16] border border-slate-700 text-cyan-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-sm font-bold text-white">Vault #{vault.vault_id}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${statusBadge.bg} ${statusBadge.border} border ${statusBadge.color}`}>
                {statusBadge.label}
              </span>
            </div>
            <div className="font-mono text-xs text-slate-400 truncate max-w-[220px] sm:max-w-xs" title={vault.agent_model_id}>
              {vault.agent_model_id}
            </div>
          </div>
        </div>

        {/* Escrow display */}
        <div className="text-right">
          <div className="flex items-baseline space-x-1 justify-end">
            <span className="font-mono text-xl font-bold text-white">{escrowGen}</span>
            <span className="text-xs font-mono font-semibold text-cyan-400">GEN</span>
          </div>
          {BigInt(vault.dispute_bond || '0') > 0n && (
            <div className="text-[10px] font-mono text-fuchsia-400">
              +{bondGen} GEN Bond
            </div>
          )}
        </div>
      </div>

      {/* Emergency Quarantine Banner if active */}
      {isQuarantined && (
        <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-500/60 flex items-center justify-between text-xs text-rose-300 animate-pulse">
          <div className="flex items-center space-x-2">
            <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-mono font-bold">ASSETS FROZEN BY CURATOR COUNCIL</span>
          </div>
          {isCurator && onLiftQuarantine && (
            <button
              onClick={() => onLiftQuarantine(vault)}
              className="inline-flex items-center space-x-1 px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[11px] font-bold transition-colors"
            >
              <Unlock className="w-3 h-3" />
              <span>Lift Freeze</span>
            </button>
          )}
        </div>
      )}

      {/* Stakeholders info */}
      <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-[#090D16] border border-slate-800/80 text-xs">
        <div>
          <span className="text-[10px] font-mono uppercase text-slate-500 block">AI Model Provider</span>
          <span className="font-mono text-slate-300 font-medium">{shortenAddress(vault.provider)}</span>
          {isProvider && <span className="ml-1 text-[9px] text-cyan-400 font-mono">(You)</span>}
        </div>
        <div>
          <span className="text-[10px] font-mono uppercase text-slate-500 block">Covered Client</span>
          <span className="font-mono text-slate-300 font-medium">{shortenAddress(vault.client)}</span>
          {isClient && <span className="ml-1 text-[9px] text-emerald-400 font-mono">(You)</span>}
        </div>
      </div>

      {/* AI Alignment Radar Gauges (if evaluated) */}
      {(vault.status >= 2 && vault.status <= 6) && (
        <div className="p-3.5 rounded-2xl bg-[#090D16]/90 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-slate-400 font-semibold uppercase tracking-wider">AI Alignment Dossier</span>
            <span className={`font-mono text-xs font-bold ${verdictBadge.color}`}>
              {verdictBadge.badge}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            {/* Factuality meter */}
            <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 block mb-0.5">Factuality</span>
              <span className={`font-mono text-xs font-bold ${vault.factuality_score >= 80 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {vault.factuality_score}%
              </span>
            </div>

            {/* Sycophancy meter */}
            <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 block mb-0.5">Sycophancy</span>
              <span className={`font-mono text-xs font-bold ${vault.sycophancy_score >= 60 ? 'text-amber-400' : 'text-cyan-400'}`}>
                {vault.sycophancy_score}%
              </span>
            </div>

            {/* Harm Index meter */}
            <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 block mb-0.5">Harm Index</span>
              <span className={`font-mono text-xs font-bold ${Number(vault.harm_index || 0) >= 70 ? 'text-rose-400' : 'text-slate-300'}`}>
                {vault.harm_index || 0}%
              </span>
            </div>
          </div>

          {vault.reason && (
            <p className="text-[11px] text-slate-300 font-sans line-clamp-2 leading-relaxed pt-1 border-t border-slate-800">
              "{vault.reason}"
            </p>
          )}
        </div>
      )}

      {/* Action Row */}
      <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800">
        {/* Left: View Dossier & Holographic SVG */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onInspect(vault)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            <Eye className="w-3.5 h-3.5 text-cyan-400" />
            <span>Dossier</span>
          </button>

          {onViewCertificate && (
            <button
              onClick={() => onViewCertificate(vault)}
              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl border border-cyan-500/40 bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 text-xs font-mono transition-colors"
              title="View pure on-chain holographic SLA SVG certificate"
            >
              <Award className="w-3.5 h-3.5 text-cyan-400" />
              <span>SLA SVG</span>
            </button>
          )}

          {/* Curator Quarantine trigger */}
          {isCurator && !isQuarantined && vault.status < 7 && onQuarantine && (
            <button
              onClick={() => onQuarantine(vault)}
              className="p-1.5 rounded-xl border border-rose-800/60 bg-rose-950/30 hover:bg-rose-900/40 text-rose-400 transition-colors"
              title="Curator Council: Emergency Quarantine Freeze"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right: State actions */}
        <div className="flex items-center space-x-2">
          {/* Status 0: File Claim (Client) or Reclaim (Provider) */}
          {vault.status === 0 && !isQuarantined && (
            <>
              <button
                onClick={() => onFileClaim(vault)}
                disabled={isProcessing}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 text-xs font-bold transition-all disabled:opacity-50"
              >
                File Claim
              </button>
              <button
                onClick={() => onReclaim(vault.vault_id)}
                disabled={isProcessing}
                className="px-3 py-1.5 rounded-xl border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-white text-xs font-semibold transition-all disabled:opacity-50"
                title="Reclaim escrow once policy coverage duration concludes"
              >
                Reclaim (Expiry)
              </button>
            </>
          )}

          {/* Status 1: Adjudicate Claim */}
          {vault.status === 1 && !isQuarantined && (
            <button
              onClick={() => onAdjudicateClaim(vault.vault_id)}
              disabled={isProcessing}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 text-xs font-bold shadow-md transition-all disabled:opacity-50"
            >
              Convene AI Jury
            </button>
          )}

          {/* Status 2: In Cooling-Off Window */}
          {vault.status === 2 && !isQuarantined && (
            <>
              <button
                onClick={() => onAppeal(vault)}
                disabled={isProcessing}
                className="px-3 py-1.5 rounded-xl bg-fuchsia-950/60 hover:bg-fuchsia-900/60 border border-fuchsia-500/60 text-fuchsia-300 text-xs font-bold transition-all disabled:opacity-50"
              >
                Appeal (10% Bond)
              </button>
              <button
                onClick={() => onFinalizeSettlement(vault.vault_id)}
                disabled={isProcessing}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-300 text-xs font-bold transition-all disabled:opacity-50"
                title="Finalize settlement once 72s cooling-off elapses"
              >
                Finalize Payout
              </button>
            </>
          )}

          {/* Status 6: Under Appellate Review */}
          {vault.status === 6 && !isQuarantined && (
            <button
              onClick={() => onAdjudicateAppeal(vault.vault_id)}
              disabled={isProcessing}
              className="px-4 py-1.5 rounded-xl bg-fuchsia-500 hover:bg-fuchsia-400 text-slate-950 text-xs font-bold shadow-md transition-all disabled:opacity-50"
            >
              Adjudicate Appeal
            </button>
          )}

          {/* Status 9: Unresolved State (Forensic retry / re-file) */}
          {vault.status === 9 && !isQuarantined && (
            <>
              {isClient && (
                <button
                  onClick={() => onFileClaim(vault)}
                  disabled={isProcessing}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 text-xs font-bold transition-all disabled:opacity-50"
                  title="Update evidence URLs and re-file claim"
                >
                  Re-File Claim
                </button>
              )}
              <button
                onClick={() => onAdjudicateClaim(vault.vault_id)}
                disabled={isProcessing}
                className="px-3.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-300 text-xs font-bold transition-all disabled:opacity-50"
                title="Retry AI Jury adjudication on-chain"
              >
                Retry Adjudication
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
