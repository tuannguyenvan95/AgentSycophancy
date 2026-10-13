/**
 * Utility functions for AgentSycophancy UI
 */

export function shortenAddress(address: string, chars = 4): string {
  if (!address || address === '0x0000000000000000000000000000000000000000') {
    return '0x0000...0000';
  }
  const clean = address.trim();
  if (clean.length < 10) return clean;
  return `${clean.slice(0, chars + 2)}...${clean.slice(-chars)}`;
}

export function shortenHash(hash: string, chars = 6): string {
  if (!hash) return 'None';
  const clean = hash.trim();
  if (clean.length <= chars * 2) return clean;
  return `${clean.slice(0, chars)}...${clean.slice(-chars)}`;
}

export function formatGen(weiValue: string | number | bigint): string {
  try {
    const rawStr = weiValue.toString();
    if (!rawStr || rawStr === '0') return '0.000';

    // Handle hex strings
    let big: bigint;
    if (typeof weiValue === 'string' && weiValue.startsWith('0x')) {
      big = BigInt(weiValue);
    } else {
      big = BigInt(rawStr);
    }

    if (big === 0n) return '0.000';

    const decimals = 18n;
    const factor = 10n ** decimals;
    const integerPart = big / factor;
    const remainder = big % factor;

    // Pad remainder to 18 digits
    const remStr = remainder.toString().padStart(18, '0');
    const formattedDec = remStr.slice(0, 4); // 4 decimal places

    return `${integerPart.toString()}.${formattedDec}`;
  } catch (e) {
    return '0.000';
  }
}

export function parseGenToWei(genAmount: string | number): bigint {
  try {
    const str = genAmount.toString().trim();
    if (!str || str === '0') return 0n;

    const parts = str.split('.');
    const integerPart = BigInt(parts[0] || '0');
    let fractionalPart = parts[1] || '';

    // Pad or truncate to 18 decimals
    if (fractionalPart.length > 18) {
      fractionalPart = fractionalPart.slice(0, 18);
    } else {
      fractionalPart = fractionalPart.padEnd(18, '0');
    }

    const decimalsFactor = 10n ** 18n;
    return integerPart * decimalsFactor + BigInt(fractionalPart);
  } catch (e) {
    return 0n;
  }
}

export function formatTimestamp(timestamp: string | number): string {
  try {
    const num = Number(timestamp);
    if (!num || num === 0) return 'N/A';
    // If in seconds (standard unix)
    const ms = num < 10000000000 ? num * 1000 : num;
    const date = new Date(ms);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch (e) {
    return 'N/A';
  }
}

export const STATUS_MAP: Record<number, { label: string; color: string; border: string; bg: string }> = {
  0: { label: 'POLICY ACTIVE', color: 'text-cyan-400', border: 'border-cyan-500/30', bg: 'bg-cyan-500/10' },
  1: { label: 'CLAIM FILED', color: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-500/10' },
  2: { label: 'COOLING-OFF (72s)', color: 'text-purple-400', border: 'border-purple-500/30', bg: 'bg-purple-500/10' },
  3: { label: 'SLASHED 100%', color: 'text-rose-400', border: 'border-rose-500/30', bg: 'bg-rose-500/10' },
  4: { label: 'PARTIAL PENALTY (40/60)', color: 'text-amber-300', border: 'border-amber-500/30', bg: 'bg-amber-500/10' },
  5: { label: 'OBJECTIVE CLEAN', color: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10' },
  6: { label: 'DISPUTED (APPEAL)', color: 'text-fuchsia-400', border: 'border-fuchsia-500/30', bg: 'bg-fuchsia-500/10' },
  7: { label: 'EXPIRED RECLAIMED', color: 'text-slate-400', border: 'border-slate-500/30', bg: 'bg-slate-500/10' },
};

export function getStatusBadge(status: number) {
  return STATUS_MAP[status] || {
    label: `STATUS ${status}`,
    color: 'text-slate-400',
    border: 'border-slate-500/30',
    bg: 'bg-slate-500/10',
  };
}

export function getVerdictBadge(verdict: string) {
  const v = (verdict || 'PENDING').toUpperCase();
  switch (v) {
    case 'CRITICAL_HALLUCINATION_SLASH':
    case 'APPEAL_UPHELD_SLASH':
      return {
        label: 'CRITICAL HALLUCINATION (100% SLASH)',
        color: 'text-red-400',
        bg: 'bg-red-500/15',
        border: 'border-red-500/40',
        badge: 'SLASHED',
      };
    case 'PARTIAL_SYCOPHANCY_PENALTY':
    case 'APPEAL_UPHELD_PARTIAL':
      return {
        label: 'PARTIAL SYCOPHANCY (40% CLIENT / 60% PROVIDER)',
        color: 'text-amber-400',
        bg: 'bg-amber-500/15',
        border: 'border-amber-500/40',
        badge: 'PARTIAL',
      };
    case 'OBJECTIVE_ALIGNMENT_CLEAN':
    case 'APPEAL_UPHELD_CLEAN':
      return {
        label: 'OBJECTIVE ALIGNMENT CLEAN',
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/15',
        border: 'border-emerald-500/40',
        badge: 'CLEAN',
      };
    case 'APPEAL_DISMISSED':
      return {
        label: 'APPEAL DISMISSED (BOND FORFEITED)',
        color: 'text-purple-400',
        bg: 'bg-purple-500/15',
        border: 'border-purple-500/40',
        badge: 'UPHELD',
      };
    default:
      return {
        label: verdict || 'PENDING EVALUATION',
        color: 'text-slate-300',
        bg: 'bg-slate-700/20',
        border: 'border-slate-600/30',
        badge: 'PENDING',
      };
  }
}
