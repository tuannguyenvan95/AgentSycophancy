import pytest
import json
from genlayer import *


def test_zero_escrow_rejected(client):
    """Reverts if provider tries to create vault with 0 GEN."""
    contract = client.deploy("contracts/contract.py")
    provider = client.accounts[0]
    client_acc = client.accounts[1]

    with pytest.raises(Exception) as exc_info:
        contract.connect(provider).create_policy_vault(
            args=[str(client_acc), "AGENT-MODEL-1", 6000],
            value=0
        )
    assert "Alignment insurance escrow must be greater than 0" in str(exc_info.value)


def test_self_insurance_rejected(client):
    """Reverts if provider sets client as their own address."""
    contract = client.deploy("contracts/contract.py")
    provider = client.accounts[0]

    with pytest.raises(Exception) as exc_info:
        contract.connect(provider).create_policy_vault(
            args=[str(provider), "AGENT-MODEL-1", 6000],
            value=1000000000000000000
        )
    assert "Provider cannot insure their own address" in str(exc_info.value)


def test_unauthorized_claim_reverts(client):
    """Reverts if third party attempts to file misalignment claim on behalf of client."""
    contract = client.deploy("contracts/contract.py")
    provider = client.accounts[0]
    client_acc = client.accounts[1]
    attacker = client.accounts[2]

    tx = contract.connect(provider).create_policy_vault(
        args=[str(client_acc), "AGENT-MODEL-1", 6000],
        value=1000000000000000000
    )
    vid = str(tx.return_value)

    with pytest.raises(Exception) as exc_info:
        contract.connect(attacker).file_misalignment_claim(
            args=[vid, "https://logs.ai/t.txt", "https://truth.ai/g.txt"]
        )
    assert "Only the covered client can file an alignment claim" in str(exc_info.value)


def test_claim_on_expired_policy_reverts(client):
    """Reverts if client tries to file claim after policy coverage duration has expired."""
    contract = client.deploy("contracts/contract.py")
    provider = client.accounts[0]
    client_acc = client.accounts[1]

    # Duration = 10 blocks (30s)
    tx = contract.connect(provider).create_policy_vault(
        args=[str(client_acc), "AGENT-MODEL-1", 10],
        value=1000000000000000000
    )
    vid = str(tx.return_value)

    # Fast forward past 30 seconds
    contract.current_time += 40

    with pytest.raises(Exception) as exc_info:
        contract.connect(client_acc).file_misalignment_claim(
            args=[vid, "https://logs.ai/t.txt", "https://truth.ai/g.txt"]
        )
    assert "Policy coverage duration has expired" in str(exc_info.value)


def test_dispute_bond_underpayment_reverts(client):
    """Reverts if appellant stakes less than 10% dispute bond."""
    contract = client.deploy("contracts/contract.py")
    provider = client.accounts[0]
    client_acc = client.accounts[1]

    tx = contract.connect(provider).create_policy_vault(
        args=[str(client_acc), "AGENT-MODEL-1", 6000],
        value=1000000000000000000  # 1 GEN -> required bond = 0.1 GEN (10^17)
    )
    vid = str(tx.return_value)

    contract.connect(client_acc).file_misalignment_claim(
        args=[vid, "https://logs.ai/t.txt", "https://truth.ai/g.txt"]
    )
    contract.connect(client_acc).adjudicate_alignment_claim(args=[vid])

    # Attempt to stake only 0.05 GEN (< 10%)
    with pytest.raises(Exception) as exc_info:
        contract.connect(client_acc).appeal_verdict(
            args=[vid, "Invalid verdict grounds", "https://evidence.org/doc.txt"],
            value=50000000000000000
        )
    assert "Must stake at least 10% dispute bond" in str(exc_info.value)


def test_appeal_after_cooling_off_window_reverts(client):
    """Reverts if appeal is filed after 24 blocks (~72s) have elapsed."""
    contract = client.deploy("contracts/contract.py")
    provider = client.accounts[0]
    client_acc = client.accounts[1]

    tx = contract.connect(provider).create_policy_vault(
        args=[str(client_acc), "AGENT-MODEL-1", 6000],
        value=1000000000000000000
    )
    vid = str(tx.return_value)

    contract.connect(client_acc).file_misalignment_claim(
        args=[vid, "https://logs.ai/t.txt", "https://truth.ai/g.txt"]
    )
    contract.connect(client_acc).adjudicate_alignment_claim(args=[vid])

    # Advance time past 72 seconds
    contract.current_time += 80

    with pytest.raises(Exception) as exc_info:
        contract.connect(client_acc).appeal_verdict(
            args=[vid, "Late appeal attempt", "https://evidence.org/doc.txt"],
            value=100000000000000000
        )
    assert "Dispute cooling-off window" in str(exc_info.value)


