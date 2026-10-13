import React, { useState } from 'react';
import { Crosshair, ShieldAlert, Cpu, AlertTriangle, CheckCircle2, Eye, Award } from 'lucide-react';
import { PolicyVaultData } from '../config/genlayer';
import { formatGen } from '../utils/formatters';

interface AlignmentRiskMatrixProps {
  vaults: PolicyVaultData[];
  onSelectVault: (vault: PolicyVaultData) => void;
  onViewCertificate?: (vault: PolicyVaultData) => void;
}

export const AlignmentRiskMatrix: React.FC<AlignmentRiskMatrixProps> = ({
  vaults,
  onSelectVault,
  onViewCertificate,
}) => {
  const [hoveredVault, setHoveredVault] = useState<PolicyVaultData | null>(null);

  // Filter evaluated vaults (verdict rendered or settled)
  const evaluatedVaults = vaults.filter(
    (v) => (v.status >= 2 && v.status <= 6) || (v.factuality_score > 0 || v.sycophancy_score > 0)
  );

  return (
    <div className="rounded-3xl bg-[#0D131F] border border-cyan-500/30 p-6 lg:p-8 shadow-2xl space-y-6 relative overflow-hidden">
      {/* Background grid accent */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-20 pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-700/60 text-cyan-400">
              <Crosshair className="w-5 h-5 animate-pulse" />
            </span>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-white tracking-wide">
              Neural Alignment Risk Matrix (2D Cartesian Telemetry)
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 font-sans mt-1">
            Real-time multi-vector mapping of monitored AI models: Sycophancy Index (Y-axis) vs Ground-Truth Factuality (X-axis).
          </p>
        </div>

        <div className="flex items-center space-x-3 font-mono text-xs">
          <span className="px-3 py-1.5 rounded-xl bg-[#151C2C] border border-slate-800 text-slate-300">
            Plotted: <strong className="text-cyan-400">{evaluatedVaults.length}</strong> / {vaults.length} Policies
          </span>
        </div>
      </div>

      {/* The 2D Cartesian Canvas Container */}
      <div className="relative z-10 w-full aspect-[16/9] sm:aspect-[2/1] min-h-[340px] max-h-[460px] rounded-2xl bg-[#080C14] border border-slate-800/90 p-6 flex flex-col justify-between">
        {/* Quadrant Overlays */}
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 pointer-events-none">
          {/* Top-Left: Critical Sycophancy & Hallucination */}
          <div className="border-r border-b border-slate-800/60 bg-red-950/10 p-3 flex flex-col justify-between">
            <div className="text-[10px] font-mono font-bold text-rose-400/80 uppercase tracking-wider flex items-center space-x-1">
              <ShieldAlert className="w-3 h-3 text-rose-400" />
              <span>QUADRANT II: Critical Sycophancy & Fabrication (100% Slash)</span>
            </div>
            <div className="text-[9px] font-mono text-rose-500/40">High Sycophancy • Low Factuality</div>
          </div>

          {/* Top-Right: Agreeable Consensus */}
          <div className="border-b border-slate-800/60 bg-amber-950/10 p-3 flex flex-col justify-between items-end text-right">
            <div className="text-[10px] font-mono font-bold text-amber-400/80 uppercase tracking-wider flex items-center space-x-1">
              <span>QUADRANT I: Agreeable Consensus (Partial Penalty)</span>
              <AlertTriangle className="w-3 h-3 text-amber-400" />
            </div>
            <div className="text-[9px] font-mono text-amber-500/40">High Sycophancy • High Factuality</div>
          </div>

          {/* Bottom-Left: Disagreeable Hallucination */}
          <div className="border-r border-slate-800/60 bg-purple-950/10 p-3 flex flex-col justify-between">
            <div className="text-[9px] font-mono text-purple-400/40">Low Sycophancy • Low Factuality</div>
            <div className="text-[10px] font-mono font-bold text-purple-400/80 uppercase tracking-wider">
              QUADRANT III: Disagreeable Hallucination
            </div>
          </div>

          {/* Bottom-Right: Optimal Alignment Clean */}
          <div className="bg-emerald-950/10 p-3 flex flex-col justify-between items-end text-right">
            <div className="text-[9px] font-mono text-emerald-400/40">Low Sycophancy • High Factuality</div>
            <div className="text-[10px] font-mono font-bold text-emerald-400/80 uppercase tracking-wider flex items-center space-x-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>QUADRANT IV: Optimal Alignment (Zero Breach Clean)</span>
            </div>
          </div>
        </div>

        {/* Axis Labels */}
        {/* Y-Axis Label (Sycophancy Index) */}
        <div className="absolute left-2 top-1/2 -translate-y-1/2 -rotate-90 origin-center text-[10px] font-mono font-bold tracking-widest text-slate-500 uppercase pointer-events-none select-none">
          ▲ SYCOPHANCY INDEX (0% → 100%)
        </div>

        {/* X-Axis Label (Factuality Score) */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-mono font-bold tracking-widest text-slate-500 uppercase pointer-events-none select-none">
          GROUND-TRUTH FACTUALITY SCORE (0% → 100%) ▶
        </div>

        {/* Plotted Interactive Dots */}
        <div className="absolute inset-8">
          {evaluatedVaults.map((vault) => {
            const fact = Math.min(Math.max(vault.factuality_score, 0), 100);
            const syco = Math.min(Math.max(vault.sycophancy_score, 0), 100);

            // In SVG / CSS coordinate space:
            // left% = factuality (0 -> 100%)
            // bottom% = 100 - sycophancy (0 -> 100%) OR top% = 100 - sycophancy (so 100% sycophancy is top)
            const leftPercent = fact;
            const topPercent = 100 - syco; // 100% sycophancy is at top (top: 0%), 0% is at bottom (top: 100%)

            // Dot Color based on verdict
            let dotColor = 'bg-cyan-400 shadow-glow-cyan border-cyan-300';
            let dotRing = 'hover:ring-cyan-400';
            if (vault.verdict === 'CRITICAL_HALLUCINATION_SLASH' || vault.status === 3) {
              dotColor = 'bg-rose-500 shadow-glow-rose border-rose-300 animate-pulse';
              dotRing = 'hover:ring-rose-400';
            } else if (vault.verdict === 'PARTIAL_SYCOPHANCY_PENALTY' || vault.status === 4) {
              dotColor = 'bg-amber-400 shadow-glow-amber border-amber-200';
              dotRing = 'hover:ring-amber-400';
            } else if (vault.verdict === 'OBJECTIVE_ALIGNMENT_CLEAN' || vault.status === 5) {
              dotColor = 'bg-emerald-400 shadow-glow-emerald border-emerald-200';
              dotRing = 'hover:ring-emerald-400';
            }

            return (
              <div
                key={vault.vault_id}
                style={{
                  left: `${leftPercent}%`,
                  top: `${topPercent}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                className="absolute z-20 group cursor-pointer"
                onMouseEnter={() => setHoveredVault(vault)}
                onMouseLeave={() => setHoveredVault(null)}
                onClick={() => onSelectVault(vault)}
              >
                {/* Ping wave for slashed or high risk */}
                {(vault.status === 3 || vault.harm_index && vault.harm_index > 70) && (
                  <span className="absolute -inset-1 rounded-full bg-rose-500/40 animate-ping pointer-events-none" />
                )}

                {/* Dot */}
                <div
                  className={`relative w-4 h-4 rounded-full border-2 ${dotColor} transition-transform transform group-hover:scale-150 ring-2 ring-transparent ${dotRing}`}
                />

                {/* Label on dot */}
                <span className="absolute left-5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-black/80 border border-slate-700 text-[9px] font-mono text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30">
                  #{vault.vault_id} ({vault.agent_model_id})
                </span>
              </div>
            );
          })}
        </div>

        {/* Center Target Crosshairs */}
        <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-cyan-500/20 pointer-events-none" />
        <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-cyan-500/20 pointer-events-none" />
      </div>

      {/* Interactive Detail Inspector Drawer for Hovered / Focused Policy */}
      {hoveredVault ? (
        <div className="p-4 rounded-2xl bg-[#151C2C] border border-cyan-500/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-[#0B0F19] border border-slate-700 text-cyan-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-sm font-bold text-white">Vault #{hoveredVault.vault_id}</span>
                <span className="font-mono text-xs text-slate-300 font-semibold">{hoveredVault.agent_model_id}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 text-cyan-300 border border-cyan-800">
                  {hoveredVault.verdict || 'PENDING'}
                </span>
              </div>
              <div className="flex items-center space-x-4 text-xs font-mono text-slate-400 mt-1">
                <span>Factuality: <strong className="text-emerald-400">{hoveredVault.factuality_score}%</strong></span>
                <span>Sycophancy: <strong className="text-amber-400">{hoveredVault.sycophancy_score}%</strong></span>
                <span>Harm Index: <strong className="text-rose-400">{hoveredVault.harm_index || 0}%</strong></span>
                <span>Escrow: <strong className="text-white">{formatGen(hoveredVault.escrow_amount)} GEN</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 w-full md:w-auto">
            <button
              onClick={() => onSelectVault(hoveredVault)}
              className="flex-1 md:flex-none inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-mono font-semibold transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-cyan-400" />
              <span>Inspect Dossier</span>
            </button>
            {onViewCertificate && (
              <button
                onClick={() => onViewCertificate(hoveredVault)}
                className="flex-1 md:flex-none inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-300 text-xs font-mono font-semibold transition-colors"
              >
                <Award className="w-3.5 h-3.5" />
                <span>View SLA SVG</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="p-3.5 rounded-2xl bg-[#111726]/60 border border-slate-800/80 text-center text-xs font-mono text-slate-500">
          Hover over any node in the Cartesian matrix to inspect forensic telemetry or click to open full alignment dossier.
        </div>
      )}
    </div>
  );
};
