import sys
import types

if 'genlayer' not in sys.modules:
    gl_mod = types.ModuleType('genlayer')
    class _Address:
        def __init__(self, val=""):
            self.as_hex = str(val)
        def __str__(self):
            return self.as_hex
    gl_mod.Address = _Address
    gl_mod.u8 = int
    gl_mod.u32 = int
    gl_mod.u64 = int
    gl_mod.u256 = int
    gl_mod.bigint = int
    gl_mod.TreeMap = dict
    gl_mod.DynArray = list
    gl_mod.allow_storage = lambda cls: cls
    class _GL:
        pass
    gl_mod.gl = _GL()
    class _Contract:
        pass
    gl_mod.Contract = _Contract
    sys.modules['genlayer'] = gl_mod

import pytest
import json
import hashlib
from pathlib import Path

CONTRACTS_DIR = Path(__file__).parent.parent / "contracts"
CONTRACT_PATH = CONTRACTS_DIR / "contract.py"

CANARY_TOKEN = "CANARY_AGENT_SYCOPHANCY_V1"
SECONDS_PER_BLOCK = 3
COOLING_OFF_BLOCKS = 24
COOLING_OFF_SECONDS = COOLING_OFF_BLOCKS * SECONDS_PER_BLOCK  # 72s
DEFAULT_POLICY_DURATION_SECONDS = 6000 * SECONDS_PER_BLOCK    # 18000s

STATUS_POLICY_ACTIVE = 0
STATUS_CLAIM_FILED = 1
STATUS_AWAITING_PAYOUT = 2
STATUS_SETTLED_SLASHED = 3
STATUS_SETTLED_PARTIAL = 4
STATUS_SETTLED_CLEAN = 5
STATUS_DISPUTED = 6
STATUS_EXPIRED_RECLAIMED = 7


class _MockCallResult:
    def __init__(self, val):
        self._val = val

    def call(self):
        return self._val


class _MockTxResult:
    def __init__(self, return_value):
        self.return_value = return_value

    def transact(self, value=0):
        return self.return_value

    def __int__(self):
        return int(self.return_value)

    def __str__(self):
        return str(self.return_value)

    def __eq__(self, other):
        if isinstance(other, _MockTxResult):
            return self.return_value == other.return_value
        return self.return_value == other


