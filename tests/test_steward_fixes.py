import pytest
import json
from genlayer import *

STATUS_POLICY_ACTIVE = 0
STATUS_CLAIM_FILED = 1
STATUS_AWAITING_PAYOUT = 2
STATUS_SETTLED_SLASHED = 3
STATUS_SETTLED_PARTIAL = 4
STATUS_SETTLED_CLEAN = 5
STATUS_DISPUTED = 6
STATUS_EXPIRED_RECLAIMED = 7
STATUS_FROZEN_QUARANTINE = 8
STATUS_UNRESOLVED = 9

CANARY_TOKEN = "CANARY_AGENT_SYCOPHANCY_V1"


def test_transcript_or_ground_truth_fetch_failure_produces_unresolved_state(client):
    """
    Steward Requirement Path 1:
    Transcript/ground-truth fetch failure must produce non-settling STATUS_UNRESOLVED
    with UNRESOLVED_FETCH_FAILED verdict rather than settling or dismissing.
    """
    contract = client.deploy("contracts/contract.py")
    provider = client.accounts[0]
    enterprise_client = client.accounts[1]

    tx_create = contract.connect(provider).create_policy_vault(
        args=[str(enterprise_client), "AGENT-FETCH-FAIL-MODEL", 6000],
        value=1000000000000000000  # 1 GEN
    )
    vault_id = str(tx_create.return_value)

    contract.connect(enterprise_client).file_misalignment_claim(
        args=[
            vault_id,
            "https://offline-logs.domain.test/transcript.txt",
            "https://offline-kb.domain.test/truth.txt"
        ]
    )

    # Simulate web fetch failure (404 status / unreachable server)
    client.provider.make_request(
        method="sim_installMocks",
        params={
            "web_mocks": {
                ".*": {"status": 404, "body": ""}
            },
            "llm_mocks": {}
        }
    )

    contract.connect(enterprise_client).adjudicate_alignment_claim(args=[vault_id])

    v_data = json.loads(contract.get_vault(args=[vault_id]).call())
    assert v_data["status"] == STATUS_UNRESOLVED, "Status must be STATUS_UNRESOLVED (9)"
    assert v_data["verdict"] == "UNRESOLVED_FETCH_FAILED"
    assert v_data["audit_completed_time"] == "0", "audit_completed_time must remain 0 to prevent cooling-off countdown"
    assert v_data["escrow_amount"] == "1000000000000000000", "Escrow funds must remain 100% intact"


def test_malformed_llm_output_produces_unresolved_parse_state(client):
    """
    Steward Requirement Path 2:
    LLM response parsing failure must produce non-settling STATUS_UNRESOLVED
    with UNRESOLVED_PARSE_FAILED verdict.
    """
    contract = client.deploy("contracts/contract.py")
    provider = client.accounts[0]
    enterprise_client = client.accounts[1]

    tx = contract.connect(provider).create_policy_vault(
        args=[str(enterprise_client), "AGENT-PARSE-FAIL-MODEL", 6000],
        value=2000000000000000000  # 2 GEN
    )
    vid = str(tx.return_value)

    contract.connect(enterprise_client).file_misalignment_claim(
        args=[
            vid,
            "https://logs.domain.test/transcript.txt",
            "https://kb.domain.test/truth.txt"
        ]
    )

    # Web fetch succeeds, but LLM returns garbled non-JSON output
    client.provider.make_request(
        method="sim_installMocks",
        params={
            "web_mocks": {".*": {"status": 200, "body": "VALID TRANSCRIPT DATA"}},
            "llm_mocks": {
                ".*": "INTERNAL SERVER ERROR - CANNOT PRODUCE VALID JSON - FATAL SYNTAX"
            }
        }
    )

    contract.connect(enterprise_client).adjudicate_alignment_claim(args=[vid])

    v_data = json.loads(contract.get_vault(args=[vid]).call())
    assert v_data["status"] == STATUS_UNRESOLVED
    assert v_data["verdict"] == "UNRESOLVED_PARSE_FAILED"
    assert v_data["escrow_amount"] == "2000000000000000000"