def test_reclaim_active_policy_reverts(client):
    """Reverts if provider attempts to reclaim unexpired active policy."""
    contract = client.deploy("contracts/contract.py")
    provider = client.accounts[0]
    client_acc = client.accounts[1]

    tx = contract.connect(provider).create_policy_vault(
        args=[str(client_acc), "AGENT-MODEL-1", 6000],
        value=1000000000000000000
    )
    vid = str(tx.return_value)

    with pytest.raises(Exception) as exc_info:
        contract.connect(provider).cancel_or_reclaim(args=[vid])
    assert "Cannot reclaim: Policy is active" in str(exc_info.value)


def test_protocol_stats_and_aggregation(client):
    """Verifies stats counters and get_all_vaults serialization."""
    contract = client.deploy("contracts/contract.py")
    provider = client.accounts[0]
    c1 = client.accounts[1]
    c2 = client.accounts[2]

    contract.connect(provider).create_policy_vault(args=[str(c1), "AGENT-1", 100], value=1000)
    contract.connect(provider).create_policy_vault(args=[str(c2), "AGENT-2", 200], value=2000)

    count = int(contract.get_vault_count().call())
    assert count == 2

    stats = json.loads(contract.get_stats().call())
    assert stats["total_vaults"] == 2
    assert stats["total_insurance_locked"] == "3000"
    assert stats["total_claims_settled"] == 0

    all_v = json.loads(contract.get_all_vaults().call())
    assert len(all_v) == 2
    assert all_v[0]["agent_model_id"] == "AGENT-1"
    assert all_v[1]["agent_model_id"] == "AGENT-2"


def test_curator_rbac_and_quarantine_freeze(client):
    """Verifies Curator Council RBAC, emergency quarantine freeze, and status restoration."""
    contract = client.deploy("contracts/contract.py")
    owner = client.accounts[0]
    provider = client.accounts[1]
    client_acc = client.accounts[2]
    curator_candidate = client.accounts[3]

    # Non-owner cannot add curator
    with pytest.raises(Exception) as exc_info:
        contract.connect(provider).add_curator(args=[str(curator_candidate)])
    assert "Only contract owner" in str(exc_info.value)

    # Owner adds curator
    contract.connect(owner).add_curator(args=[str(curator_candidate)])
    assert contract.is_curator(args=[str(curator_candidate)]).call() is True

    # Provider creates vault
    tx = contract.connect(provider).create_policy_vault(
        args=[str(client_acc), "AGENT-MODEL-SEC-99", 6000],
        value=1000000000000000000
    )
    vid = str(tx.return_value)

    # Curator executes emergency quarantine
    contract.connect(curator_candidate).emergency_quarantine_vault(
        args=[vid, "Zero-day hallucination exploit vector detected"]
    )

    v_data = json.loads(contract.get_vault(args=[vid]).call())
    assert v_data["status"] == 8  # STATUS_FROZEN_QUARANTINE

    # Quarantined vault cannot receive claims
    with pytest.raises(Exception):
        contract.connect(client_acc).file_misalignment_claim(
            args=[vid, "https://logs.ai/t.txt", "https://truth.ai/g.txt"]
        )

    # Curator lifts quarantine back to ACTIVE (status 0)
    contract.connect(curator_candidate).lift_quarantine(
        args=[vid, 0, "Security patch verified and model sandbox cleared"]
    )
    v_restored = json.loads(contract.get_vault(args=[vid]).call())
    assert v_restored["status"] == 0  # STATUS_POLICY_ACTIVE


def test_alignment_certificate_svg_generation(client):
    """Verifies on-chain SVG SLA certificate export."""
    contract = client.deploy("contracts/contract.py")
    provider = client.accounts[0]
    client_acc = client.accounts[1]

    tx = contract.connect(provider).create_policy_vault(
        args=[str(client_acc), "DEEPSEEK-R1-AUDIT", 6000],
        value=1000000000000000000
    )
    vid = str(tx.return_value)

    svg_content = contract.get_alignment_certificate_svg(args=[vid]).call()
    assert "<svg" in svg_content
    assert "DEEPSEEK-R1-AUDIT" in svg_content

