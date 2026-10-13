import React from 'react';
import { Play, Sparkles, ShieldAlert, Scale, CheckCircle2, Flame, Bot } from 'lucide-react';
import { PolicyVaultData } from '../config/genlayer';

interface QuickDemoBarProps {
  onLoadDemoVector: (type: 'slash' | 'partial' | 'clean') => void;
  vaults: PolicyVaultData[];
}

export const QuickDemoBar: React.FC<QuickDemoBarProps> = ({ onLoadDemoVector, vaults }) => {
  return (
    <div className="p-4 rounded-2xl bg-[#151C2C] border border-cyan-500/30 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-display text-sm font-bold text-white">AI Alignment Radar Benchmark Vectors</span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-900/40 text-cyan-300 border border-cyan-800">
            1-Click Evaluation
          </span>
        </div>
        <span className="text-xs text-slate-400">
          Fast-track test cases to observe all three GenLayer subjective consensus verdicts in real time:
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* Vector 1: Hallucination Slash */}
        <button
          onClick={() => onLoadDemoVector('slash')}
          className="flex items-center space-x-2.5 p-3 rounded-xl border border-rose-900/60 bg-rose-950/20 hover:bg-rose-950/40 text-left transition-all group"
        >
          <div className="p-2 rounded-lg bg-rose-950/80 border border-rose-800/80 text-rose-400 group-hover:scale-105 transition-transform">
            <Flame className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-xs text-rose-300 group-hover:text-rose-200">
              1. Critical Hallucination Slash
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              $4.2B EBITDA fabrication vs SEC 10-K ($800M net loss) &rarr; 100% slash
            </div>
          </div>
        </button>

        {/* Vector 2: Partial Sycophancy */}
        <button
          onClick={() => onLoadDemoVector('partial')}
          className="flex items-center space-x-2.5 p-3 rounded-xl border border-amber-900/60 bg-amber-950/20 hover:bg-amber-950/40 text-left transition-all group"
        >
          <div className="p-2 rounded-lg bg-amber-950/80 border border-amber-800/80 text-amber-400 group-hover:scale-105 transition-transform">
            <Scale className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-xs text-amber-300 group-hover:text-amber-200">
              2. Partial Sycophancy Penalty
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              Flattering user false premise to avoid conflict &rarr; 40% client / 60% provider
            </div>
          </div>
        </button>

        {/* Vector 3: Objective Clean */}
        <button
          onClick={() => onLoadDemoVector('clean')}
          className="flex items-center space-x-2.5 p-3 rounded-xl border border-emerald-900/60 bg-emerald-950/20 hover:bg-emerald-950/40 text-left transition-all group"
        >
          <div className="p-2 rounded-lg bg-emerald-950/80 border border-emerald-800/80 text-emerald-400 group-hover:scale-105 transition-transform">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-xs text-emerald-300 group-hover:text-emerald-200">
              3. Objective Alignment Clean
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              Model strictly defended CDC clinical safety limits &rarr; Claim dismissed
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};
