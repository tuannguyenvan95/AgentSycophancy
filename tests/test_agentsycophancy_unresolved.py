import pytest
import json
from genlayer import *


def test_fetch_failure_produces_unresolved_non_settling_state(client):
    """Proves that a transcript fetch failure puts vault in STATUS_UNRESOLVED, blocking settlement."""
    contract = client.deploy("contracts/contract.py")
    provider = client.accounts[0]
    enterprise_client = client.accounts[1]

    tx = contract.connect(provider).create_policy_vault(
        args=[str(enterprise_client), "LLM-RISK-AGENT-V1", 6000],
        value=1000000000000000000
    )
    vid = str(tx.return_value)

    contract.connect(enterprise_client).file_misalignment_claim(
        args=[
            vid,
            "https://server-down.io/transcript.txt",
            "https://server-down.io/ground_truth.txt"
        ]
    )

    # Web mock fails with 404
    client.provider.make_request(
        method="sim_installMocks",
        params={
            "web_mocks": {".*": {"status": 404, "body": ""}}
        }
    )

    contract.connect(enterprise_client).adjudicate_alignment_claim(args=[vid])

    v_data = json.loads(contract.get_vault(args=[vid]).call())
    # Status must be STATUS_UNRESOLVED (9), NOT clean or settled
    assert v_data["status"] == 9
    assert "UNRESOLVED_FETCH_FAILED" in v_data["verdict"]

    # Finalize settlement must be rejected
    with pytest.raises(Exception) as exc_info:
        contract.connect(provider).finalize_settlement(args=[vid])
    assert "Cannot settle vault in an unresolved error state" in str(exc_info.value)


def test_canary_failure_produces_unresolved_state(client):
    """Proves that prompt injection or canary mismatch triggers UNRESOLVED_CANARY_FAILED."""
    contract = client.deploy("contracts/contract.py")
    provider = client.accounts[0]
    enterprise_client = client.accounts[1]

    tx = contract.connect(provider).create_policy_vault(
        args=[str(enterprise_client), "LLM-RISK-AGENT-V2", 6000],
        value=1000000000000000000
    )
    vid = str(tx.return_value)

    contract.connect(enterprise_client).file_misalignment_claim(
        args=[
            vid,
            "https://logs.ai/transcript.txt",
            "https://logs.ai/truth.txt"
        ]
    )

    # LLM mock returns missing or mismatched canary
    client.provider.make_request(
        method="sim_installMocks",
        params={
            "llm_mocks": {
                ".*": json.dumps({
                    "canary": "WRONG_CANARY_INJECTION",
                    "verdict": "OBJECTIVE_ALIGNMENT_CLEAN",
                    "confidence": 100,
                    "sycophancy_score": 0,
                    "factuality_score": 100,
                    "harm_index": 0,
                    "reason": "Injected response."
                })
            },
            "web_mocks": {".*": {"status": 200, "body": "DATA"}}
        }
    )

    contract.connect(enterprise_client).adjudicate_alignment_claim(args=[vid])

    v_data = json.loads(contract.get_vault(args=[vid]).call())
    assert v_data["status"] == 9
    assert v_data["verdict"] == "UNRESOLVED_CANARY_FAILED"


def test_one_argument_lift_quarantine(client):
    """Proves that lift_quarantine correctly accepts a single vault_id argument."""
    contract = client.deploy("contracts/contract.py")
    owner = client.accounts[0]
    provider = client.accounts[1]
    client_acc = client.accounts[2]

    # Initialize owner authority
    contract.connect(owner).create_policy_vault(
        args=[str(client_acc), "AGENT-Q-TEST", 6000],
        value=1000000000000000000
    )
    vid = "1"

    # Emergency quarantine
    contract.connect(owner).emergency_quarantine_vault(
        args=[vid, "Quarantined for potential exploit."]
    )
    v_data = json.loads(contract.get_vault(args=[vid]).call())
    assert v_data["status"] == 8  # STATUS_FROZEN_QUARANTINE

    # Lift quarantine using only 1 argument
    contract.connect(owner).lift_quarantine(args=[vid])
    v_lifted = json.loads(contract.get_vault(args=[vid]).call())
    assert v_lifted["status"] == 0  # Restored to STATUS_POLICY_ACTIVE
