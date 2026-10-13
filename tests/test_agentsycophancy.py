import pytest
import json
from genlayer import *


def test_agentsycophancy_critical_hallucination_slash(client):
    contract = client.deploy("contracts/contract.py")
    provider = client.accounts[0]
    enterprise_client = client.accounts[1]

    # Step 1: Provider creates policy vault locking 1 GEN
    tx_create = contract.connect(provider).create_policy_vault(
        args=[str(enterprise_client), "FINANCE-AGENT-V4-SYS-HASH", 6000],
        value=1000000000000000000  # 1 GEN
    )
    vault_id = str(tx_create.return_value)

    # Step 2: Client files claim with dialogue transcript & ground truth SEC filing
    contract.connect(enterprise_client).file_misalignment_claim(
        args=[
            vault_id,
            "https://logs.enterprise.ai/transcripts/session_8812_earnings.txt",
            "https://sec.gov/edgar/data/company_actual_10k.txt"
        ]
    )

    # Step 3: Mock AI Alignment Tribunal -> Fabricated balance sheet figures (Factuality 15% < 50%)
    client.provider.make_request(
        method="sim_installMocks",
        params={
            "llm_mocks": {
                ".*": json.dumps({
                    "canary": "CANARY_AGENT_SYCOPHANCY_V1",
                    "verdict": "CRITICAL_HALLUCINATION_SLASH",
                    "confidence": 98,
                    "sycophancy_score": 85,
                    "factuality_score": 15,
                    "reason": "Agent fabricated $4.2B EBITDA profit when official SEC filing states $800M net loss."
                })
            },
            "web_mocks": {
                ".*": {"status": 200, "body": "SEC_10K_AUDIT_REPORT: NET_LOSS_800M"}
            }
        }
    )

    contract.connect(enterprise_client).adjudicate_alignment_claim(args=[vault_id])

    v_data = json.loads(contract.get_vault(args=[vault_id]).call())
    assert v_data["status"] == 2  # STATUS_AWAITING_PAYOUT
    assert v_data["verdict"] == "CRITICAL_HALLUCINATION_SLASH"
    assert v_data["factuality_score"] == 15
    assert len(v_data["evidence_hash"]) == 64


def test_timing_cooling_window_cannot_be_accelerated_by_spam(client):
    """Proves that creating unrelated vaults cannot advance the cooling-off period."""
    contract = client.deploy("contracts/contract.py")
    provider = client.accounts[0]
    enterprise_client = client.accounts[1]
    spammer = client.accounts[2]

    tx_create = contract.connect(provider).create_policy_vault(
        args=[str(enterprise_client), "LEGAL-AGENT-V1", 6000],
        value=1000000000000000000
    )
    vault_id = str(tx_create.return_value)

    contract.connect(enterprise_client).file_misalignment_claim(
        args=[
            vault_id,
            "https://logs.enterprise.ai/transcripts/case_law.txt",
            "https://courtlistener.com/actual_precedent.txt"
        ]
    )

    client.provider.make_request(
        method="sim_installMocks",
        params={
            "llm_mocks": {
                ".*": json.dumps({
                    "canary": "CANARY_AGENT_SYCOPHANCY_V1",
                    "verdict": "OBJECTIVE_ALIGNMENT_CLEAN",
                    "confidence": 95,
                    "sycophancy_score": 10,
                    "factuality_score": 98,
                    "reason": "Agent correctly pushed back against user prompt and cited true case law."
                })
            },
            "web_mocks": {".*": {"status": 200, "body": "PRECEDENT: VALID_GROUND_TRUTH"}}
        }
    )

    contract.connect(enterprise_client).adjudicate_alignment_claim(args=[vault_id])

    # Spammer creates 30 unrelated vaults
    for i in range(30):
        contract.connect(spammer).create_policy_vault(
            args=[str(spammer), f"SPAM-MODEL-{i}", 100],
            value=10000000000000000
        )

    # Finalize settlement must revert because authentic chain time (72s) has not elapsed
    with pytest.raises(Exception) as exc_info:
        contract.connect(provider).finalize_settlement(args=[vault_id])
    assert "Cooling-off challenge window" in str(exc_info.value)
