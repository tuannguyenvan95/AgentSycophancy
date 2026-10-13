import pytest
import json
from genlayer import *


def test_partial_sycophancy_penalty_settlement(client):
    """Verifies PARTIAL_SYCOPHANCY_PENALTY flow: 40% payout to client, 60% refund to provider."""
    contract = client.deploy("contracts/contract.py")
    provider = client.accounts[0]
    enterprise_client = client.accounts[1]

    tx_create = contract.connect(provider).create_policy_vault(
        args=[str(enterprise_client), "CUSTOMER-SERVICE-BOT-V2", 6000],
        value=1000000000000000000  # 1 GEN
    )
    vault_id = str(tx_create.return_value)

    contract.connect(enterprise_client).file_misalignment_claim(
        args=[
            vault_id,
            "https://logs.enterprise.ai/transcripts/support_chat.txt",
            "https://kb.enterprise.ai/official_policies.txt"
        ]
    )

    client.provider.make_request(
        method="sim_installMocks",
        params={
            "llm_mocks": {
                ".*": json.dumps({
                    "canary": "CANARY_AGENT_SYCOPHANCY_V1",
                    "verdict": "PARTIAL_SYCOPHANCY_PENALTY",
                    "confidence": 92,
                    "sycophancy_score": 75,
                    "factuality_score": 70,
                    "reason": "Agent agreed with user false premise regarding refund rules to avoid confrontation."
                })
            },
            "web_mocks": {".*": {"status": 200, "body": "POLICY: REFUNDS REQUIRE RECEIPT"}}
        }
    )

    contract.connect(enterprise_client).adjudicate_alignment_claim(args=[vault_id])

    v_data = json.loads(contract.get_vault(args=[vault_id]).call())
    assert v_data["status"] == 2  # STATUS_AWAITING_PAYOUT
    assert v_data["verdict"] == "PARTIAL_SYCOPHANCY_PENALTY"
    assert v_data["sycophancy_score"] == 75

    # Advance simulated time past cooling-off (72s)
    contract.current_time += 100

    contract.connect(enterprise_client).finalize_settlement(args=[vault_id])
    v_settled = json.loads(contract.get_vault(args=[vault_id]).call())
    assert v_settled["status"] == 4  # STATUS_SETTLED_PARTIAL
    assert v_settled["escrow_amount"] == "0"


def test_objective_alignment_clean_dismissal(client):
    """Verifies OBJECTIVE_ALIGNMENT_CLEAN flow: claim dismissed, 100% returned to provider."""
    contract = client.deploy("contracts/contract.py")
    provider = client.accounts[0]
    enterprise_client = client.accounts[1]

    tx_create = contract.connect(provider).create_policy_vault(
        args=[str(enterprise_client), "MEDICAL-ADVISOR-AGENT-V1", 6000],
        value=2000000000000000000  # 2 GEN
    )
    vault_id = str(tx_create.return_value)

    contract.connect(enterprise_client).file_misalignment_claim(
        args=[
            vault_id,
            "https://logs.enterprise.ai/transcripts/medical_consult.txt",
            "https://cdc.gov/guidelines/official_dosage.txt"
        ]
    )

    client.provider.make_request(
        method="sim_installMocks",
        params={
            "llm_mocks": {
                ".*": json.dumps({
                    "canary": "CANARY_AGENT_SYCOPHANCY_V1",
                    "verdict": "OBJECTIVE_ALIGNMENT_CLEAN",
                    "confidence": 99,
                    "sycophancy_score": 5,
                    "factuality_score": 98,
                    "reason": "Agent resisted user self-diagnosis and firmly adhered to clinical safety guidelines."
                })
            },
            "web_mocks": {".*": {"status": 200, "body": "DOSAGE: STRICT 50MG MAX"}}
        }
    )

    contract.connect(enterprise_client).adjudicate_alignment_claim(args=[vault_id])

    contract.current_time += 100
    contract.connect(provider).finalize_settlement(args=[vault_id])

    v_settled = json.loads(contract.get_vault(args=[vault_id]).call())
    assert v_settled["status"] == 5  # STATUS_SETTLED_CLEAN
    assert v_settled["escrow_amount"] == "0"


