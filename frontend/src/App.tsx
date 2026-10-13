import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { StatsOverview } from './components/StatsOverview';
import { AlignmentRiskMatrix } from './components/AlignmentRiskMatrix';
import { QuickDemoBar } from './components/QuickDemoBar';
import { PolicyCard } from './components/PolicyCard';
import { CreatePolicyModal } from './components/CreatePolicyModal';
import { FileClaimModal } from './components/FileClaimModal';
import { AlignmentInspectorModal } from './components/AlignmentInspectorModal';
import { AppealModal } from './components/AppealModal';
import { HolographicCertificateModal } from './components/HolographicCertificateModal';
import { QuarantineModal } from './components/QuarantineModal';
import {
  PolicyVaultData,
  ProtocolStats,
  fetchAllVaults,
  fetchStats,
  fetchStudionetBalance,
  fetchClaimableBalance,
  checkIsCurator,
  claimPayout,
  emergencyQuarantineVault,
  liftQuarantine,
  getGenLayerClient,
  ensureStudionet,
  getSavedContractAddress,
  saveContractAddress,
} from './config/genlayer';
import { parseGenToWei } from './utils/formatters';
import { Plus, AlertCircle, CheckCircle2, Loader2, Sparkles, Shield } from 'lucide-react';

export const App: React.FC = () => {
  const [account, setAccount] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>('0.000');
  const [claimableBalance, setClaimableBalance] = useState<string>('0');
  const [isCurator, setIsCurator] = useState<boolean>(false);
  const [contractAddress, setContractAddress] = useState<string>(getSavedContractAddress());
  const [vaults, setVaults] = useState<PolicyVaultData[]>([]);
  const [stats, setStats] = useState<ProtocolStats>({
    total_vaults: 0,
    total_insurance_locked: '0',
    total_claims_settled: 0,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Active filter for vaults
  const [activeFilter, setActiveFilter] = useState<string>('ALL');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createPreset, setCreatePreset] = useState<{ modelId?: string; escrow?: string; duration?: number } | null>(null);
  const [selectedVaultForClaim, setSelectedVaultForClaim] = useState<PolicyVaultData | null>(null);
  const [selectedVaultForInspect, setSelectedVaultForInspect] = useState<PolicyVaultData | null>(null);
  const [selectedVaultForAppeal, setSelectedVaultForAppeal] = useState<PolicyVaultData | null>(null);
  const [selectedVaultForSvg, setSelectedVaultForSvg] = useState<PolicyVaultData | null>(null);
  const [selectedVaultForQuarantine, setSelectedVaultForQuarantine] = useState<PolicyVaultData | null>(null);

  // Connect MetaMask
  const connectWallet = async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      alert('Please install MetaMask to interact with GenLayer Studionet!');
      return;
    }

    try {
      await ensureStudionet();
      const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts && accounts[0]) {
        setAccount(accounts[0]);
        const bal = await fetchStudionetBalance(accounts[0]);
        setBalance(bal);
      }
    } catch (err: any) {
      console.error('Wallet connection error:', err);
      setErrorMessage(err?.message || 'Failed to connect MetaMask');
    }
  };

  // Load contract state directly from GenLayer Studionet RPC (100% on-chain)
  const loadState = async () => {
    setIsRefreshing(true);
    setErrorMessage(null);
    try {
      const [fetchedVaults, fetchedStats] = await Promise.all([
        fetchAllVaults(contractAddress),
        fetchStats(contractAddress),
      ]);

      setVaults(fetchedVaults || []);
      if (fetchedStats) {
        setStats(fetchedStats);
      }

      if (account) {
        const [bal, claimBal, curatorStatus] = await Promise.all([
          fetchStudionetBalance(account),
          fetchClaimableBalance(contractAddress, account),
          checkIsCurator(contractAddress, account),
        ]);
        setBalance(bal);
        setClaimableBalance(claimBal);
        setIsCurator(curatorStatus);
      }
    } catch (e: any) {
      console.warn('loadState error:', e);
      setErrorMessage(`On-chain query notice: ${e?.message || 'Connecting to GenLayer...'}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadState();
  }, [contractAddress, account]);

  // Handle contract address update
  const handleUpdateContract = (newAddr: string) => {
    setContractAddress(newAddr);
    saveContractAddress(newAddr);
    loadState();
  };

  // 1. Provider creates policy vault on-chain
  const handleCreatePolicy = async (
    clientAddr: string,
    modelId: string,
    durationBlocks: number,
    escrowGen: string
  ) => {
    if (!account) {
      await connectWallet();
    }
    setIsLoading(true);
    setStatusMessage('Broadcasting transaction: Locking insurance escrow on GenLayer Studionet...');
    setErrorMessage(null);
    setTxHash(null);

    try {
      const client = getGenLayerClient(account || undefined);
      const escrowWei = parseGenToWei(escrowGen);

      const tx = await client.writeContract({
        address: contractAddress as `0x${string}`,
        functionName: 'create_policy_vault',
        args: [clientAddr, modelId, durationBlocks],
        value: escrowWei,
      });

      setStatusMessage('Waiting for GenLayer BFT validator consensus...');
      if (tx) {
        setTxHash(typeof tx === 'string' ? tx : (tx as any).hash || null);
      }

      await loadState();
      setStatusMessage('Policy vault successfully established and funded on-chain!');
      setTimeout(() => setStatusMessage(null), 6000);
    } catch (err: any) {
      console.error('handleCreatePolicy on-chain error:', err);
      setErrorMessage(err?.message || 'Transaction reverted on-chain during policy creation.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Client files misalignment claim on-chain
  const handleFileClaim = async (vaultId: string, transcriptUrl: string, groundTruthUrl: string) => {
    setIsLoading(true);
    setStatusMessage('Submitting interaction log and ground truth evidence to GenLayer on-chain...');
    setErrorMessage(null);

    try {
      const client = getGenLayerClient(account || undefined);
      const tx = await client.writeContract({
        address: contractAddress as `0x${string}`,
        functionName: 'file_misalignment_claim',
        args: [vaultId, transcriptUrl, groundTruthUrl],
        value: 0n,
      });
      if (tx) setTxHash(typeof tx === 'string' ? tx : (tx as any).hash || null);
      await loadState();
      setStatusMessage('Claim filed on-chain! Ready for AI Alignment Jury evaluation.');
      setTimeout(() => setStatusMessage(null), 6000);
    } catch (err: any) {
      console.error('handleFileClaim error:', err);
      setErrorMessage(err?.message || 'Failed to file claim on-chain.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Adjudicate claim via GenVM Subjective Consensus
  const handleAdjudicateClaim = async (vaultId: string) => {
    setIsLoading(true);
    setStatusMessage('Convening on-chain AI Tribunal: Scraping web data & executing LLM consensus...');
    setErrorMessage(null);

    try {
      const client = getGenLayerClient(account || undefined);
      const tx = await client.writeContract({
        address: contractAddress as `0x${string}`,
        functionName: 'adjudicate_alignment_claim',
        args: [vaultId],
        value: 0n,
      });
      if (tx) setTxHash(typeof tx === 'string' ? tx : (tx as any).hash || null);
      await loadState();
      setStatusMessage('AI Jury verdict rendered on-chain! 24-block (~72s) cooling-off period active.');
      setTimeout(() => setStatusMessage(null), 6000);
    } catch (err: any) {
      console.error('handleAdjudicateClaim error:', err);
      setErrorMessage(err?.message || 'On-chain adjudication transaction failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Appeal verdict on-chain with 10% staked dispute bond
  const handleAppeal = async (
    vaultId: string,
    appealReason: string,
    supplementalUrl: string,
    bondWei: bigint
  ) => {
    setIsLoading(true);
    setStatusMessage('Staking 10% dispute bond & submitting appellate petition on-chain...');
    setErrorMessage(null);

    try {
      const client = getGenLayerClient(account || undefined);
      const tx = await client.writeContract({
        address: contractAddress as `0x${string}`,
        functionName: 'appeal_verdict',
        args: [vaultId, appealReason, supplementalUrl],
        value: bondWei,
      });
      if (tx) setTxHash(typeof tx === 'string' ? tx : (tx as any).hash || null);
      await loadState();
      setStatusMessage('Appellate petition registered with staked bond on-chain!');
      setTimeout(() => setStatusMessage(null), 6000);
    } catch (err: any) {
      console.error('handleAppeal error:', err);
      setErrorMessage(err?.message || 'Appellate petition reverted on-chain.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Adjudicate appeal via Supreme Appellate Tribunal
  const handleAdjudicateAppeal = async (vaultId: string) => {
    setIsLoading(true);
    setStatusMessage('Supreme Alignment Appellate Tribunal re-evaluating bound forensic evidence on-chain...');
    setErrorMessage(null);

    try {
      const client = getGenLayerClient(account || undefined);
      const tx = await client.writeContract({
        address: contractAddress as `0x${string}`,
        functionName: 'adjudicate_appeal',
        args: [vaultId],
        value: 0n,
      });
      if (tx) setTxHash(typeof tx === 'string' ? tx : (tx as any).hash || null);
      await loadState();
      setStatusMessage('Appellate decision rendered and financial bonds disbursed on-chain!');
      setTimeout(() => setStatusMessage(null), 6000);
    } catch (err: any) {
      console.error('handleAdjudicateAppeal error:', err);
      setErrorMessage(err?.message || 'Appellate adjudication transaction failed on-chain.');
    } finally {
      setIsLoading(false);
    }
  };

  // 6. Finalize settlement on-chain
  const handleFinalizeSettlement = async (vaultId: string) => {
    setIsLoading(true);
    setStatusMessage('Executing uncontested payout on-chain after cooling-off period...');
    setErrorMessage(null);

    try {
      const client = getGenLayerClient(account || undefined);
      const tx = await client.writeContract({
        address: contractAddress as `0x${string}`,
        functionName: 'finalize_settlement',
        args: [vaultId],
        value: 0n,
      });
      if (tx) setTxHash(typeof tx === 'string' ? tx : (tx as any).hash || null);
      await loadState();
      setStatusMessage('Settlement executed successfully on-chain!');
      setTimeout(() => setStatusMessage(null), 6000);
    } catch (err: any) {
      console.error('handleFinalizeSettlement error:', err);
      setErrorMessage(err?.message || 'Settlement finalization reverted on-chain.');
    } finally {
      setIsLoading(false);
    }
  };

  // 7. Reclaim unbreached escrow after policy expiration
  const handleReclaim = async (vaultId: string) => {
    setIsLoading(true);
    setStatusMessage('Checking policy duration on-chain and reclaiming unbreached escrow...');
    setErrorMessage(null);

    try {
      const client = getGenLayerClient(account || undefined);
      const tx = await client.writeContract({
        address: contractAddress as `0x${string}`,
        functionName: 'cancel_or_reclaim',
        args: [vaultId],
        value: 0n,
      });
      if (tx) setTxHash(typeof tx === 'string' ? tx : (tx as any).hash || null);
      await loadState();
      setStatusMessage('Escrow successfully returned to provider on-chain!');
      setTimeout(() => setStatusMessage(null), 6000);
    } catch (err: any) {
      console.error('handleReclaim error:', err);
      setErrorMessage(err?.message || 'Reclaim reverted on-chain.');
    } finally {
      setIsLoading(false);
    }
  };

  // 8. Pull-payment claim payout
  const handleClaimPayout = async () => {
    if (!account) return;
    setIsClaiming(true);
    setStatusMessage('Executing Pull-Payment claim of pending disbursement...');
    setErrorMessage(null);

    try {
      const tx = await claimPayout(contractAddress, account);
      if (tx) setTxHash(typeof tx === 'string' ? tx : (tx as any).hash || null);
      await loadState();
      setStatusMessage('Disbursement funds successfully transferred to your wallet!');
      setTimeout(() => setStatusMessage(null), 6000);
    } catch (err: any) {
      console.error('handleClaimPayout error:', err);
      setErrorMessage(err?.message || 'Failed to claim disbursement balance.');
    } finally {
      setIsClaiming(false);
    }
  };

  // 9. Curator emergency quarantine
  const handleQuarantine = async (vaultId: string, reason: string) => {
    if (!account) return;
    setIsLoading(true);
    setStatusMessage('Executing Curator Council Emergency Quarantine Freeze on-chain...');
    setErrorMessage(null);

    try {
      const tx = await emergencyQuarantineVault(contractAddress, account, vaultId, reason);
      if (tx) setTxHash(typeof tx === 'string' ? tx : (tx as any).hash || null);
      setSelectedVaultForQuarantine(null);
      await loadState();
      setStatusMessage('Vault successfully quarantined and frozen on-chain!');
      setTimeout(() => setStatusMessage(null), 6000);
    } catch (err: any) {
      console.error('handleQuarantine error:', err);
      setErrorMessage(err?.message || 'Emergency quarantine execution reverted on-chain.');
    } finally {
      setIsLoading(false);
    }
  };

  // 10. Curator lift emergency quarantine
  const handleLiftQuarantine = async (vaultId: string, restoreStatus: number, justification: string) => {
    if (!account) return;
    setIsLoading(true);
    setStatusMessage('Lifting emergency quarantine on-chain...');
    setErrorMessage(null);

    try {
      const tx = await liftQuarantine(contractAddress, account, vaultId, restoreStatus, justification);
      if (tx) setTxHash(typeof tx === 'string' ? tx : (tx as any).hash || null);
      setSelectedVaultForQuarantine(null);
      await loadState();
      setStatusMessage('Quarantine successfully lifted! Vault returned to operational status.');
      setTimeout(() => setStatusMessage(null), 6000);
    } catch (err: any) {
      console.error('handleLiftQuarantine error:', err);
      setErrorMessage(err?.message || 'Lift quarantine transaction reverted on-chain.');
    } finally {
      setIsLoading(false);
    }
  };

  // Preset selector
  const handleSelectPreset = (modelId: string, escrowGen: string, duration: number) => {
    setCreatePreset({ modelId, escrow: escrowGen, duration });
    setIsCreateOpen(true);
  };

  // Filtered vaults
  const filteredVaults = vaults.filter((v) => {
    if (activeFilter === 'SLASH') return v.status === 3 || v.verdict.includes('SLASH');
    if (activeFilter === 'PARTIAL') return v.status === 4 || v.verdict.includes('PARTIAL');
    if (activeFilter === 'CLEAN') return v.status === 5 || v.verdict.includes('CLEAN') || v.status === 7;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#070A12] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      <Navbar
        account={account}
        balance={balance}
        contractAddress={contractAddress}
        claimableBalance={claimableBalance}
        isCurator={isCurator}
        onUpdateContract={handleUpdateContract}
        onConnect={connectWallet}
        onOpenCreate={() => {
          setCreatePreset(null);
          setIsCreateOpen(true);
        }}
        onRefresh={loadState}
        onClaimPayout={handleClaimPayout}
        isRefreshing={isRefreshing}
        isClaiming={isClaiming}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Consensus / Transaction Status Bar */}
        {statusMessage && (
          <div className="p-4 rounded-2xl bg-cyan-950/80 border border-cyan-500/60 flex items-center justify-between text-xs text-cyan-200 shadow-glow-cyan animate-pulse">
            <div className="flex items-center space-x-2.5">
              <Loader2 className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
              <span>{statusMessage}</span>
            </div>
            {txHash && (
              <a
                href={`https://explorer-studio.genlayer.com/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-cyan-400 underline ml-4 hover:text-cyan-300"
              >
                View on Explorer
              </a>
            )}
          </div>
        )}

        {/* Error Banner */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/60 flex items-start space-x-3 text-xs text-rose-200">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold">Protocol Alert: </span>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {/* 1. Protocol Stats Overview */}
        <StatsOverview stats={stats} vaults={vaults} />

        {/* 2. Neural Alignment Risk Matrix (2D Cartesian Telemetry) */}
        <AlignmentRiskMatrix
          vaults={vaults}
          onSelectVault={(v) => setSelectedVaultForInspect(v)}
          onViewCertificate={(v) => setSelectedVaultForSvg(v)}
        />

        {/* 3. Production Benchmark Presets & Telemetry Filter */}
        <QuickDemoBar
          onSelectPreset={handleSelectPreset}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          vaults={vaults}
        />

        {/* 4. Active Policy Vaults Grid */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-bold text-white flex items-center space-x-2">
                <span>Active Alignment Policy Escrow Vaults</span>
                <span className="px-2.5 py-0.5 text-xs font-mono font-bold rounded-lg bg-cyan-950/80 text-cyan-300 border border-cyan-800">
                  {filteredVaults.length}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                100% on-chain GenLayer Studionet policies monitored for sycophancy, truthfulness, and harm index
              </p>
            </div>

            <button
              onClick={() => {
                setCreatePreset(null);
                setIsCreateOpen(true);
              }}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs shadow-glow-cyan transition-all transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Underwrite New AI Policy</span>
            </button>
          </div>

          {filteredVaults.length === 0 ? (
            <div className="p-12 rounded-3xl bg-[#0D131F] border border-slate-800/80 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-950/60 border border-cyan-800/60 text-cyan-400 flex items-center justify-center mx-auto">
                <Shield className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-display text-base font-bold text-white">No Matching Policy Vaults Found</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  {vaults.length === 0
                    ? 'No policies registered on this smart contract instance yet. Click below to lock the first SLA escrow on GenLayer Studionet.'
                    : 'No policies match the currently selected filter. Change your filter to view other alignment statuses.'}
                </p>
              </div>
              <button
                onClick={() => {
                  setCreatePreset(null);
                  setIsCreateOpen(true);
                }}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono text-xs font-bold transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Create Policy Vault</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVaults.map((vault) => (
                <PolicyCard
                  key={vault.vault_id}
                  vault={vault}
                  account={account}
                  isCurator={isCurator}
                  onFileClaim={(v) => setSelectedVaultForClaim(v)}
                  onAdjudicateClaim={handleAdjudicateClaim}
                  onInspect={(v) => setSelectedVaultForInspect(v)}
                  onViewCertificate={(v) => setSelectedVaultForSvg(v)}
                  onAppeal={(v) => setSelectedVaultForAppeal(v)}
                  onAdjudicateAppeal={handleAdjudicateAppeal}
                  onFinalizeSettlement={handleFinalizeSettlement}
                  onReclaim={handleReclaim}
                  onQuarantine={(v) => setSelectedVaultForQuarantine(v)}
                  onLiftQuarantine={(v) => setSelectedVaultForQuarantine(v)}
                  isProcessing={isLoading}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-slate-800/80 bg-[#070A12] py-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-display font-semibold text-slate-300">AgentSycophancy Protocol</span>
            <span>&bull;</span>
            <span>GenLayer Studionet (Chain ID: 61999 / 0xF22F)</span>
          </div>
          <div className="font-mono text-[11px] text-slate-400">
            Intelligent Contract Subjective Consensus &bull; gl.nondet.web.render &bull; CANARY_AGENT_SYCOPHANCY_V1
          </div>
        </div>
      </footer>

      {/* Modals */}
      <CreatePolicyModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreatePolicy}
        userAccount={account}
        isSubmitting={isLoading}
        initialModelId={createPreset?.modelId}
        initialEscrow={createPreset?.escrow}
        initialDuration={createPreset?.duration}
      />

      <FileClaimModal
        isOpen={!!selectedVaultForClaim}
        vault={selectedVaultForClaim}
        onClose={() => setSelectedVaultForClaim(null)}
        onSubmit={handleFileClaim}
        isSubmitting={isLoading}
      />

      <AlignmentInspectorModal
        isOpen={!!selectedVaultForInspect}
        vault={selectedVaultForInspect}
        onClose={() => setSelectedVaultForInspect(null)}
      />

      <AppealModal
        isOpen={!!selectedVaultForAppeal}
        vault={selectedVaultForAppeal}
        onClose={() => setSelectedVaultForAppeal(null)}
        onSubmit={handleAppeal}
        isSubmitting={isLoading}
      />

      <HolographicCertificateModal
        isOpen={!!selectedVaultForSvg}
        vaultId={selectedVaultForSvg?.vault_id || null}
        modelId={selectedVaultForSvg?.agent_model_id || ''}
        contractAddress={contractAddress}
        onClose={() => setSelectedVaultForSvg(null)}
      />

      <QuarantineModal
        isOpen={!!selectedVaultForQuarantine}
        vault={selectedVaultForQuarantine}
        onClose={() => setSelectedVaultForQuarantine(null)}
        onQuarantine={handleQuarantine}
        onLiftQuarantine={handleLiftQuarantine}
        isProcessing={isLoading}
      />
    </div>
  );
};

export default App;
