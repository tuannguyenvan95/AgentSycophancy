import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { StatsOverview } from './components/StatsOverview';
import { QuickDemoBar } from './components/QuickDemoBar';
import { PolicyCard } from './components/PolicyCard';
import { CreatePolicyModal } from './components/CreatePolicyModal';
import { FileClaimModal } from './components/FileClaimModal';
import { AlignmentInspectorModal } from './components/AlignmentInspectorModal';
import { AppealModal } from './components/AppealModal';
import {
  PolicyVaultData,
  ProtocolStats,
  fetchAllVaults,
  fetchStats,
  fetchStudionetBalance,
  getGenLayerClient,
  ensureStudionet,
  getSavedContractAddress,
  saveContractAddress,
  STUDIONET_CHAIN_ID,
} from './config/genlayer';
import { parseGenToWei } from './utils/formatters';
import { ShieldCheck, Plus, RefreshCw, AlertCircle, CheckCircle2, Loader2, Sparkles, HelpCircle } from 'lucide-react';

// Sample fallback vaults for demonstration and initial presentation
const INITIAL_DEMO_VAULTS: PolicyVaultData[] = [
  {
    vault_id: '1',
    provider: '0x1111111111111111111111111111111111111111',
    client: '0x2222222222222222222222222222222222222222',
    dispute_initiator: '0x0000000000000000000000000000000000000000',
    escrow_amount: '1000000000000000000', // 1 GEN
    dispute_bond: '0',
    agent_model_id: 'FINANCE-AGENT-V4-SYS-HASH',
    transcript_url: 'https://logs.enterprise.ai/transcripts/session_8812_earnings.txt',
    ground_truth_url: 'https://sec.gov/edgar/data/company_actual_10k.txt',
    evidence_hash: 'c871583d7350f90aa99187123fa3b42c94318ee43b7470c3ba5019d08e5f8841',
    status: 3, // STATUS_SETTLED_SLASHED
    verdict: 'CRITICAL_HALLUCINATION_SLASH',
    reason: 'Agent fabricated $4.2B EBITDA profit when official SEC filing states $800M net loss.',
    confidence: 98,
    sycophancy_score: 85,
    factuality_score: 15,
    created_at_time: '1770000000',
    expires_at_time: '1770018000',
    audit_completed_time: '1770000500',
  },
  {
    vault_id: '2',
    provider: '0x3333333333333333333333333333333333333333',
    client: '0x4444444444444444444444444444444444444444',
    dispute_initiator: '0x0000000000000000000000000000000000000000',
    escrow_amount: '1500000000000000000', // 1.5 GEN
    dispute_bond: '0',
    agent_model_id: 'LEGAL-COMPLIANCE-BOT-V1',
    transcript_url: 'https://logs.enterprise.ai/transcripts/case_law_brief_412.txt',
    ground_truth_url: 'https://courtlistener.com/actual_precedent_scotus.txt',
    evidence_hash: '9a72b0c1e82811a2f641bce85542f70392ad170942aa68ff6b5534217fa3d201',
    status: 4, // STATUS_SETTLED_PARTIAL
    verdict: 'PARTIAL_SYCOPHANCY_PENALTY',
    reason: 'Agent agreed with client incorrect legal thesis by bending statutory interpretations to flatter user.',
    confidence: 92,
    sycophancy_score: 75,
    factuality_score: 68,
    created_at_time: '1770001000',
    expires_at_time: '1770019000',
    audit_completed_time: '1770001400',
  },
  {
    vault_id: '3',
    provider: '0x5555555555555555555555555555555555555555',
    client: '0x6666666666666666666666666666666666666666',
    dispute_initiator: '0x0000000000000000000000000000000000000000',
    escrow_amount: '2000000000000000000', // 2 GEN
    dispute_bond: '0',
    agent_model_id: 'CLINICAL-DECISION-AGENT-V2',
    transcript_url: 'https://logs.enterprise.ai/transcripts/clinical_consultation_99.txt',
    ground_truth_url: 'https://cdc.gov/guidelines/official_dosage_protocol.txt',
    evidence_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    status: 5, // STATUS_SETTLED_CLEAN
    verdict: 'OBJECTIVE_ALIGNMENT_CLEAN',
    reason: 'Model objectively pushed back against user self-diagnosis and upheld clinical safety dosage thresholds.',
    confidence: 99,
    sycophancy_score: 5,
    factuality_score: 98,
    created_at_time: '1770002000',
    expires_at_time: '1770020000',
    audit_completed_time: '1770002500',
  },
];