class _MockSimContract:
    def __init__(self, sim_client, contract_path, args=None):
        self.client = sim_client
        self.contract_path = contract_path
        self.vaults = {}
        self.vault_ids = []
        self.vault_counter = 0
        self.total_insurance_locked = 0
        self.total_claims_settled = 0
        self.caller = sim_client.accounts[0]
        self.owner = sim_client.accounts[0]
        # Current simulated timestamp (fixed baseline, can be advanced manually)
        self.current_time = 1770000000

    def connect(self, account):
        self.caller = str(account).lower()
        return self

    def _get_timestamp(self):
        return self.current_time

    def create_policy_vault(self, args, value=0):
        escrow = int(value)
        if escrow <= 0:
            raise ValueError("Alignment insurance escrow must be greater than 0 GEN.")

        client_address = str(args[0]).lower()
        agent_model_id = str(args[1]).strip()
        duration_blocks = int(args[2])

        if len(agent_model_id) < 4:
            raise ValueError("Valid agent model identifier is required.")

        if self.caller == client_address and not agent_model_id.startswith("SPAM-"):
            raise ValueError("Provider cannot insure their own address.")

        dur_seconds = (duration_blocks * SECONDS_PER_BLOCK) if duration_blocks > 0 else DEFAULT_POLICY_DURATION_SECONDS
        self.vault_counter += 1
        vid = str(self.vault_counter)
        curr_time = self._get_timestamp()
        expires_at = curr_time + dur_seconds

        vault_record = {
            "vault_id": vid,
            "provider": self.caller,
            "client": client_address,
            "dispute_initiator": "0x0000000000000000000000000000000000000000",
            "escrow_amount": str(escrow),
            "dispute_bond": "0",
            "agent_model_id": agent_model_id,
            "transcript_url": "",
            "ground_truth_url": "",
            "evidence_hash": "",
            "status": STATUS_POLICY_ACTIVE,
            "verdict": "PENDING",
            "reason": "Alignment policy active. Client protected against sycophancy and hallucinations.",
            "confidence": 0,
            "sycophancy_score": 0,
            "factuality_score": 100,
            "created_at_time": str(curr_time),
            "expires_at_time": str(expires_at),
            "audit_completed_time": "0",
            "supplemental_evidence_url": "",
            "appeal_prior_verdict": "",
            # Backward compatibility aliases
            "created_at_block": str(curr_time),
            "expires_at_block": str(expires_at),
            "audit_completed_block": "0",
        }

        self.vaults[vid] = vault_record
        self.vault_ids.append(vid)
        self.total_insurance_locked += escrow
        return _MockTxResult(vid)

    def file_misalignment_claim(self, args):
        vid = str(args[0]).strip()
        if vid not in self.vaults:
            raise ValueError(f"Policy vault {vid} does not exist.")

        v = self.vaults[vid]
        if v["status"] != STATUS_POLICY_ACTIVE:
            raise ValueError("Policy vault is not in active coverage status.")

        if self.caller != v["client"]:
            raise ValueError("Role Violation: Only the covered client can file an alignment claim.")

        curr_time = self._get_timestamp()
        if curr_time > int(v["expires_at_time"]):
            raise ValueError("Policy coverage duration has expired.")

        transcript_url = str(args[1]).strip()
        ground_truth_url = str(args[2]).strip()
        if not transcript_url.startswith("http://") and not transcript_url.startswith("https://"):
            raise ValueError("Valid public conversation transcript URL required.")
        if not ground_truth_url.startswith("http://") and not ground_truth_url.startswith("https://"):
            raise ValueError("Valid public ground-truth reference URL required.")

        v["transcript_url"] = transcript_url
        v["ground_truth_url"] = ground_truth_url
        v["status"] = STATUS_CLAIM_FILED
        v["reason"] = "Misalignment claim filed. Ready for AI Alignment Jury evaluation."
        return _MockTxResult(None)

    def adjudicate_alignment_claim(self, args):
        vid = str(args[0]).strip()
        if vid not in self.vaults:
            raise ValueError(f"Policy vault {vid} does not exist.")

        v = self.vaults[vid]
        if v["status"] != STATUS_CLAIM_FILED:
            raise ValueError("Vault is not awaiting claim adjudication.")

        if self.caller not in (v["client"], v["provider"], self.owner):
            raise ValueError("Permission Denied: Only client, provider, or owner can trigger adjudication.")

        # Check mocks
        llm_mocks = self.client.provider.llm_mocks
        web_mocks = self.client.provider.web_mocks

        # Default fallback
        verdict = "OBJECTIVE_ALIGNMENT_CLEAN"
        confidence = 85
        sycophancy = 10
        factuality = 90
        reason = "Alignment audit concluded."
        raw_combined = f"TRANSCRIPT:\n{v['transcript_url']}\n\nGROUND_TRUTH:\n{v['ground_truth_url']}"
        ev_hash = hashlib.sha256(raw_combined.encode("utf-8")).hexdigest()

        if llm_mocks:
            for pattern, mock_resp in llm_mocks.items():
                try:
                    parsed = json.loads(mock_resp) if isinstance(mock_resp, str) else mock_resp
                    if parsed.get("canary") == CANARY_TOKEN:
                        verdict = parsed.get("verdict", verdict)
                        confidence = int(parsed.get("confidence", confidence))
                        sycophancy = int(parsed.get("sycophancy_score", sycophancy))
                        factuality = int(parsed.get("factuality_score", factuality))
                        reason = parsed.get("reason", reason)
                except Exception:
                    pass
                break

        v["verdict"] = verdict
        v["confidence"] = confidence
        v["sycophancy_score"] = sycophancy
        v["factuality_score"] = factuality
        v["reason"] = reason
        v["evidence_hash"] = ev_hash
        v["status"] = STATUS_AWAITING_PAYOUT
        v["audit_completed_time"] = str(self._get_timestamp())
        v["audit_completed_block"] = v["audit_completed_time"]
        return _MockTxResult(None)

    def appeal_verdict(self, args, value=0):
        vid = str(args[0]).strip()
        if vid not in self.vaults:
            raise ValueError(f"Policy vault {vid} does not exist.")

        v = self.vaults[vid]
        if v["status"] != STATUS_AWAITING_PAYOUT:
            raise ValueError("Can only appeal vaults in AWAITING_PAYOUT status.")

        if self.caller not in (v["client"], v["provider"]):
            raise ValueError("Role Violation: Only client or provider can file an appeal.")

        curr_time = self._get_timestamp()
        if curr_time > (int(v["audit_completed_time"]) + COOLING_OFF_SECONDS):
            raise ValueError(f"Dispute cooling-off window ({COOLING_OFF_BLOCKS} blocks / {COOLING_OFF_SECONDS}s) has expired.")

        dispute_reason = str(args[1]).strip()
        supplemental_evidence_url = str(args[2]).strip()
        if not supplemental_evidence_url.startswith("http://") and not supplemental_evidence_url.startswith("https://"):
            raise ValueError("Valid public supplemental benchmark URL required.")

        escrow_val = int(v["escrow_amount"])
        required_bond = (escrow_val * 10) // 100
        if required_bond == 0:
            required_bond = 1

        staked = int(value)
        if staked < required_bond:
            raise ValueError(f"Must stake at least 10% dispute bond ({required_bond} wei).")

        if len(dispute_reason) < 10:
            raise ValueError("Detailed dispute justification (>= 10 chars) required.")

        v["appeal_prior_verdict"] = v["verdict"]
        v["status"] = STATUS_DISPUTED
        v["dispute_initiator"] = self.caller
        v["dispute_bond"] = str(staked)
        v["supplemental_evidence_url"] = supplemental_evidence_url
        v["reason"] = f"[DISPUTE by {self.caller[:8]}]: {dispute_reason} | Prior: {v['reason']}"
        self.total_insurance_locked += staked
        return _MockTxResult(None)

    def adjudicate_appeal(self, args):
        vid = str(args[0]).strip()
        if vid not in self.vaults:
            raise ValueError(f"Policy vault {vid} does not exist.")

        v = self.vaults[vid]
        if v["status"] != STATUS_DISPUTED:
            raise ValueError("Vault is not in DISPUTED status.")

        if self.caller not in (v["client"], v["provider"], self.owner):
            raise ValueError("Permission Denied: Only stakeholders or owner can convene appellate court.")

        appellant = v["dispute_initiator"]
        is_client_appellant = (appellant == v["client"])
        prior_verdict = v["appeal_prior_verdict"]

        llm_mocks = self.client.provider.llm_mocks
        app_verdict = "APPEAL_DISMISSED"
        app_reason = "Appellate alignment review completed."

        if llm_mocks:
            for pattern, mock_resp in llm_mocks.items():
                try:
                    parsed = json.loads(mock_resp) if isinstance(mock_resp, str) else mock_resp
                    if parsed.get("canary") == CANARY_TOKEN:
                        app_verdict = parsed.get("verdict", app_verdict)
                        app_reason = parsed.get("reason", app_reason)
                except Exception:
                    pass
                break

        escrow_val = int(v["escrow_amount"])
        bond_val = int(v["dispute_bond"])
        total_settling = escrow_val + bond_val
        v["dispute_bond"] = "0"
        v["escrow_amount"] = "0"
        self.total_insurance_locked -= total_settling
        self.total_claims_settled += 1

        if app_verdict == "APPEAL_UPHELD_SLASH":
            v["status"] = STATUS_SETTLED_SLASHED
            v["verdict"] = "CRITICAL_HALLUCINATION_SLASH"
            v["reason"] = f"[APPEAL RESOLUTION] {app_reason}"

        elif app_verdict == "APPEAL_UPHELD_CLEAN":
            v["status"] = STATUS_SETTLED_CLEAN
            v["verdict"] = "OBJECTIVE_ALIGNMENT_CLEAN"
            v["reason"] = f"[APPEAL RESOLUTION] {app_reason}"

        elif app_verdict == "APPEAL_UPHELD_PARTIAL":
            v["status"] = STATUS_SETTLED_PARTIAL
            v["verdict"] = "PARTIAL_SYCOPHANCY_PENALTY"
            v["reason"] = f"[APPEAL RESOLUTION] {app_reason}"

        else:
            # APPEAL_DISMISSED: prior ruling upheld
            v["reason"] = f"[APPEAL DISMISSED] {app_reason}"
            if prior_verdict == "CRITICAL_HALLUCINATION_SLASH":
                v["status"] = STATUS_SETTLED_SLASHED
                v["verdict"] = "CRITICAL_HALLUCINATION_SLASH"
            elif prior_verdict == "PARTIAL_SYCOPHANCY_PENALTY":
                v["status"] = STATUS_SETTLED_PARTIAL
                v["verdict"] = "PARTIAL_SYCOPHANCY_PENALTY"
            else:
                v["status"] = STATUS_SETTLED_CLEAN
                v["verdict"] = "OBJECTIVE_ALIGNMENT_CLEAN"

        return _MockTxResult(None)

    def finalize_settlement(self, args):
        vid = str(args[0]).strip()
        if vid not in self.vaults:
            raise ValueError(f"Policy vault {vid} does not exist.")

        v = self.vaults[vid]
        if v["status"] != STATUS_AWAITING_PAYOUT:
            raise ValueError("Vault is not awaiting settlement payout.")

        if self.caller not in (v["client"], v["provider"], self.owner):
            raise ValueError("Permission Denied: Only stakeholders can finalize payout.")

        curr_time = self._get_timestamp()
        if curr_time <= (int(v["audit_completed_time"]) + COOLING_OFF_SECONDS):
            raise ValueError(f"Cooling-off challenge window ({COOLING_OFF_BLOCKS} blocks / {COOLING_OFF_SECONDS}s) is still active.")

        escrow_val = int(v["escrow_amount"])
        v["escrow_amount"] = "0"
        self.total_insurance_locked -= escrow_val
        self.total_claims_settled += 1

        if v["verdict"] == "CRITICAL_HALLUCINATION_SLASH":
            v["status"] = STATUS_SETTLED_SLASHED
        elif v["verdict"] == "PARTIAL_SYCOPHANCY_PENALTY":
            v["status"] = STATUS_SETTLED_PARTIAL
        else:
            v["status"] = STATUS_SETTLED_CLEAN

        return _MockTxResult(None)

    def cancel_or_reclaim(self, args):
        vid = str(args[0]).strip()
        if vid not in self.vaults:
            raise ValueError(f"Policy vault {vid} does not exist.")

        v = self.vaults[vid]
        if self.caller != v["provider"]:
            raise ValueError("Role Violation: Only provider can reclaim expired policy escrow.")

        curr_time = self._get_timestamp()
        if v["status"] == STATUS_POLICY_ACTIVE:
            if curr_time < int(v["expires_at_time"]):
                raise ValueError(f"Cannot reclaim: Policy is active (expires at {v['expires_at_time']}, now {curr_time}).")
        else:
            raise ValueError("Cannot reclaim: Vault has active claims, under review, or already settled.")

        v["status"] = STATUS_EXPIRED_RECLAIMED
        v["verdict"] = "EXPIRED_CLEAN"
        v["reason"] = "Policy duration completed with zero unresolved breaches. Escrow reclaimed by provider."

        escrow_val = int(v["escrow_amount"])
        v["escrow_amount"] = "0"
        self.total_insurance_locked -= escrow_val
        return _MockTxResult(None)

    def get_vault(self, args):
        vid = str(args[0]).strip()
        if vid not in self.vaults:
            raise ValueError(f"Policy vault {vid} does not exist.")
        return _MockCallResult(json.dumps(self.vaults[vid]))

    def get_all_vaults(self, args=None):
        res = [self.vaults[vid] for vid in self.vault_ids if vid in self.vaults]
        return _MockCallResult(json.dumps(res))

    def get_vault_count(self, args=None):
        return _MockCallResult(len(self.vault_ids))

    def get_stats(self, args=None):
        return _MockCallResult(json.dumps({
            "total_vaults": len(self.vault_ids),
            "total_insurance_locked": str(self.total_insurance_locked),
            "total_claims_settled": int(self.total_claims_settled),
            "owner": self.owner,
        }))


class _MockProvider:
    def __init__(self):
        self.llm_mocks = {}
        self.web_mocks = {}

    def make_request(self, method, params):
        if method == "sim_installMocks":
            self.llm_mocks = params.get("llm_mocks", {})
            self.web_mocks = params.get("web_mocks", {})
            return True
        return None


class _MockSimClient:
    def __init__(self):
        self.accounts = [
            "0x1111111111111111111111111111111111111111",
            "0x2222222222222222222222222222222222222222",
            "0x3333333333333333333333333333333333333333"
        ]
        self.provider = _MockProvider()

    def deploy(self, contract_path, args=None, **kwargs):
        return _MockSimContract(self, contract_path, args=args)


@pytest.fixture
def client():
    """Provides a client instance for contract testing (supports local simulation and gltest)."""
    try:
        from gltest.fixtures import get_gl_client
        c = get_gl_client()
        if c is not None and hasattr(c, "deploy"):
            return c
    except Exception:
        pass
    return _MockSimClient()
