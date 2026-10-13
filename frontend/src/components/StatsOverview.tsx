import React from 'react';
import { ShieldCheck, Scale, AlertOctagon, Activity, Radio, Cpu, Lock } from 'lucide-react';
import { ProtocolStats, PolicyVaultData } from '../config/genlayer';
import { formatGen } from '../utils/formatters';

interface StatsOverviewProps {
  stats: ProtocolStats;
  vaults: PolicyVaultData[];
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ stats, vaults }) => {
  const totalLockedGen = formatGen(stats.total_insurance_locked);
  const totalVaults = stats.total_vaults || vaults.length;
  const settled = stats.total_claims_settled;

  // Calculate clean alignment rate
  const cleanCount = vaults.filter(
    (v) => v.status === 5 || v.verdict === 'OBJECTIVE_ALIGNMENT_CLEAN' || v.status === 7
  ).length;
  const slashedCount = vaults.filter(
    (v) => v.status === 3 || v.verdict === 'CRITICAL_HALLUCINATION_SLASH'
  ).length;
  const partialCount = vaults.filter(
    (v) => v.status === 4 || v.verdict === 'PARTIAL_SYCOPHANCY_PENALTY'
  ).length;

  const totalEvaluated = cleanCount + slashedCount + partialCount;
  const cleanRate = totalEvaluated > 0 ? Math.round((cleanCount / totalEvaluated) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* Protocol Banner & Radar Telemetry */}
      <div className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-[#151C2C] via-[#0E1524] to-[#151C2C] p-6 lg:p-8 shadow-glow-cyan">
        {/* Radar background effect */}
        <div className="absolute right-0 top-0 bottom-0 w-96 opacity-10 pointer-events-none hidden md:block">
          <div className="w-full h-full radar-sweep rounded-full" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="max-w-3xl space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-700/60 text-cyan-300 text-xs font-mono">
              <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>CANARY DEFENSE ARMED: CANARY_AGENT_SYCOPHANCY_V1</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white">
              AI Safety & Anti-Hallucination Insurance Vault
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Decentralized SLA protection against sycophantic LLMs and fabricated citations. AI Providers lock
              GEN escrow; GenLayer Intelligent Arbiters audit live interaction logs against SEC filings, statutes, and biomedical ground truth.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
              <span className="block text-[11px] font-mono text-slate-400 uppercase">Settlement Window</span>
              <span className="font-mono text-sm font-bold text-cyan-400">24 BLOCKS (~72s)</span>
            </div>
            <div className="px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
              <span className="block text-[11px] font-mono text-slate-400 uppercase">Appeal Bond</span>
              <span className="font-mono text-sm font-bold text-amber-400">10% STAKED</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Key Protocol Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Insurance Escrow Locked */}
        <div className="p-5 rounded-2xl bg-[#151C2C] border border-slate-800 hover:border-cyan-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Insurance Escrow</span>
            <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-800/40 text-cyan-400">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="font-mono text-2xl lg:text-3xl font-bold text-white">{totalLockedGen}</span>
            <span className="text-xs font-mono font-semibold text-cyan-400">GEN</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Active SLA underwriting capital</span>
        </div>

        {/* 2. Total Policy Vaults */}
        <div className="p-5 rounded-2xl bg-[#151C2C] border border-slate-800 hover:border-emerald-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Protected AI Policies</span>
            <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-emerald-400">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="font-mono text-2xl lg:text-3xl font-bold text-white">{totalVaults}</span>
            <span className="text-xs font-mono text-slate-400">Vaults</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Autonomous Enterprise SLA vaults</span>
        </div>

        {/* 3. Claims Settled */}
        <div className="p-5 rounded-2xl bg-[#151C2C] border border-slate-800 hover:border-amber-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Claims Settled</span>
            <div className="p-2 rounded-lg bg-amber-950/60 border border-amber-800/40 text-amber-400">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="font-mono text-2xl lg:text-3xl font-bold text-white">{settled}</span>
            <span className="text-xs font-mono text-slate-400">Adjudications</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">On-chain AI Jury verdicts enforced</span>
        </div>

        {/* 4. Objective Alignment Rate */}
        <div className="p-5 rounded-2xl bg-[#151C2C] border border-slate-800 hover:border-cyan-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Clean Alignment Rate</span>
            <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="font-mono text-2xl lg:text-3xl font-bold text-emerald-400">{cleanRate}%</span>
            <span className="text-xs font-mono text-slate-400">Integrity</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Models defending objective truth</span>
        </div>
      </div>
    </div>
  );
};