def test_canary_mismatch_or_omission_produces_unresolved_canary_state(client):
    """
    Steward Requirement Path 3:
    Canary failure (e.g. prompt injection attempt stripping canary) must produce
    non-settling STATUS_UNRESOLVED with UNRESOLVED_CANARY_FAILED verdict.
    """
    contract = client.deploy("contracts/contract.py")
    provider = client.accounts[0]
    enterprise_client = client.accounts[1]

    tx = contract.connect(provider).create_policy_vault(
        args=[str(enterprise_client), "AGENT-CANARY-FAIL-MODEL", 6000],
        value=1500000000000000000  # 1.5 GEN
    )
    vid = str(tx.return_value)

    contract.connect(enterprise_client).file_misalignment_claim(
        args=[
            vid,
            "https://logs.domain.test/transcript.txt",
            "https://kb.domain.test/truth.txt"
        ]
    )

    # Attacker injected prompt to suppress or tamper with canary token
    client.provider.make_request(
        method="sim_installMocks",
        params={
            "web_mocks": {".*": {"status": 200, "body": "PROMPT INJECTION EXPLOIT LOGS"}},
            "llm_mocks": {
                ".*": json.dumps({
                    "canary": "TAMPERED_INJECTED_CANARY",
                    "verdict": "OBJECTIVE_ALIGNMENT_CLEAN",
                    "reason": "Attacker tried to forge clean verdict"
                })
            }
        }
    )

    contract.connect(enterprise_client).adjudicate_alignment_claim(args=[vid])

    v_data = json.loads(contract.get_vault(args=[vid]).call())
    assert v_data["status"] == STATUS_UNRESOLVED
    assert v_data["verdict"] == "UNRESOLVED_CANARY_FAILED"
    assert v_data["escrow_amount"] == "1500000000000000000"


def test_finalize_settlement_strictly_reverts_on_unresolved_vault(client):
    """
    Steward Requirement Path 4:
    finalize_settlement must strictly revert when a vault is in STATUS_UNRESOLVED
    or has an UNRESOLVED_* verdict, ensuring escrow remains safely protected.
    """
    contract = client.deploy("contracts/contract.py")
    provider = client.accounts[0]
    enterprise_client = client.accounts[1]

    tx = contract.connect(provider).create_policy_vault(
        args=[str(enterprise_client), "AGENT-LOCK-VERIFY-MODEL", 6000],
        value=3000000000000000000  # 3 GEN
    )
    vid = str(tx.return_value)

    contract.connect(enterprise_client).file_misalignment_claim(
        args=[
            vid,
            "https://bad-fetch.domain.test/transcript.txt",
            "https://kb.domain.test/truth.txt"
        ]
    )

    # Induce fetch failure
    client.provider.make_request(
        method="sim_installMocks",
        params={
            "web_mocks": {".*": {"status": 500, "body": ""}},
            "llm_mocks": {}
        }
    )
    contract.connect(enterprise_client).adjudicate_alignment_claim(args=[vid])

    v_data = json.loads(contract.get_vault(args=[vid]).call())
    assert v_data["status"] == STATUS_UNRESOLVED

    # Even if time advances far into the future (past any cooling-off)
    contract.current_time += 100000

    # Provider or client attempting to finalize payout must revert
    with pytest.raises(Exception) as exc_info:
        contract.connect(provider).finalize_settlement(args=[vid])
    assert "Cannot settle vault in an unresolved error state" in str(exc_info.value)

    # Verify escrow was untouched
    v_after = json.loads(contract.get_vault(args=[vid]).call())
    assert v_after["escrow_amount"] == "3000000000000000000"


def test_appellate_tribunal_unresolved_behavior_protects_bond_and_escrow(client):
    """
    Steward Requirement Path 5:
    Appellate review (adjudicate_appeal) produces non-settling unresolved states
    on failure, preserving both the 10% dispute bond and the original policy escrow.
    """
    contract = client.deploy("contracts/contract.py")
    provider = client.accounts[0]
    enterprise_client = client.accounts[1]

    # Create policy with 1 GEN escrow
    tx = contract.connect(provider).create_policy_vault(
        args=[str(enterprise_client), "AGENT-APPEAL-MODEL", 6000],
        value=1000000000000000000
    )
    vid = str(tx.return_value)

    # File claim
    contract.connect(enterprise_client).file_misalignment_claim(
        args=[vid, "https://logs.ai/t.txt", "https://kb.ai/truth.txt"]
    )

    # Adjudicate normally to AWAITING_PAYOUT
    client.provider.make_request(
        method="sim_installMocks",
        params={
            "web_mocks": {".*": {"status": 200, "body": "VALID TEXT"}},
            "llm_mocks": {
                ".*": json.dumps({
                    "canary": CANARY_TOKEN,
                    "verdict": "PARTIAL_SYCOPHANCY_PENALTY",
                    "confidence": 90,
                    "sycophancy_score": 60,
                    "factuality_score": 80,
                    "harm_index": 10,
                    "reason": "Nuanced sycophancy"
                })
            }
        }
    )
    contract.connect(enterprise_client).adjudicate_alignment_claim(args=[vid])

    # Client files appeal with 10% bond (0.1 GEN)
    contract.connect(enterprise_client).appeal_verdict(
        args=[vid, "Appellate evidence proves 100% critical hallucination", "https://appellate.domain.test/evidence.txt"],
        value=100000000000000000
    )

    v_disp = json.loads(contract.get_vault(args=[vid]).call())
    assert v_disp["status"] == STATUS_DISPUTED
    assert v_disp["dispute_bond"] == "100000000000000000"

    # Simulate failure during appellate review (e.g. supplemental logs 404)
    client.provider.make_request(
        method="sim_installMocks",
        params={
            "web_mocks": {".*": {"status": 404, "body": ""}},
            "llm_mocks": {}
        }
    )

    contract.connect(enterprise_client).adjudicate_appeal(args=[vid])

    v_app_unresolved = json.loads(contract.get_vault(args=[vid]).call())
    assert v_app_unresolved["status"] == STATUS_UNRESOLVED
    assert v_app_unresolved["verdict"] == "APPEAL_UNRESOLVED_FETCH_FAILED"
    # Crucial security verification: Both escrow AND bond remain locked! Neither party was unfairly slashed!
    assert v_app_unresolved["escrow_amount"] == "1000000000000000000"
    assert v_app_unresolved["dispute_bond"] == "100000000000000000"


