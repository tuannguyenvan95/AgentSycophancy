import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { formatGen } from '../utils/formatters';

export const STUDIONET_CHAIN_ID = 61999;
export const STUDIONET_CHAIN_ID_HEX = '0xf22f'; // 61999 in hex (or 0xF1EF)
export const STUDIONET_RPC_URL = 'https://studio.genlayer.com/api';
export const STUDIO_URL = 'https://studio.genlayer.com';

// Authoritative Intelligent Contract deployed on GenLayer Studionet
export const DEFAULT_CONTRACT_ADDRESS = '0x9E3FaDD7e81e64b94540f9dBDEa5440f638EdAe9';

export function getSavedContractAddress(): string {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('agentsycophancy_contract_address');
      if (
        stored &&
        stored.trim().startsWith('0x') &&
        stored.trim().length === 42 &&
        stored.trim().toLowerCase() !== '0x8bf0c434f9a0f507f54b333e6f86c208c0ffbe59'
      ) {
        return stored.trim();
      }
    } catch (e) {
      // ignore
    }
  }
  return DEFAULT_CONTRACT_ADDRESS;
}

export function saveContractAddress(address: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('agentsycophancy_contract_address', address.trim());
  }
}

/**
 * Fetch real on-chain GEN balance directly from Studionet RPC endpoint
 */
export async function fetchStudionetBalance(address: string): Promise<string> {
  if (!address) return '0.000';

  try {
    const res = await fetch(STUDIONET_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getBalance',
        params: [address, 'latest'],
        id: Date.now(),
      }),
    });
    const json = await res.json();
    if (json && json.result !== undefined && json.result !== null) {
      return formatGen(json.result);
    }
  } catch (err) {
    console.warn('Direct Studionet RPC eth_getBalance error:', err);
  }

  if (typeof window !== 'undefined' && (window as any).ethereum) {
    try {
      const balHex = await (window as any).ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest'],
      });
      if (balHex) {
        return formatGen(balHex);
      }
    } catch (e) {
      console.warn('MetaMask eth_getBalance fallback error:', e);
    }
  }

  return '0.000';
}

export const STATUS_POLICY_ACTIVE = 0;
export const STATUS_CLAIM_FILED = 1;
export const STATUS_AWAITING_PAYOUT = 2;
export const STATUS_SETTLED_SLASHED = 3;
export const STATUS_SETTLED_PARTIAL = 4;
export const STATUS_SETTLED_CLEAN = 5;
export const STATUS_DISPUTED = 6;
export const STATUS_EXPIRED_RECLAIMED = 7;
export const STATUS_FROZEN_QUARANTINE = 8;

export interface PolicyVaultData {
  vault_id: string;
  provider: string;
  client: string;
  dispute_initiator?: string;
  escrow_amount: string;
  dispute_bond?: string;
  agent_model_id: string;
  transcript_url: string;
  ground_truth_url: string;
  evidence_hash?: string;
  status: number; // 0..8
  verdict: string;
  reason: string;
  confidence: number;
  sycophancy_score: number;
  factuality_score: number;
  harm_index?: number;
  created_at_time?: string;
  expires_at_time?: string;
  audit_completed_time?: string;
  supplemental_evidence_url?: string;
  appeal_prior_verdict?: string;
  // Aliases for compatibility
  created_at_block?: string;
  expires_at_block?: string;
  audit_completed_block?: string;
}


export interface ProtocolStats {
  total_vaults: number;
  total_insurance_locked: string;
  total_claims_settled: number;
  owner?: string;
}

/**
 * Get GenLayer client configured with Studionet
 */
export function getGenLayerClient(accountAddress?: string) {
  const config: any = {
    chain: studionet,
    endpoint: STUDIONET_RPC_URL,
  };

  if (typeof window !== 'undefined' && (window as any).ethereum && accountAddress) {
    config.provider = (window as any).ethereum;
    config.account = accountAddress as `0x${string}`;
  }

  return createClient(config);
}

/**
 * Switch or add GenLayer Studionet chain in MetaMask (Chain ID: 61999)
 */
export async function ensureStudionet(): Promise<boolean> {
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    throw new Error('MetaMask is not installed. Please install MetaMask to use AgentSycophancy.');
  }

  const ethereum = (window as any).ethereum;

  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: STUDIONET_CHAIN_ID_HEX }],
    });
    return true;
  } catch (switchError: any) {
    if (
      switchError.code === 4902 ||
      switchError?.data?.originalError?.code === 4902 ||
      switchError?.message?.includes('Unrecognized chain') ||
      switchError?.message?.includes('wallet_addEthereumChain')
    ) {
      try {
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: STUDIONET_CHAIN_ID_HEX,
              chainName: 'GenLayer Studionet',
              nativeCurrency: {
                name: 'GEN',
                symbol: 'GEN',
                decimals: 18,
              },
              rpcUrls: [STUDIONET_RPC_URL],
              blockExplorerUrls: ['https://explorer-studio.genlayer.com'],
            },
          ],
        });
        return true;
      } catch (addError) {
        console.error('Failed to add Studionet chain to MetaMask:', addError);
        throw addError;
      }
    }
    console.error('Failed to switch to Studionet chain:', switchError);
    throw switchError;
  }
}

/**
 * Fetch aggregated protocol statistics
 */
