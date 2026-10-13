import React, { useState } from 'react';
import {
  ShieldAlert,
  Cpu,
  Wallet,
  ExternalLink,
  Settings,
  RefreshCw,
  Coins,
  ShieldCheck,
} from 'lucide-react';
import { shortenAddress, formatGen } from '../utils/formatters';
import { ensureStudionet } from '../config/genlayer';

interface NavbarProps {
  account: string | null;
  balance: string;
  contractAddress: string;
  claimableBalance?: string;
  isCurator?: boolean;
  onUpdateContract: (address: string) => void;
  onConnect: () => void;
  onOpenCreate: () => void;
  onRefresh: () => void;
  onClaimPayout?: () => Promise<void>;
  isRefreshing: boolean;
  isClaiming?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  account,
  balance,
  contractAddress,
  claimableBalance = '0',
  isCurator = false,
  onUpdateContract,
  onConnect,
  onOpenCreate,
  onRefresh,
  onClaimPayout,
  isRefreshing,
  isClaiming = false,
}) => {
  const [showConfig, setShowConfig] = useState(false);
  const [tempAddress, setTempAddress] = useState(contractAddress);
  const [networkError, setNetworkError] = useState<string | null>(null);

  const hasClaimable = BigInt(claimableBalance || '0') > 0n;

  const handleSwitchNetwork = async () => {
    try {
      setNetworkError(null);
      await ensureStudionet();
    } catch (err: any) {
      setNetworkError(err?.message || 'Failed to switch network');
    }
  };

  const handleSaveAddress = () => {
    if (tempAddress.trim().startsWith('0x')) {
      onUpdateContract(tempAddress.trim());
      setShowConfig(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#070A12]/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-4">
            <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/10 border border-cyan-500/40 shadow-glow-cyan">
              <ShieldAlert className="w-6 h-6 text-cyan-400 animate-pulse" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#070A12]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-display font-bold text-xl tracking-tight text-white">AgentSycophancy</span>
                <span className="px-2 py-0.5 text-[10px] font-mono tracking-wider font-semibold rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/50">
                  STUDIONET
                </span>
                {isCurator && (
                  <span className="hidden sm:inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-950/80 text-purple-300 border border-purple-600/50">
                    <ShieldCheck className="w-3 h-3 text-purple-400" />
                    <span>CURATOR</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-sans hidden sm:block">
                Autonomous LLM Alignment & Anti-Hallucination Insurance Vault
              </p>
            </div>
          </div>

          {/* Right actions: Claimable Payout, Contract Settings, Network indicator, Wallet */}
          <div className="flex items-center space-x-3">
            {/* Pull-Payment Claim button if available */}
            {hasClaimable && onClaimPayout && (
              <button
                onClick={onClaimPayout}
                disabled={isClaiming}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-mono font-bold text-xs shadow-glow-cyan animate-pulse hover:brightness-110 transition-all disabled:opacity-50"
              >
                <Coins className="w-4 h-4" />
                <span>Claim {formatGen(claimableBalance)} GEN</span>
              </button>
            )}

            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition-colors"
              title="Refresh on-chain state"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
            </button>

            <button
              onClick={() => setShowConfig(!showConfig)}
              className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition-colors"
              title="Contract settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Network Badge */}
            <button
              onClick={handleSwitchNetwork}
              className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-emerald-900/50 bg-emerald-950/30 text-emerald-400 text-xs font-mono hover:bg-emerald-950/60 transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Chain: 61999 (0xF22F)</span>
            </button>

            {/* Wallet Connect */}
            {account ? (
              <div className="flex items-center space-x-2 bg-[#131926] border border-slate-700/60 rounded-2xl p-1.5 pl-3">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-mono font-medium text-slate-200">{shortenAddress(account)}</div>
                  <div className="text-[11px] font-mono text-cyan-400">{balance} GEN</div>
                </div>
                <div className="w-8 h-8 rounded-xl bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
            ) : (
              <button
                onClick={onConnect}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-semibold text-sm shadow-glow-cyan transition-all transform active:scale-95"
              >
                <Wallet className="w-4 h-4" />
                <span>Connect MetaMask</span>
              </button>
            )}

            {/* Primary Action Button */}
            <button
              onClick={onOpenCreate}
              className="hidden lg:flex items-center space-x-2 px-4 py-2.5 rounded-2xl border border-cyan-500/50 bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 font-semibold text-sm transition-all"
            >
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>Lock Insurance Escrow</span>
            </button>
          </div>
        </div>

        {/* Contract Config Dropdown Drawer */}
        {showConfig && (
          <div className="pb-4 pt-2 border-t border-slate-800 text-xs">
            <div className="p-4 rounded-2xl bg-[#131926] border border-slate-700/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200">Active Intelligent Contract Address</span>
                <a
                  href={`https://explorer-studio.genlayer.com/address/${contractAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center space-x-1 text-cyan-400 hover:underline font-mono"
                >
                  <span>Explorer</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={tempAddress}
                  onChange={(e) => setTempAddress(e.target.value)}
                  placeholder="0x..."
                  className="flex-1 px-3 py-2 rounded-xl bg-[#090D16] border border-slate-700 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
                />
                <button
                  onClick={handleSaveAddress}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold transition-colors"
                >
                  Update
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                You can change the contract address to test against freshly deployed contracts on GenLayer StudioNet.
              </p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
