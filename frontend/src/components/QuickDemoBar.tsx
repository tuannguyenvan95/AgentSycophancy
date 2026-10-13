import React from 'react';
import { Sparkles, Flame, Scale, CheckCircle2, Filter } from 'lucide-react';
import { PolicyVaultData } from '../config/genlayer';

interface QuickDemoBarProps {
  onSelectPreset: (modelId: string, escrowGen: string, duration: number) => void;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  vaults: PolicyVaultData[];
}

export const QuickDemoBar: React.FC<QuickDemoBarProps> = ({
  onSelectPreset,
  activeFilter,
  onFilterChange,
  vaults,
}) => {
  const slashCount = vaults.filter((v) => v.status === 3 || v.verdict.includes('SLASH')).length;
  const partialCount = vaults.filter((v) => v.status === 4 || v.verdict.includes('PARTIAL')).length;
  const cleanCount = vaults.filter((v) => v.status === 5 || v.verdict.includes('CLEAN') || v.status === 7).length;

  return (
    <div className="p-5 rounded-3xl bg-[#0F1420] border border-cyan-500/30 space-y-4 shadow-xl">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-cyan-950 border border-cyan-700/60 text-cyan-400 shadow-glow-cyan">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <span className="font-display text-sm font-bold text-white block">
              Production Benchmark Presets & Telemetry Filter
            </span>
            <span className="text-xs text-slate-400 font-sans">
              1-Click load real-world SLA specifications for on-chain underwrite & filter live vaults
            </span>
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
          <button
            onClick={() => onFilterChange('ALL')}
            className={`px-3 py-1.5 rounded-xl border transition-all ${activeFilter === 'ALL' ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold' : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'}`}
          >
            ALL ({vaults.length})
          </button>
          <button
            onClick={() => onFilterChange('SLASH')}
            className={`px-3 py-1.5 rounded-xl border transition-all ${activeFilter === 'SLASH' ? 'bg-rose-500 text-slate-950 border-rose-400 font-bold' : 'bg-slate-900/60 border-slate-800 text-rose-400 hover:bg-rose-950/40'}`}
          >
            SLASHED ({slashCount})
          </button>
          <button
            onClick={() => onFilterChange('PARTIAL')}
            className={`px-3 py-1.5 rounded-xl border transition-all ${activeFilter === 'PARTIAL' ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold' : 'bg-slate-900/60 border-slate-800 text-amber-400 hover:bg-amber-950/40'}`}
          >
            PARTIAL ({partialCount})
          </button>
          <button
            onClick={() => onFilterChange('CLEAN')}
            className={`px-3 py-1.5 rounded-xl border transition-all ${activeFilter === 'CLEAN' ? 'bg-emerald-400 text-slate-950 border-emerald-300 font-bold' : 'bg-slate-900/60 border-slate-800 text-emerald-400 hover:bg-emerald-950/40'}`}
          >
            CLEAN ({cleanCount})
          </button>
        </div>
      </div>

      {/* Preset Launcher Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Preset 1: SEC Financial Benchmark */}
        <button
          onClick={() => onSelectPreset('FINANCE-AGENT-V4-SYS-HASH', '1.0', 6000)}
          className="flex items-center space-x-3 p-3.5 rounded-2xl border border-rose-900/60 bg-rose-950/15 hover:bg-rose-950/35 text-left transition-all group"
        >
          <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-700/80 text-rose-400 group-hover:scale-105 transition-transform shrink-0">
            <Flame className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-xs text-rose-300 group-hover:text-rose-200">
              Preset: SEC 10-K Audit Spec
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              FINANCE-AGENT-V4 (1.0 GEN Escrow)
            </div>
          </div>
        </button>

        {/* Preset 2: SCOTUS Legal Benchmark */}
        <button
          onClick={() => onSelectPreset('LEGAL-COMPLIANCE-BOT-V1', '1.5', 6000)}
          className="flex items-center space-x-3 p-3.5 rounded-2xl border border-amber-900/60 bg-amber-950/15 hover:bg-amber-950/35 text-left transition-all group"
        >
          <div className="p-2.5 rounded-xl bg-amber-950/80 border border-amber-700/80 text-amber-400 group-hover:scale-105 transition-transform shrink-0">
            <Scale className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-xs text-amber-300 group-hover:text-amber-200">
              Preset: SCOTUS Case Law Spec
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              LEGAL-COMPLIANCE-BOT-V1 (1.5 GEN Escrow)
            </div>
          </div>
        </button>

        {/* Preset 3: CDC Clinical Benchmark */}
        <button
          onClick={() => onSelectPreset('CLINICAL-DECISION-AGENT-V2', '2.0', 12000)}
          className="flex items-center space-x-3 p-3.5 rounded-2xl border border-emerald-900/60 bg-emerald-950/15 hover:bg-emerald-950/35 text-left transition-all group"
        >
          <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-700/80 text-emerald-400 group-hover:scale-105 transition-transform shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-xs text-emerald-300 group-hover:text-emerald-200">
              Preset: CDC Clinical Safety Spec
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              CLINICAL-DECISION-AGENT-V2 (2.0 GEN Escrow)
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};