export async function fetchStats(contractAddress: string): Promise<ProtocolStats> {
  if (!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
    return {
      total_vaults: 0,
      total_insurance_locked: '0',
      total_claims_settled: 0,
    };
  }

  try {
    const client = getGenLayerClient();
    const raw = await client.readContract({
      address: contractAddress as `0x${string}`,
      functionName: 'get_stats',
      args: [],
    });

    if (typeof raw === 'string') {
      return JSON.parse(raw);
    }
    return raw as unknown as ProtocolStats;
  } catch (err) {
    console.warn('fetchStats error:', err);
    return {
      total_vaults: 0,
      total_insurance_locked: '0',
      total_claims_settled: 0,
    };
  }
}

/**
 * Fetch all registered alignment policy vaults
 */
export async function fetchAllVaults(contractAddress: string): Promise<PolicyVaultData[]> {
  if (!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
    return [];
  }

  const client = getGenLayerClient();

  // 1. Fast path: get_all_vaults
  try {
    const rawAll = await client.readContract({
      address: contractAddress as `0x${string}`,
      functionName: 'get_all_vaults',
      args: [],
    });

    if (rawAll) {
      const parsed = typeof rawAll === 'string' ? JSON.parse(rawAll) : rawAll;
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('get_all_vaults failed, falling back to iterative get_vault:', err);
  }

  // 2. Iterative fallback
  try {
    const countRaw = await client.readContract({
      address: contractAddress as `0x${string}`,
      functionName: 'get_vault_count',
      args: [],
    });
    const count = Number(countRaw || 0);
    const vaults: PolicyVaultData[] = [];

    for (let i = 1; i <= count; i++) {
      try {
        const vRaw = await client.readContract({
          address: contractAddress as `0x${string}`,
          functionName: 'get_vault',
          args: [String(i)],
        });
        if (vRaw) {
          const v = typeof vRaw === 'string' ? JSON.parse(vRaw) : vRaw;
          vaults.push(v);
        }
      } catch (e) {
        console.warn(`Failed reading vault ${i}:`, e);
      }
    }
    return vaults;
  } catch (err) {
    console.warn('Iterative get_vault error:', err);
    return [];
  }
}

/**
 * Fetch single vault
 */
export async function fetchVault(contractAddress: string, vaultId: string): Promise<PolicyVaultData | null> {
  try {
    const client = getGenLayerClient();
    const raw = await client.readContract({
      address: contractAddress as `0x${string}`,
      functionName: 'get_vault',
      args: [vaultId],
    });
    if (!raw) return null;
    return typeof raw === 'string' ? JSON.parse(raw) : (raw as unknown as PolicyVaultData);
  } catch (e) {
    console.error(`Failed to fetch vault #${vaultId}:`, e);
    return null;
  }
}

/**
 * Fetch user's claimable disbursement balance (Pull-Payment safe pattern)
 */
export async function fetchClaimableBalance(contractAddress: string, account: string): Promise<string> {
  if (!contractAddress || !account) return '0';
  try {
    const client = getGenLayerClient();
    const raw = await client.readContract({
      address: contractAddress as `0x${string}`,
      functionName: 'get_claimable_balance',
      args: [account],
    });
    return String(raw || '0');
  } catch (err) {
    console.warn('fetchClaimableBalance error:', err);
    return '0';
  }
}

/**
 * Check if account is an authorized Curator Council member
 */
export async function checkIsCurator(contractAddress: string, account: string): Promise<boolean> {
  if (!contractAddress || !account) return false;
  try {
    const client = getGenLayerClient();
    const raw = await client.readContract({
      address: contractAddress as `0x${string}`,
      functionName: 'is_curator',
      args: [account],
    });
    return Boolean(raw);
  } catch (err) {
    console.warn('checkIsCurator error:', err);
    return false;
  }
}

/**
 * Fetch pure on-chain holographic SVG SLA verdict credential directly from GenVM memory
 */
export async function fetchAlignmentCertificateSvg(contractAddress: string, vaultId: string): Promise<string> {
  if (!contractAddress || !vaultId) return '';
  try {
    const client = getGenLayerClient();
    const raw = await client.readContract({
      address: contractAddress as `0x${string}`,
      functionName: 'get_alignment_certificate_svg',
      args: [vaultId],
    });
    return String(raw || '');
  } catch (err) {
    console.warn('fetchAlignmentCertificateSvg error:', err);
    return '';
  }
}

/**
 * Claim pending payout balance (Pull-Payment)
 */
export async function claimPayout(contractAddress: string, userAddress: string) {
  const client = getGenLayerClient(userAddress);
  return await client.writeContract({
    address: contractAddress as `0x${string}`,
    functionName: 'claim_payout',
    args: [],
    value: 0n,
  });
}

/**
 * Curator Council emergency quarantine freeze
 */
export async function emergencyQuarantineVault(contractAddress: string, userAddress: string, vaultId: string, reason: string) {
  const client = getGenLayerClient(userAddress);
  return await client.writeContract({
    address: contractAddress as `0x${string}`,
    functionName: 'emergency_quarantine_vault',
    args: [vaultId, reason],
    value: 0n,
  });
}

/**
 * Curator Council lift emergency quarantine
 * Aligned with 1-argument contract.py: lift_quarantine(vault_id: str)
 */
export async function liftQuarantine(
  contractAddress: string,
  userAddress: string,
  vaultId: string
) {
  const client = getGenLayerClient(userAddress);
  return await client.writeContract({
    address: contractAddress as `0x${string}`,
    functionName: 'lift_quarantine',
    args: [vaultId],
    value: 0n,
  });
}

/**
 * Initialize Authority: Explicitly binds owner and curator authority before public use
 */
export async function initializeAuthority(
  contractAddress: string,
  userAddress: string
) {
  const client = getGenLayerClient(userAddress);
  return await client.writeContract({
    address: contractAddress as `0x${string}`,
    functionName: 'initialize_authority',
    args: [],
    value: 0n,
  });
}


