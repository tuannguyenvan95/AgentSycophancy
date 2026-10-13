import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Download, Copy, Check, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { fetchAlignmentCertificateSvg } from '../config/genlayer';

interface HolographicCertificateModalProps {
  isOpen: boolean;
  vaultId: string | null;
  modelId: string;
  contractAddress: string;
  onClose: () => void;
}

export const HolographicCertificateModal: React.FC<HolographicCertificateModalProps> = ({
  isOpen,
  vaultId,
  modelId,
  contractAddress,
  onClose,
}) => {
  const [svgContent, setSvgContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !vaultId) {
      setSvgContent('');
      setError(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    fetchAlignmentCertificateSvg(contractAddress, vaultId)
      .then((svg) => {
        if (!isMounted) return;
        if (svg && svg.includes('<svg')) {
          setSvgContent(svg);
        } else {
          setError('Could not retrieve SVG verdict credential from on-chain memory.');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Error fetching SVG:', err);
        setError(err.message || 'Error querying GenVM memory for SVG credential.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, vaultId, contractAddress]);

  if (!isOpen || !vaultId) return null;

  const handleCopySvg = () => {
    if (!svgContent) return;
    navigator.clipboard.writeText(svgContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSvg = () => {
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `AgentSycophancy_SLA_Verdict_Vault_${vaultId}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-hidden rounded-3xl bg-[#090D16] border border-cyan-500/50 shadow-2xl flex flex-col">
        {/* Glow Header */}
        <div className="p-6 border-b border-slate-800/80 bg-gradient-to-r from-[#0F172A] via-[#151C2C] to-[#0F172A] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 shadow-glow-cyan">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-display text-lg font-bold text-white tracking-wide">
                  On-Chain Holographic SLA Credential
                </h3>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-cyan-950 border border-cyan-800 text-cyan-300">
                  Vault #{vaultId}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Model: <span className="text-slate-200">{modelId}</span> | Generated dynamically by GenVM smart contract
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center justify-center min-h-[420px] bg-[#070A12]/90">
          {isLoading ? (
            <div className="flex flex-col items-center space-y-4 py-16 text-center">
              <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
              <div className="space-y-1 font-mono">
                <p className="text-sm font-bold text-slate-200">Extracting Vector SVG from GenLayer GenVM...</p>
                <p className="text-xs text-slate-500">Querying get_alignment_certificate_svg({vaultId}) on Studionet</p>
              </div>
            </div>
          ) : error ? (
            <div className="p-6 rounded-2xl bg-rose-950/30 border border-rose-500/40 text-center max-w-md space-y-3">
              <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
              <p className="text-sm text-rose-200 font-mono">{error}</p>
            </div>
          ) : svgContent ? (
            <div className="w-full flex flex-col items-center space-y-4">
              {/* Rendered SVG container with holographic glow border */}
              <div
                className="w-full max-w-3xl rounded-2xl overflow-hidden border border-cyan-500/40 shadow-2xl p-1 bg-black/40 hover:border-cyan-400 transition-all"
                dangerouslySetInnerHTML={{ __html: svgContent }}
              />
              <div className="text-[11px] font-mono text-slate-400 flex items-center space-x-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Pure vector on-chain tokenized credential. Zero IPFS or Web2 hosting dependency.</span>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-800 bg-[#0B0F19] flex items-center justify-between">
          <div className="text-xs font-mono text-slate-500">
            Chain ID: 61999 (Studionet)
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleCopySvg}
              disabled={!svgContent}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-semibold transition-colors disabled:opacity-40"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied SVG Raw!' : 'Copy Raw SVG'}</span>
            </button>

            <button
              onClick={handleDownloadSvg}
              disabled={!svgContent}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-mono font-bold shadow-md transition-colors disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .SVG</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