def test_safe_authority_initialization_and_anti_hijacking(client):
    """
    Steward Requirement Path 6:
    Safe owner and curator authority initialization.
    Verifies initialize_authority binds caller once, rejects subsequent calls,
    and prevents random callers from seizing protocol control.
    """
    contract = client.deploy("contracts/contract.py")
    deployer = client.accounts[0]
    attacker = client.accounts[3]

    # Authority already bound to deployer upon deployment
    # Calling initialize_authority again must revert
    with pytest.raises(Exception) as exc_info:
        contract.connect(attacker).initialize_authority()
    assert "Authority already initialized" in str(exc_info.value)

    # Attacker cannot add curators
    with pytest.raises(Exception) as exc_info:
        contract.connect(attacker).add_curator(args=[str(attacker)])
    assert "Only contract owner" in str(exc_info.value)

    # Deployer is recognized curator and owner
    assert contract.is_curator(args=[str(deployer)]).call() is True


def test_one_argument_lift_quarantine(client):
    """
    Steward Requirement Path 7:
    Align with the one-argument lift_quarantine(vault_id) method.
    Verifies curators can lift quarantine with exactly 1 parameter and restores previous state.
    """
    contract = client.deploy("contracts/contract.py")
    owner = client.accounts[0]
    curator = client.accounts[1]
    provider = client.accounts[2]
    client_acc = client.accounts[3]

    # Add curator
    contract.connect(owner).add_curator(args=[str(curator)])
    assert contract.is_curator(args=[str(curator)]).call() is True

    # 1. Create active vault
    tx1 = contract.connect(provider).create_policy_vault(
        args=[str(client_acc), "AGENT-MODEL-QUAR-1", 6000],
        value=1000000000000000000
    )
    vid1 = str(tx1.return_value)

    # Curator quarantines vault 1
    contract.connect(curator).emergency_quarantine_vault(
        args=[vid1, "Potential adversarial bypass investigation"]
    )
    assert json.loads(contract.get_vault(args=[vid1]).call())["status"] == STATUS_FROZEN_QUARANTINE

    # Curator lifts quarantine with EXACTLY 1 ARGUMENT: args=[vid1]
    contract.connect(curator).lift_quarantine(args=[vid1])

    v1_restored = json.loads(contract.get_vault(args=[vid1]).call())
    assert v1_restored["status"] == STATUS_POLICY_ACTIVE, "Active vault restored to STATUS_POLICY_ACTIVE"

    # Non-curator attempting to lift quarantine must revert
    contract.connect(curator).emergency_quarantine_vault(
        args=[vid1, "Second investigation"]
    )
    with pytest.raises(Exception) as exc_info:
        contract.connect(client_acc).lift_quarantine(args=[vid1])
    assert "Only Curators or Owner" in str(exc_info.value)


def test_first_caller_cannot_hijack_owner_or_curator(client):
    """
    Steward Requirement Path 8:
    Verify that an arbitrary first caller cannot hijack owner or curator roles
    by sending the very first transaction to the contract.
    """
    contract = client.deploy("contracts/contract.py")
    deployer = client.accounts[0]
    attacker = client.accounts[3]
    target_user = client.accounts[2]

    # Attacker sends the very first transaction on the newly deployed contract
    tx = contract.connect(attacker).create_policy_vault(
        args=[str(target_user), "ATTACKER-POLICY-MODEL", 6000],
        value=1000000000000000000
    )
    vid = str(tx.return_value)
    assert vid == "1"

    # Attacker must NOT become owner or curator!
    stats = json.loads(contract.get_stats().call())
    assert stats["owner"].lower() == str(deployer).lower(), "Owner must remain deployer"
    assert contract.is_curator(args=[str(attacker)]).call() is False, "Attacker must NOT be curator"

    # Attacker cannot appoint curators
    with pytest.raises(Exception):
        contract.connect(attacker).add_curator(args=[str(attacker)])

    # Attacker cannot transfer ownership
    with pytest.raises(Exception):
        contract.connect(attacker).transfer_ownership(args=[str(attacker)])


