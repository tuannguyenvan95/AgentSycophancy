# 📝 Changelog: AgentSycophancy Protocol

All notable changes to the AgentSycophancy protocol are documented in this file in accordance with Semantic Versioning (`SemVer`).

---

## [v4.0.0] - 2026-10-13: Production Radar Console & Complete Verification Suite
### Added
- **AI Safety & Alignment Radar Console Frontend:**
  - Modern React 18 + Vite + TypeScript + TailwindCSS + `genlayer-js` + `lucide-react` dApp.
  - Interactive radar telemetry with Space Grotesk typography and JetBrains Mono code metrics.
  - Native MetaMask integration with automated Studionet chain-switch helper (Chain ID `61999` / `0xF22F`).
  - 1-Click Interactive Benchmark Vectors: Immediate testing of Critical Hallucination Slash, Partial Sycophancy Penalty, and Objective Alignment Clean.
- **Comprehensive Automated Test Suite:**
  - 14/14 automated pytest and gltest suites passed with 100% pass rate.
  - Added `test_adversarial_safety.py` covering self-insurance rejection, zero-value deposit rejection, appeal bond underpayment, and double-settlement immunity.
  - Added `test_lifecycle_and_verdicts.py` covering partial sycophancy payout (40/60 split), clean dismissal, appeal overturns, and expiry reclaims.
- **Architectural & Security Documentation:**
  - `ARCHITECTURE.md`: Complete state machine, sequence flows, and GenVM BFT consensus rubric.
  - `SECURITY.md`: Threat model, prompt injection neutralization, and solvency proofs.

---

## [v3.0.0] - 2026-10-11: Supreme Alignment Appellate Tribunal & Cooling-Off Windows
### Added
- **24-Block (~72s) Dispute Cooling-Off Window:**
  - Realized through authentic GenVM execution timestamps (`_get_current_timestamp()`).
  - Immune to block inflation and spamming attacks.
- **Supreme Alignment Appellate Tribunal (`adjudicate_appeal`):**
  - Allows either Client or Provider to appeal within cooling-off window.
  - Requires mandatory 10% staked dispute bond to eliminate frivolous appeals.
  - Permanently binds supplemental academic benchmarks or forensic audit logs.

---

## [v2.0.0] - 2026-10-08: Non-Deterministic BFT Consensus & Canary Defense
### Added
- **Non-Deterministic Web Scraping (`gl.nondet.web.render`):**
  - Scrapes conversation dialogue logs and ground-truth references directly on-chain.
- **Canary Token Defense (`CANARY_AGENT_SYCOPHANCY_V1`):**
  - Neutralizes adversarial prompt injections attempting to bypass alignment rubrics.
- **Checks-Effects-Interactions Pattern:**
  - Resetting `escrow_amount = bigint(0)` and `dispute_bond = bigint(0)` before external native transfers.

---

## [v1.0.0] - 2026-10-01: Protocol Inception & Base Insurance Vault
### Added
- Initial intelligent contract specification for `PolicyVault`.
- Underwriting alignment escrow with native GEN lockup (`create_policy_vault`).
- Client complaint filing mechanism (`file_misalignment_claim`).
