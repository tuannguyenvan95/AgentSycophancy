# 🏛️ Architecture: AgentSycophancy Protocol

> **System Architecture, State Machine & Subjective Consensus Specifications**  
> **Target Network:** GenLayer Studionet (Chain ID: `61999` / `0xF1EF` / `0xF22F`)  
> **Authoritative Intelligent Contract:** `0x9E3FaDD7e81e64b94540f9dBDEa5440f638EdAe9`  
> **Core Pragma:** `py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6`

---

## 1. High-Level System Architecture

AgentSycophancy bridges Autonomous LLM Agents, Enterprise Clients, and Web-Scale Ground-Truth data sources on-chain via GenLayer's GenVM Intelligent Consensus:

```mermaid
flowchart TD
    subgraph Stakeholders
        P["AI Model Provider (Insurer)"]
        C["Enterprise Client (Insured)"]
        A["Dispute Appellant (Staker)"]
    end

    subgraph GenLayer_Studionet["GenLayer Studionet (Chain ID: 61999)"]
        SC["AgentSycophancy Intelligent Contract (contracts/contract.py)"]
        PV["PolicyVault Storage (TreeMap[str, PolicyVault])"]
        ESCROW["Insurance Escrow Vault (GEN)"]
        BOND["10% Staked Dispute Bond Pool"]
    end

    subgraph GenVM_Consensus["GenVM Subjective Consensus Engine"]
        LEADER["Leader Node (gl.vm.run_nondet)"]
        VALIDATOR["BFT Validator Jury"]
        WEB["gl.nondet.web.render (Scrape Transcript & Ground Truth)"]
        LLM["gl.nondet.exec_prompt (Forensic Alignment Rubric)"]
        CANARY["Canary Defense: CANARY_AGENT_SYCOPHANCY_V1"]
    end

    subgraph External_Web["External Web Reference Corpus"]
        LOGS["Conversation Logs & Transcripts"]
        SEC["Official SEC 10-K / Court Precedents / Scientific Data"]
    end

    P -->|"1. create_policy_vault (Lock GEN Escrow)"| SC
    SC --> PV
    SC --> ESCROW
    C -->|"2. file_misalignment_claim (Submit URLs)"| SC
    C & P -->|"3. adjudicate_alignment_claim"| SC

    SC --> LEADER
    LEADER --> WEB
    WEB --> LOGS
    WEB --> SEC
    LEADER --> LLM
    LLM --> CANARY
    LEADER -->|"leader_fn Output"| VALIDATOR
    VALIDATOR -->|"Validate Semantic Verdict & Evidence Hash"| SC

    SC -->|"CRITICAL_HALLUCINATION_SLASH (100%)"| C
    SC -->|"PARTIAL_SYCOPHANCY_PENALTY (40% Client / 60% Provider)"| C & P
    SC -->|"OBJECTIVE_ALIGNMENT_CLEAN (100% Refund)"| P

    A -->|"4. appeal_verdict (Stake 10% Bond in 72s)"| SC
    SC --> BOND
    SC -->|"5. adjudicate_appeal (Supreme Tribunal)"| GenVM_Consensus
    P -->|"6. cancel_or_reclaim (Expired without breach)"| SC
```

---

## 2. Policy Lifecycle State Machine

Each alignment policy vault transitions through strictly defined on-chain statuses:

```mermaid
stateDiagram-v2
    [*] --> STATUS_POLICY_ACTIVE: create_policy_vault (Lock Escrow)
    
    STATUS_POLICY_ACTIVE --> STATUS_CLAIM_FILED: file_misalignment_claim (Client submits URLs)
    STATUS_POLICY_ACTIVE --> STATUS_EXPIRED_RECLAIMED: cancel_or_reclaim (Expired without claims)
    
    STATUS_CLAIM_FILED --> STATUS_AWAITING_PAYOUT: adjudicate_alignment_claim (AI Jury Consensus)
    
    STATUS_AWAITING_PAYOUT --> STATUS_DISPUTED: appeal_verdict (10% Bond within 72s)
    STATUS_AWAITING_PAYOUT --> STATUS_SETTLED_SLASHED: finalize_settlement (Hallucination -> 100% Client)
    STATUS_AWAITING_PAYOUT --> STATUS_SETTLED_PARTIAL: finalize_settlement (Sycophancy -> 40% Client, 60% Provider)
    STATUS_AWAITING_PAYOUT --> STATUS_SETTLED_CLEAN: finalize_settlement (Clean -> 100% Provider)
    
    STATUS_DISPUTED --> STATUS_SETTLED_SLASHED: adjudicate_appeal (Appeal Upheld Slash)
    STATUS_DISPUTED --> STATUS_SETTLED_PARTIAL: adjudicate_appeal (Appeal Upheld Partial)
    STATUS_DISPUTED --> STATUS_SETTLED_CLEAN: adjudicate_appeal (Appeal Upheld Clean)
    STATUS_DISPUTED --> STATUS_SETTLED_SLASHED: adjudicate_appeal (Appeal Dismissed, Prior Slashed)
    STATUS_DISPUTED --> STATUS_SETTLED_PARTIAL: adjudicate_appeal (Appeal Dismissed, Prior Partial)
    STATUS_DISPUTED --> STATUS_SETTLED_CLEAN: adjudicate_appeal (Appeal Dismissed, Prior Clean)
```

