import React, { useState } from 'react';
import { X, AlertTriangle, Link2, FileText, CheckCircle2, Sparkles } from 'lucide-react';
import { PolicyVaultData } from '../config/genlayer';

interface FileClaimModalProps {
  isOpen: boolean;
  vault: PolicyVaultData | null;
  onClose: () => void;
  onSubmit: (vaultId: string, transcriptUrl: string, groundTruthUrl: string) => Promise<void>;
  isSubmitting: boolean;
}

const PRESET_CLAIMS = [
  {
    title: 'SEC 10-K Hallucination (Financial)',
    transcript: 'https://logs.enterprise.ai/transcripts/session_8812_earnings.txt',
    groundTruth: 'https://sec.gov/edgar/data/company_actual_10k.txt',
    description: 'Model pandered to user prompt claiming $4.2B EBITDA profit when official 10-K filing states $800M loss.',
  },
  {
    title: 'Overturned Case Precedent (Legal)',
    transcript: 'https://logs.enterprise.ai/transcripts/case_law_brief_412.txt',
    groundTruth: 'https://courtlistener.com/actual_precedent_scotus.txt',
    description: 'Model flattered user legal hypothesis by inventing overruled case law.',
  },
  {
    title: 'CDC Clinical Protocol Pushback (Clean)',
    transcript: 'https://logs.enterprise.ai/transcripts/clinical_consultation_99.txt',
    groundTruth: 'https://cdc.gov/guidelines/official_dosage_protocol.txt',
    description: 'Client challenges model, but model objectively pushed back against unsafe dosage request.',
  },
];

export const FileClaimModal: React.FC<FileClaimModalProps> = ({
  isOpen,
  vault,
  onClose,
  onSubmit,
  isSubmitting,
}) => {
  const [transcriptUrl, setTranscriptUrl] = useState('');
  const [groundTruthUrl, setGroundTruthUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !vault) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanT = transcriptUrl.trim();
    const cleanG = groundTruthUrl.trim();

    if (!cleanT.startsWith('http://') && !cleanT.startsWith('https://')) {
      setError('Conversation transcript must be a valid http:// or https:// URL.');
      return;
    }

    if (!cleanG.startsWith('http://') && !cleanG.startsWith('https://')) {
      setError('Ground truth reference must be a valid http:// or https:// URL.');
      return;
    }

    try {
      await onSubmit(vault.vault_id, cleanT, cleanG);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed filing misalignment claim');
    }
  };

  const applyPreset = (preset: typeof PRESET_CLAIMS[0]) => {
    setTranscriptUrl(preset.transcript);
    setGroundTruthUrl(preset.groundTruth);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl rounded-2xl bg-[#151C2C] border border-amber-500/40 p-6 sm:p-8 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-amber-950/80 border border-amber-700/60 text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-white">File Misalignment Claim</h2>
              <p className="text-xs text-slate-400">
                Vault #{vault.vault_id} &bull; Model: {vault.agent_model_id}
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

        {/* Quick test presets */}
        <div className="mt-4">
          <span className="text-xs font-mono text-amber-400 flex items-center space-x-1 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Preset Forensic Test Vectors:</span>
          </span>
          <div className="space-y-2">
            {PRESET_CLAIMS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => applyPreset(p)}
                className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-900/60 hover:border-amber-500/60 text-left text-xs text-slate-300 hover:text-white transition-colors"
              >
                <div className="font-semibold text-amber-300">{p.title}</div>
                <div className="text-[11px] text-slate-400 line-clamp-1">{p.description}</div>
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
          {/* Transcript URL */}
          <div>
            <label className="block text-xs font-mono font-medium text-slate-300 mb-1.5 flex items-center space-x-1.5">
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span>Public Conversation Transcript URL (Prompt + Model Output):</span>
            </label>
            <input
              type="url"
              value={transcriptUrl}
              onChange={(e) => setTranscriptUrl(e.target.value)}
              placeholder="https://logs.enterprise.ai/transcripts/session_8812.txt"
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F19] border border-slate-700 text-slate-200 font-mono text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Ground-Truth URL */}
          <div>
            <label className="block text-xs font-mono font-medium text-slate-300 mb-1.5 flex items-center space-x-1.5">
              <Link2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Verified Ground-Truth Reference URL (Official SEC / Statute / Corpus):</span>
            </label>
            <input
              type="url"
              value={groundTruthUrl}
              onChange={(e) => setGroundTruthUrl(e.target.value)}
              placeholder="https://sec.gov/edgar/data/company_actual_10k.txt"
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F19] border border-slate-700 text-slate-200 font-mono text-xs focus:outline-none focus:border-amber-500"
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
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-bold text-xs shadow-md transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting Claim...' : 'File Misalignment Claim'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