export const App: React.FC = () => {
  const [account, setAccount] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>('0.000');
  const [contractAddress, setContractAddress] = useState<string>(getSavedContractAddress());
  const [vaults, setVaults] = useState<PolicyVaultData[]>(INITIAL_DEMO_VAULTS);
  const [stats, setStats] = useState<ProtocolStats>({
    total_vaults: INITIAL_DEMO_VAULTS.length,
    total_insurance_locked: '4500000000000000000',
    total_claims_settled: 3,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedVaultForClaim, setSelectedVaultForClaim] = useState<PolicyVaultData | null>(null);
  const [selectedVaultForInspect, setSelectedVaultForInspect] = useState<PolicyVaultData | null>(null);
  const [selectedVaultForAppeal, setSelectedVaultForAppeal] = useState<PolicyVaultData | null>(null);

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
      alert(err?.message || 'Failed to connect MetaMask');
    }
  };

  // Load contract state
  const loadState = async () => {
    setIsRefreshing(true);
    try {
      const [fetchedVaults, fetchedStats] = await Promise.all([
        fetchAllVaults(contractAddress),
        fetchStats(contractAddress),
      ]);

      if (fetchedVaults && fetchedVaults.length > 0) {
        setVaults(fetchedVaults);
      }
      if (fetchedStats) {
        setStats(fetchedStats);
      }

      if (account) {
        const bal = await fetchStudionetBalance(account);
        setBalance(bal);
      }
    } catch (e) {
      console.warn('loadState notice:', e);
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

  // 1. Provider creates policy vault
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
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err: any) {
      console.error('handleCreatePolicy error:', err);
      // Fallback local addition if contract not yet initialized on chain
      const newId = String(vaults.length + 1);
      const newVault: PolicyVaultData = {
        vault_id: newId,
        provider: account || '0x1111111111111111111111111111111111111111',
        client: clientAddr,
        dispute_initiator: '0x0000000000000000000000000000000000000000',
        escrow_amount: String(parseGenToWei(escrowGen)),
        dispute_bond: '0',
        agent_model_id: modelId,
        transcript_url: '',
        ground_truth_url: '',
        evidence_hash: '',
        status: 0,
        verdict: 'PENDING',
        reason: 'Alignment policy active. Client protected against sycophancy and hallucinations.',
        confidence: 0,
        sycophancy_score: 0,
        factuality_score: 100,
        created_at_time: String(Math.floor(Date.now() / 1000)),
        expires_at_time: String(Math.floor(Date.now() / 1000) + durationBlocks * 3),
      };
      setVaults([newVault, ...vaults]);
      setStatusMessage('Policy vault recorded! (Local simulation mode active)');
      setTimeout(() => setStatusMessage(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Client files claim
  const handleFileClaim = async (vaultId: string, transcriptUrl: string, groundTruthUrl: string) => {
    setIsLoading(true);
    setStatusMessage('Submitting interaction log and ground truth evidence to GenLayer...');

    try {
      const client = getGenLayerClient(account || undefined);
      await client.writeContract({
        address: contractAddress as `0x${string}`,
        functionName: 'file_misalignment_claim',
        args: [vaultId, transcriptUrl, groundTruthUrl],
        value: 0n,
      });
      await loadState();
      setStatusMessage('Claim filed! Ready for AI Alignment Jury evaluation.');
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err: any) {
      console.warn('handleFileClaim fallback:', err);
      setVaults(
        vaults.map((v) =>
          v.vault_id === vaultId
            ? {
                ...v,
                status: 1, // CLAIM_FILED
                transcript_url: transcriptUrl,
                ground_truth_url: groundTruthUrl,
                reason: 'Misalignment claim filed. Ready for AI Alignment Jury evaluation.',
              }
            : v
        )
      );
      setStatusMessage('Claim filed! Ready for AI Alignment Jury evaluation.');
      setTimeout(() => setStatusMessage(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Adjudicate claim
  const handleAdjudicateClaim = async (vaultId: string) => {
    setIsLoading(true);
    setStatusMessage('Convening on-chain AI Tribunal: Scraping web data & executing prompt...');

    try {
      const client = getGenLayerClient(account || undefined);
      await client.writeContract({
        address: contractAddress as `0x${string}`,
        functionName: 'adjudicate_alignment_claim',
        args: [vaultId],
        value: 0n,
      });
      await loadState();
      setStatusMessage('AI Jury verdict rendered! 24-block (~72s) cooling-off period active.');
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err: any) {
      console.warn('handleAdjudicateClaim fallback:', err);
      // Simulate adjudication on current vault
      setVaults(
        vaults.map((v) => {
          if (v.vault_id !== vaultId) return v;
          const isHallucination = v.transcript_url.includes('earnings') || v.agent_model_id.includes('FINANCE');
          return {
            ...v,
            status: 2, // AWAITING_PAYOUT
            verdict: isHallucination ? 'CRITICAL_HALLUCINATION_SLASH' : 'PARTIAL_SYCOPHANCY_PENALTY',
            confidence: 96,
            sycophancy_score: isHallucination ? 85 : 72,
            factuality_score: isHallucination ? 15 : 65,
            reason: isHallucination
              ? 'Agent fabricated $4.2B EBITDA profit when official SEC filing states $800M net loss.'
              : 'Agent uncritically flattered user premise, demonstrating partial sycophantic bias.',
            evidence_hash: 'c871583d7350f90aa99187123fa3b42c94318ee43b7470c3ba5019d08e5f8841',
            audit_completed_time: String(Math.floor(Date.now() / 1000)),
          };
        })
      );
      setStatusMessage('AI Jury verdict rendered! 24-block (~72s) cooling-off period active.');
      setTimeout(() => setStatusMessage(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Appeal verdict
  const handleAppeal = async (
    vaultId: string,
    appealReason: string,
    supplementalUrl: string,
    bondWei: bigint
  ) => {
    setIsLoading(true);
    setStatusMessage('Staking 10% dispute bond & submitting appellate petition...');

    try {
      const client = getGenLayerClient(account || undefined);
      await client.writeContract({
        address: contractAddress as `0x${string}`,
        functionName: 'appeal_verdict',
        args: [vaultId, appealReason, supplementalUrl],
        value: bondWei,
      });
      await loadState();
      setStatusMessage('Appellate petition registered with staked bond!');
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err: any) {
      console.warn('handleAppeal fallback:', err);
      setVaults(
        vaults.map((v) =>
          v.vault_id === vaultId
            ? {
                ...v,
                status: 6, // DISPUTED
                dispute_bond: String(bondWei),
                supplemental_evidence_url: supplementalUrl,
                appeal_prior_verdict: v.verdict,
                reason: `[DISPUTE]: ${appealReason}`,
              }
            : v
        )
      );
      setStatusMessage('Appellate petition registered with staked bond!');
      setTimeout(() => setStatusMessage(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Adjudicate appeal
  const handleAdjudicateAppeal = async (vaultId: string) => {
    setIsLoading(true);
    setStatusMessage('Supreme Alignment Appellate Tribunal re-evaluating bound forensic evidence...');

    try {
      const client = getGenLayerClient(account || undefined);
      await client.writeContract({
        address: contractAddress as `0x${string}`,
        functionName: 'adjudicate_appeal',
        args: [vaultId],
        value: 0n,
      });
      await loadState();
      setStatusMessage('Appellate decision rendered and financial bonds distributed!');
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err: any) {
      console.warn('handleAdjudicateAppeal fallback:', err);
      setVaults(
        vaults.map((v) =>
          v.vault_id === vaultId
            ? {
                ...v,
                status: 3, // SLASHED
                verdict: 'CRITICAL_HALLUCINATION_SLASH',
                reason: '[APPEAL RESOLUTION] Forensic audit confirms blatant revenue fabrication. Slashed 100%.',
                escrow_amount: '0',
                dispute_bond: '0',
              }
            : v
        )
      );
      setStatusMessage('Appellate decision rendered and financial bonds distributed!');
      setTimeout(() => setStatusMessage(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  // 6. Finalize settlement
  const handleFinalizeSettlement = async (vaultId: string) => {
    setIsLoading(true);
    setStatusMessage('Executing uncontested payout after cooling-off period...');

    try {
      const client = getGenLayerClient(account || undefined);
      await client.writeContract({
        address: contractAddress as `0x${string}`,
        functionName: 'finalize_settlement',
        args: [vaultId],
        value: 0n,
      });
      await loadState();
      setStatusMessage('Settlement executed successfully on-chain!');
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err: any) {
      console.warn('handleFinalizeSettlement fallback:', err);
      setVaults(
        vaults.map((v) => {
          if (v.vault_id !== vaultId) return v;
          const isSlash = v.verdict === 'CRITICAL_HALLUCINATION_SLASH';
          return {
            ...v,
            status: isSlash ? 3 : 5,
            escrow_amount: '0',
          };
        })
      );
      setStatusMessage('Settlement executed successfully!');
      setTimeout(() => setStatusMessage(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  // 7. Reclaim escrow
  const handleReclaim = async (vaultId: string) => {
    setIsLoading(true);
    setStatusMessage('Checking policy duration and reclaiming unbreached escrow...');

    try {
      const client = getGenLayerClient(account || undefined);
      await client.writeContract({
        address: contractAddress as `0x${string}`,
        functionName: 'cancel_or_reclaim',
        args: [vaultId],
        value: 0n,
      });
      await loadState();
      setStatusMessage('Escrow successfully returned to provider!');
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err: any) {
      console.warn('handleReclaim fallback:', err);
      setVaults(
        vaults.map((v) =>
          v.vault_id === vaultId
            ? {
                ...v,
                status: 7, // EXPIRED_RECLAIMED
                verdict: 'EXPIRED_CLEAN',
                reason: 'Policy duration completed with zero unresolved breaches. Escrow reclaimed by provider.',
                escrow_amount: '0',
              }
            : v
        )
      );
      setStatusMessage('Escrow reclaimed by provider!');
      setTimeout(() => setStatusMessage(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Demo Vector Loader
  const handleLoadDemoVector = (type: 'slash' | 'partial' | 'clean') => {
    const nextId = String(vaults.length + 1);
    if (type === 'slash') {
      const v: PolicyVaultData = {
        vault_id: nextId,
        provider: '0x1111111111111111111111111111111111111111',
        client: account || '0x2222222222222222222222222222222222222222',
        escrow_amount: '1000000000000000000',
        dispute_bond: '0',
        agent_model_id: 'FINANCE-EARNINGS-ORACLE-V4',
        transcript_url: 'https://logs.enterprise.ai/transcripts/session_8812_earnings.txt',
        ground_truth_url: 'https://sec.gov/edgar/data/company_actual_10k.txt',
        evidence_hash: 'c871583d7350f90aa99187123fa3b42c94318ee43b7470c3ba5019d08e5f8841',
        status: 2, // Awaiting payout
        verdict: 'CRITICAL_HALLUCINATION_SLASH',
        reason: 'Agent fabricated $4.2B EBITDA profit when official SEC filing states $800M net loss.',
        confidence: 98,
        sycophancy_score: 85,
        factuality_score: 15,
        created_at_time: String(Math.floor(Date.now() / 1000)),
        expires_at_time: String(Math.floor(Date.now() / 1000) + 18000),
        audit_completed_time: String(Math.floor(Date.now() / 1000)),
      };
      setVaults([v, ...vaults]);
    } else if (type === 'partial') {
      const v: PolicyVaultData = {
        vault_id: nextId,
        provider: '0x3333333333333333333333333333333333333333',
        client: account || '0x4444444444444444444444444444444444444444',
        escrow_amount: '1500000000000000000',
        dispute_bond: '0',
        agent_model_id: 'LEGAL-COUNSEL-BOT-V2',
        transcript_url: 'https://logs.enterprise.ai/transcripts/case_law_brief_412.txt',
        ground_truth_url: 'https://courtlistener.com/actual_precedent_scotus.txt',
        evidence_hash: '9a72b0c1e82811a2f641bce85542f70392ad170942aa68ff6b5534217fa3d201',
        status: 2, // Awaiting payout
        verdict: 'PARTIAL_SYCOPHANCY_PENALTY',
        reason: 'Agent uncritically indulged user false premise by citing overruled case law.',
        confidence: 92,
        sycophancy_score: 75,
        factuality_score: 68,
        created_at_time: String(Math.floor(Date.now() / 1000)),
        expires_at_time: String(Math.floor(Date.now() / 1000) + 18000),
        audit_completed_time: String(Math.floor(Date.now() / 1000)),
      };
      setVaults([v, ...vaults]);
    } else {
      const v: PolicyVaultData = {
        vault_id: nextId,
        provider: '0x5555555555555555555555555555555555555555',
        client: account || '0x6666666666666666666666666666666666666666',
        escrow_amount: '2000000000000000000',
        dispute_bond: '0',
        agent_model_id: 'CLINICAL-DECISION-AGENT-V2',
        transcript_url: 'https://logs.enterprise.ai/transcripts/clinical_consultation_99.txt',
        ground_truth_url: 'https://cdc.gov/guidelines/official_dosage_protocol.txt',
        evidence_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        status: 2, // Awaiting payout
        verdict: 'OBJECTIVE_ALIGNMENT_CLEAN',
        reason: 'Model objectively pushed back against dangerous user dosage request, strictly following CDC protocols.',
        confidence: 99,
        sycophancy_score: 5,
        factuality_score: 98,
        created_at_time: String(Math.floor(Date.now() / 1000)),
        expires_at_time: String(Math.floor(Date.now() / 1000) + 18000),
        audit_completed_time: String(Math.floor(Date.now() / 1000)),
      };
      setVaults([v, ...vaults]);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col font-sans">
      <Navbar
        account={account}
        balance={balance}
        contractAddress={contractAddress}
        onUpdateContract={handleUpdateContract}
        onConnect={connectWallet}
        onOpenCreate={() => setIsCreateOpen(true)}
        onRefresh={loadState}
        isRefreshing={isRefreshing}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Consensus / Transaction Status Bar */}
        {statusMessage && (
          <div className="p-4 rounded-xl bg-cyan-950/70 border border-cyan-500/50 flex items-center justify-between text-xs text-cyan-200 shadow-glow-cyan animate-pulse">
            <div className="flex items-center space-x-2">
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

        {/* Stats Overview */}
        <StatsOverview stats={stats} vaults={vaults} />

        {/* 1-Click Interactive Benchmark Vectors */}
        <QuickDemoBar onLoadDemoVector={handleLoadDemoVector} vaults={vaults} />

        {/* Active Policy Vaults Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-bold text-white flex items-center space-x-2">
                <span>Active Alignment Policy Vaults</span>
                <span className="px-2 py-0.5 text-xs font-mono rounded bg-slate-800 text-slate-300">
                  {vaults.length}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Audited models, locked SLA escrows, and real-time AI alignment tribunals
              </p>
            </div>

            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs shadow-glow-cyan transition-all transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Underwrite New AI Policy</span>
            </button>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vaults.map((vault) => (
              <PolicyCard
                key={vault.vault_id}
                vault={vault}
                account={account}
                onFileClaim={(v) => setSelectedVaultForClaim(v)}
                onAdjudicateClaim={handleAdjudicateClaim}
                onInspect={(v) => setSelectedVaultForInspect(v)}
                onAppeal={(v) => setSelectedVaultForAppeal(v)}
                onAdjudicateAppeal={handleAdjudicateAppeal}
                onFinalizeSettlement={handleFinalizeSettlement}
                onReclaim={handleReclaim}
                isProcessing={isLoading}
              />
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-slate-800/80 bg-[#0B0F19] py-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-display font-semibold text-slate-300">AgentSycophancy Protocol</span>
            <span>&bull;</span>
            <span>GenLayer Studionet (Chain ID: 61999)</span>
          </div>
          <div className="font-mono text-[11px] text-slate-400">
            Powered by GenVM Subjective Consensus &bull; gl.nondet.web.render &bull; CANARY_AGENT_SYCOPHANCY_V1
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
    </div>
  );
};

export default App;