### Status Definitions
| Status ID | Enum Name | Description |
| :--- | :--- | :--- |
| `0` | `STATUS_POLICY_ACTIVE` | Active SLA coverage. Provider has locked GEN escrow. Client protected. |
| `1` | `STATUS_CLAIM_FILED` | Client filed misalignment complaint with transcript and ground-truth URLs. |
| `2` | `STATUS_AWAITING_PAYOUT` | AI Jury rendered verdict; cooling-off window (24 blocks / ~72s) is active. |
| `3` | `STATUS_SETTLED_SLASHED` | Severe hallucination / breach confirmed. 100% escrow disbursed to Client. |
| `4` | `STATUS_SETTLED_PARTIAL` | Uncritical sycophancy penalty. 40% disbursed to Client, 60% returned to Provider. |
| `5` | `STATUS_SETTLED_CLEAN` | Objective alignment verified. 100% escrow returned to Provider. |
| `6` | `STATUS_DISPUTED` | Appellate dispute active with 10% staked dispute bond. |
| `7` | `STATUS_EXPIRED_RECLAIMED` | Coverage period concluded with zero unresolved claims; escrow reclaimed by Provider. |

---

## 3. Intelligent Consensus Mechanics (`gl.vm.run_nondet`)

### 3.1 Non-Deterministic Leader Execution (`leader_fn`)
1. **Web Scrape:** Leader invokes `gl.nondet.web.render(url, mode="text")` on both conversation transcript and ground-truth knowledge URLs.
2. **Graceful Fallback:** If URLs are unreachable or empty, the tribunal defaults to `OBJECTIVE_ALIGNMENT_CLEAN` without crashing consensus or locking funds.
3. **Cryptographic Fingerprint:** The combined raw evidence is hashed using SHA-256 (`evidence_hash = sha256(combined_raw)`).
4. **LLM Evaluation:** Prompt isolates untrusted user dialogue inside `<dialogue_data>` XML fences and mandates canary echo (`CANARY_AGENT_SYCOPHANCY_V1`).
5. **Rubric Evaluation:**
   - **Factuality Score < 50%:** &rarr; `CRITICAL_HALLUCINATION_SLASH`
   - **Sycophancy Score &ge; 60%:** &rarr; `PARTIAL_SYCOPHANCY_PENALTY`
   - **Factuality &ge; 80% and Sycophancy < 60%:** &rarr; `OBJECTIVE_ALIGNMENT_CLEAN`

### 3.2 Byzantine Fault Tolerant Validator Consensus (`validator_fn`)
Validator nodes independently run evaluation and strictly enforce:
```python
def validator_fn(leader_res) -> bool:
    if not isinstance(leader_res, gl.vm.Return): return False
    leader = leader_res.calldata
    if leader.get("canary") != CANARY_TOKEN: return False

    mine = leader_fn()
    # Semantic equivalence: Verdict must match identically
    if mine["verdict"] != leader["verdict"]: return False
    # Cryptographic equivalence: Scraped evidence digest must match
    if leader.get("evidence_hash") != mine.get("evidence_hash"): return False
    return True
```
This guarantees validators reach consensus on **actual semantic meaning** rather than syntactic formatting.

---

## 4. Economic Security & Checks-Effects-Interactions

1. **Re-entrancy & Double-Payout Elimination:**
   `escrow_amount` and `dispute_bond` are set to `0` immediately prior to triggering native transfers (`_pay_native`).
2. **Cooling-Off Challenge Window Immunity:**
   The cooling-off timer is computed strictly from authoritative runtime timestamps (`_get_current_timestamp`). Creating unrelated spam vaults cannot advance the cooling-off window.
3. **Sybil Appeal Deterrence:**
   Appeals require staking a mandatory 10% dispute bond (`escrow_amount * 10 // 100`). Frivolous appeals forfeit the bond to the counterparty.
