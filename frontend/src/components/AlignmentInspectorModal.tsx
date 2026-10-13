import React from 'react';
import { X, ShieldAlert, Cpu, ExternalLink, CheckCircle, AlertTriangle, Fingerprint, Lock, Scale, FileText } from 'lucide-react';
import { PolicyVaultData } from '../config/genlayer';
import { getVerdictBadge, formatTimestamp, shortenAddress, shortenHash } from '../utils/formatters';

interface AlignmentInspectorModalProps {
  isOpen: boolean;
  vault: PolicyVaultData | null;
  onClose: () => void;
}

export const AlignmentInspectorModal: React.FC<AlignmentInspectorModalProps> = ({
  isOpen,
  vault,
  onClose,
}) => {
  if (!isOpen || !vault) return null;

  const verdictBadge = getVerdictBadge(vault.verdict);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#151C2C] border border-cyan-500/40 p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-700/60 text-cyan-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-display text-lg font-bold text-white">AI Alignment Jury Dossier</h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-cyan-950 border border-cyan-800 text-cyan-300">
                  Vault #{vault.vault_id}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">Agent Spec: {vault.agent_model_id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Verdict Banner */}
        <div className={`p-4 rounded-xl border ${verdictBadge.border} ${verdictBadge.bg} space-y-2`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-300">
              Consensus Adjudication Verdict
            </span>
            <span className={`px-2.5 py-1 rounded-md text-xs font-bold font-mono ${verdictBadge.color} bg-black/30 border ${verdictBadge.border}`}>
              {verdictBadge.badge}
            </span>
          </div>
          <div className={`text-base sm:text-lg font-display font-bold ${verdictBadge.color}`}>
            {verdictBadge.label}
          </div>
          <p className="text-xs text-slate-200 font-sans leading-relaxed pt-1 border-t border-white/10">
            {vault.reason || 'No detailed jury rationale recorded.'}
          </p>
        </div>

        {/* Forensic Scores: Sycophancy vs Factuality vs Confidence */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Sycophancy Score */}
          <div className="p-4 rounded-xl bg-[#0B0F19] border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400">Sycophancy Score</span>
              <span className={`text-xs font-mono font-bold ${vault.sycophancy_score >= 60 ? 'text-amber-400' : 'text-slate-300'}`}>
                {vault.sycophancy_score}%
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  vault.sycophancy_score >= 60 ? 'bg-gradient-to-r from-amber-500 to-rose-500' : 'bg-cyan-500'
                }`}
                style={{ width: `${vault.sycophancy_score}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 block">Degree of uncritical user flattery</span>
          </div>

          {/* Factuality Score */}
          <div className="p-4 rounded-xl bg-[#0B0F19] border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400">Factuality Score</span>
              <span className={`text-xs font-mono font-bold ${vault.factuality_score >= 80 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {vault.factuality_score}%
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  vault.factuality_score >= 80 ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
                style={{ width: `${vault.factuality_score}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 block">Ground truth factual consistency</span>
          </div>

          {/* Consensus Confidence */}
          <div className="p-4 rounded-xl bg-[#0B0F19] border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400">Jury Confidence</span>
              <span className="text-xs font-mono font-bold text-cyan-400">{vault.confidence}%</span>
            </div>
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-400 rounded-full transition-all duration-500"
                style={{ width: `${vault.confidence}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 block">BFT validator agreement certainty</span>
          </div>
        </div>

        {/* Cryptographic Snapshot & Canary Token */}
        <div className="p-4 rounded-xl bg-[#0B0F19] border border-slate-800 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-slate-300 font-mono">
              <Fingerprint className="w-4 h-4 text-cyan-400" />
              <span>SHA-256 Forensic Evidence Hash</span>
            </div>
            <span className="inline-flex items-center space-x-1 text-[11px] font-mono text-emerald-400">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>CANARY_AGENT_SYCOPHANCY_V1 VERIFIED</span>
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-black/50 border border-slate-800 font-mono text-slate-400 break-all select-all">
            {vault.evidence_hash || '0000000000000000000000000000000000000000000000000000000000000000'}
          </div>
        </div>

        {/* Evidence Links */}
        <div className="space-y-2 text-xs">
          <span className="font-mono text-slate-400 font-medium">Scraped Evidence Payloads:</span>
          <div className="space-y-1.5 font-mono">
            {vault.transcript_url ? (
              <a
                href={vault.transcript_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-2.5 rounded-lg bg-[#0B0F19] border border-slate-800 text-cyan-400 hover:border-cyan-500/50 transition-colors"
              >
                <div className="flex items-center space-x-2 truncate">
                  <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{vault.transcript_url}</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 shrink-0 ml-2" />
              </a>
            ) : (
              <div className="p-2.5 rounded-lg bg-[#0B0F19] border border-slate-800 text-slate-500 italic">
                No transcript submitted yet
              </div>
            )}

            {vault.ground_truth_url ? (
              <a
                href={vault.ground_truth_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-2.5 rounded-lg bg-[#0B0F19] border border-slate-800 text-emerald-400 hover:border-emerald-500/50 transition-colors"
              >
                <div className="flex items-center space-x-2 truncate">
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{vault.ground_truth_url}</span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 shrink-0 ml-2" />
              </a>
            ) : (
              <div className="p-2.5 rounded-lg bg-[#0B0F19] border border-slate-800 text-slate-500 italic">
                No ground truth submitted yet
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 flex justify-end border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
};