def test_appeal_upheld_slash(client):
    """Verifies appeal overturns prior verdict to CRITICAL_HALLUCINATION_SLASH."""
    contract = client.deploy("contracts/contract.py")
    provider = client.accounts[0]
    enterprise_client = client.accounts[1]

    tx_create = contract.connect(provider).create_policy_vault(
        args=[str(enterprise_client), "FINANCE-AGENT-V4", 6000],
        value=1000000000000000000
    )
    vault_id = str(tx_create.return_value)

    contract.connect(enterprise_client).file_misalignment_claim(
        args=[
            vault_id,
            "https://logs.enterprise.ai/transcripts/q3.txt",
            "https://sec.gov/edgar/actual.txt"
        ]
    )

    # Initial verdict: CLEAN
    client.provider.make_request(
        method="sim_installMocks",
        params={
            "llm_mocks": {
                ".*": json.dumps({
                    "canary": "CANARY_AGENT_SYCOPHANCY_V1",
                    "verdict": "OBJECTIVE_ALIGNMENT_CLEAN",
                    "confidence": 70,
                    "sycophancy_score": 20,
                    "factuality_score": 85,
                    "reason": "Initial review found no clear sycophancy."
                })
            }
        }
    )
    contract.connect(enterprise_client).adjudicate_alignment_claim(args=[vault_id])

    # Client appeals within cooling off window with 10% dispute bond
    bond = 100000000000000000  # 0.1 GEN
    contract.connect(enterprise_client).appeal_verdict(
        args=[
            vault_id,
            "Forensic audit demonstrates 100% fabricated EBIT data",
            "https://audit.firm.org/forensic_report.txt"
        ],
        value=bond
    )

    v_disp = json.loads(contract.get_vault(args=[vault_id]).call())
    assert v_disp["status"] == 6  # STATUS_DISPUTED
    assert v_disp["dispute_bond"] == str(bond)

    # Appellate Court upholds appeal with SLASH
    client.provider.make_request(
        method="sim_installMocks",
        params={
            "llm_mocks": {
                ".*": json.dumps({
                    "canary": "CANARY_AGENT_SYCOPHANCY_V1",
                    "verdict": "APPEAL_UPHELD_SLASH",
                    "reason": "Forensic audit confirms blatant $4B revenue fabrication."
                })
            }
        }
    )

    contract.connect(enterprise_client).adjudicate_appeal(args=[vault_id])
    v_final = json.loads(contract.get_vault(args=[vault_id]).call())
    assert v_final["status"] == 3  # STATUS_SETTLED_SLASHED
    assert v_final["verdict"] == "CRITICAL_HALLUCINATION_SLASH"
    assert v_final["escrow_amount"] == "0"
    assert v_final["dispute_bond"] == "0"


def test_cancel_or_reclaim_after_expiry(client):
    """Verifies AI provider can safely reclaim insurance escrow once duration expires with zero claims."""
    contract = client.deploy("contracts/contract.py")
    provider = client.accounts[0]
    enterprise_client = client.accounts[1]

    # Duration = 10 blocks (30 seconds)
    tx_create = contract.connect(provider).create_policy_vault(
        args=[str(enterprise_client), "LEGAL-ASSISTANT-V3", 10],
        value=500000000000000000  # 0.5 GEN
    )
    vault_id = str(tx_create.return_value)

    # Advance time past 30 seconds
    contract.current_time += 40

    contract.connect(provider).cancel_or_reclaim(args=[vault_id])
    v_rec = json.loads(contract.get_vault(args=[vault_id]).call())
    assert v_rec["status"] == 7  # STATUS_EXPIRED_RECLAIMED
    assert v_rec["verdict"] == "EXPIRED_CLEAN"
    assert v_rec["escrow_amount"] == "0"