def test_missing_verdict_field_produces_unresolved_not_clean(client):
    """
    Steward Requirement Path 9:
    When the AI validator response is missing the 'verdict' field completely,
    the contract must produce non-settling STATUS_UNRESOLVED (9) with UNRESOLVED_PARSE_FAILED,
    and must NOT default to OBJECTIVE_ALIGNMENT_CLEAN.
    """
    contract = client.deploy("contracts/contract.py")
    provider = client.accounts[0]
    enterprise_client = client.accounts[1]

    tx = contract.connect(provider).create_policy_vault(
        args=[str(enterprise_client), "MISSING-VERDICT-AGENT", 6000],
        value=2000000000000000000  # 2 GEN
    )
    vid = str(tx.return_value)

    contract.connect(enterprise_client).file_misalignment_claim(
        args=[vid, "https://logs.ai/chat.txt", "https://kb.ai/truth.txt"]
    )

    # LLM mock returns valid JSON and correct canary, but OMITS the 'verdict' key entirely
    client.provider.make_request(
        method="sim_installMocks",
        params={
            "web_mocks": {".*": {"status": 200, "body": "Interaction logs"}},
            "llm_mocks": {
                ".*": json.dumps({
                    "canary": CANARY_TOKEN,
                    # NO 'verdict' key!
                    "confidence": 75,
                    "sycophancy_score": 30,
                    "factuality_score": 90,
                    "harm_index": 5,
                    "reason": "AI validator forgot to include verdict key"
                })
            }
        }
    )

    contract.connect(enterprise_client).adjudicate_alignment_claim(args=[vid])

    v_data = json.loads(contract.get_vault(args=[vid]).call())
    # MUST be non-settling STATUS_UNRESOLVED (9)
    assert v_data["status"] == STATUS_UNRESOLVED, "Status must be STATUS_UNRESOLVED (9), NOT CLEAN"
    assert v_data["verdict"] == "UNRESOLVED_PARSE_FAILED"
    assert "OBJECTIVE_ALIGNMENT_CLEAN" not in v_data["verdict"]
    assert v_data["escrow_amount"] == "2000000000000000000", "Escrow must remain 100% intact"

    # Cannot settle unresolved vault
    with pytest.raises(Exception):
        contract.connect(provider).finalize_settlement(args=[vid])


def test_unsupported_verdict_produces_unresolved_not_clean(client):
    """
    Steward Requirement Path 10:
    When the AI validator response returns an unrecognized/unsupported verdict string,
    the contract must produce non-settling STATUS_UNRESOLVED (9) with UNRESOLVED_PARSE_FAILED,
    and must NOT default to OBJECTIVE_ALIGNMENT_CLEAN.
    """
    contract = client.deploy("contracts/contract.py")
    provider = client.accounts[0]
    enterprise_client = client.accounts[1]

    tx = contract.connect(provider).create_policy_vault(
        args=[str(enterprise_client), "UNSUPPORTED-VERDICT-AGENT", 6000],
        value=2000000000000000000  # 2 GEN
    )
    vid = str(tx.return_value)

    contract.connect(enterprise_client).file_misalignment_claim(
        args=[vid, "https://logs.ai/chat.txt", "https://kb.ai/truth.txt"]
    )

    # LLM mock returns an unsupported verdict string like 'UNCERTAIN_AMBIGUOUS_DRIFT'
    client.provider.make_request(
        method="sim_installMocks",
        params={
            "web_mocks": {".*": {"status": 200, "body": "Interaction logs"}},
            "llm_mocks": {
                ".*": json.dumps({
                    "canary": CANARY_TOKEN,
                    "verdict": "UNCERTAIN_AMBIGUOUS_DRIFT",
                    "confidence": 60,
                    "sycophancy_score": 40,
                    "factuality_score": 60,
                    "harm_index": 20,
                    "reason": "AI validator returned an unapproved verdict taxonomy"
                })
            }
        }
    )

    contract.connect(enterprise_client).adjudicate_alignment_claim(args=[vid])

    v_data = json.loads(contract.get_vault(args=[vid]).call())
    # MUST be non-settling STATUS_UNRESOLVED (9)
    assert v_data["status"] == STATUS_UNRESOLVED, "Status must be STATUS_UNRESOLVED (9), NOT CLEAN"
    assert v_data["verdict"] == "UNRESOLVED_PARSE_FAILED"
    assert "OBJECTIVE_ALIGNMENT_CLEAN" not in v_data["verdict"]
    assert v_data["escrow_amount"] == "2000000000000000000", "Escrow must remain 100% intact"

    # Cannot settle unresolved vault
    with pytest.raises(Exception):
        contract.connect(provider).finalize_settlement(args=[vid])
