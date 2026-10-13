import React, { useState } from 'react';
import { X, Shield, Cpu, Clock, Coins, AlertCircle, Sparkles } from 'lucide-react';
import { parseGenToWei } from '../utils/formatters';

interface CreatePolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (clientAddress: string, modelId: string, durationBlocks: number, escrowGen: string) => Promise<void>;
  userAccount: string | null;
  isSubmitting: boolean;
  initialModelId?: string;
  initialEscrow?: string;
  initialDuration?: number;
}

const TEMPLATES = [
  {
    name: 'Finance Risk Evaluator',
    modelId: 'FINANCE-AGENT-V4-SYS-HASH',
    duration: 6000,
    escrow: '1.0',
    description: 'Guarantees truthful earnings balance sheet statements without sycophantic inflation.',
  },
  {
    name: 'Legal Compliance AI',
    modelId: 'LEGAL-COMPLIANCE-BOT-V1',
    duration: 6000,
    escrow: '1.5',
    description: 'Guarantees authentic case law precedent citations without pandering to client biases.',
  },
  {
    name: 'Clinical Dosage Advisor',
    modelId: 'CLINICAL-DECISION-AGENT-V2',
    duration: 12000,
    escrow: '2.0',
    description: 'Guarantees clinical safety boundaries against dangerous user self-medication prompts.',
  },
];

export const CreatePolicyModal: React.FC<CreatePolicyModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  userAccount,
  isSubmitting,
  initialModelId,
  initialEscrow,
  initialDuration,
}) => {
  const [clientAddress, setClientAddress] = useState('');
  const [modelId, setModelId] = useState(initialModelId || 'FINANCE-AGENT-V4-SYS-HASH');
  const [durationBlocks, setDurationBlocks] = useState(initialDuration || 6000);
  const [escrowGen, setEscrowGen] = useState(initialEscrow || '1.0');
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      if (initialModelId) setModelId(initialModelId);
      if (initialEscrow) setEscrowGen(initialEscrow);
      if (initialDuration) setDurationBlocks(initialDuration);
    }
  }, [isOpen, initialModelId, initialEscrow, initialDuration]);


  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanClient = clientAddress.trim();
    if (!cleanClient.startsWith('0x') || cleanClient.length !== 42) {
      setError('Please provide a valid 42-character hex Client EVM address.');
      return;
    }

    if (userAccount && cleanClient.toLowerCase() === userAccount.toLowerCase()) {
      setError('Provider cannot insure their own address. Please provide a distinct client address.');
      return;
    }

    if (modelId.trim().length < 4) {
      setError('Agent model ID must be at least 4 characters.');
      return;
    }

    const escrowWei = parseGenToWei(escrowGen);
    if (escrowWei <= 0n) {
      setError('Insurance escrow amount must be greater than 0 GEN.');
      return;
    }

    try {
      await onSubmit(cleanClient, modelId.trim(), durationBlocks, escrowGen);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Transaction failed');
    }
  };

  const applyTemplate = (t: typeof TEMPLATES[0]) => {
    setModelId(t.modelId);
    setDurationBlocks(t.duration);
    setEscrowGen(t.escrow);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl rounded-2xl bg-[#151C2C] border border-cyan-500/40 p-6 sm:p-8 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-700/60 text-cyan-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-white">Create Alignment Policy Vault</h2>
              <p className="text-xs text-slate-400">Lock GEN insurance escrow guaranteeing objective AI alignment</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick template buttons */}
        <div className="mt-4">
          <span className="text-xs font-mono text-cyan-400 flex items-center space-x-1 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Preset Model Profiles:</span>
          </span>
          <div className="grid grid-cols-3 gap-2">
            {TEMPLATES.map((t, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => applyTemplate(t)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-900/60 hover:border-cyan-500/60 text-[11px] text-left text-slate-300 hover:text-white transition-colors"
              >
                <div className="font-semibold truncate">{t.name}</div>
                <div className="text-[10px] text-cyan-400 font-mono">{t.escrow} GEN</div>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-950/40 border border-red-800/60 flex items-start space-x-2 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Client Address */}
          <div>
            <label className="block text-xs font-mono font-medium text-slate-300 mb-1.5">
              Client / Enterprise Consumer Address:
            </label>
            <input
              type="text"
              value={clientAddress}
              onChange={(e) => setClientAddress(e.target.value)}
              placeholder="0x... (e.g. 0x2222222222222222222222222222222222222222)"
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F19] border border-slate-700 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Agent Model ID */}
          <div>
            <label className="block text-xs font-mono font-medium text-slate-300 mb-1.5 flex items-center space-x-1.5">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>Agent Model Architecture / System Prompt Hash:</span>
            </label>
            <input
              type="text"
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              placeholder="FINANCE-AGENT-V4-SYS-HASH"
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F19] border border-slate-700 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Grid: Duration + Escrow Amount */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono font-medium text-slate-300 mb-1.5 flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Coverage Duration:</span>
              </label>
              <select
                value={durationBlocks}
                onChange={(e) => setDurationBlocks(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F19] border border-slate-700 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
              >
                <option value={100}>100 Blocks (~5 min test)</option>
                <option value={6000}>6,000 Blocks (~5 hours standard)</option>
                <option value={28800}>28,800 Blocks (~24 hours enterprise)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono font-medium text-slate-300 mb-1.5 flex items-center space-x-1.5">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span>Escrow Guarantee (GEN):</span>
              </label>
              <input
                type="number"
                step="0.001"
                min="0.001"
                value={escrowGen}
                onChange={(e) => setEscrowGen(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0B0F19] border border-slate-700 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>
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
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs shadow-glow-cyan transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Locking Escrow on GenLayer...' : 'Lock Insurance Escrow (Payable)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
