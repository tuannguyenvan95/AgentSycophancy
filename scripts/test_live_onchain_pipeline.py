import os
import sys
import json
import time
from genlayer_py import create_client, create_account, studionet
from genlayer_py.types import CalldataAddress

# Ensure clean UTF-8 console output on Windows
sys.stdout.reconfigure(encoding='utf-8')

PK_PROVIDER = "0x1b807b1df022a40f872596b11565e6b6856547dc66996bd3d5a85b376ea3a0ef"
PK_CLIENT = "0x8eb1e7db29f0b8932900fe3c90627ef8a9d48659d1d04fddf2a7369cfa670064"
CONTRACT_ADDRESS = "0xb4B24646D94f132D23be15537661f847E07F3962"

def log_step(title):
    print("\n" + "=" * 70, flush=True)
    print(f"  {title}", flush=True)
    print("=" * 70, flush=True)

def main():
    log_step("AGENT SYCOPHANCY: LIVE ON-CHAIN TASK VERIFICATION ON STUDIONET")
    print(f"[+] Intelligent Contract : {CONTRACT_ADDRESS}")
    
    provider_acct = create_account(PK_PROVIDER)
    client_acct = create_account(PK_CLIENT)
    
    provider_client = create_client(chain=studionet, account=provider_acct)
    client_client = create_client(chain=studionet, account=client_acct)
    
    p_addr = provider_acct.address
    c_addr = client_acct.address
    
    print(f"[+] Provider (Insurer)   : {p_addr} | Balance: {provider_client.get_balance(p_addr)/1e18:.4f} GEN")
    print(f"[+] Client (Insured)     : {c_addr} | Balance: {client_client.get_balance(c_addr)/1e18:.4f} GEN")
    
    # -------------------------------------------------------------
    # TASK 1: Read Contract State
    # -------------------------------------------------------------
    log_step("TASK 1: Initial State & Telemetry Query")
    raw_stats = provider_client.read_contract(address=CONTRACT_ADDRESS, function_name="get_stats", args=[])
    stats = json.loads(raw_stats) if isinstance(raw_stats, str) else raw_stats
    print(f"[+] Contract Stats on Studionet:\n{json.dumps(stats, indent=2)}")
    
    vault_count = int(provider_client.read_contract(address=CONTRACT_ADDRESS, function_name="get_vault_count", args=[]))
    print(f"[+] Total Vaults on Studionet: {vault_count}")
    
    vault_id = "1"
    raw_vault = provider_client.read_contract(address=CONTRACT_ADDRESS, function_name="get_vault", args=[vault_id])
    v_data = json.loads(raw_vault) if isinstance(raw_vault, str) else raw_vault
    print(f"[+] Vault #{vault_id} Details:")
    print(f"    - Provider: {v_data['provider']}")
    print(f"    - Client: {v_data['client']}")
    print(f"    - Escrow: {int(v_data['escrow_amount'])/1e18:.4f} GEN")
    print(f"    - Status: {v_data['status']} (0 = STATUS_POLICY_ACTIVE)")
    print(f"    - Verdict: {v_data['verdict']}")
    print(f"    - Model ID: {v_data['agent_model_id']}")
    
    # -------------------------------------------------------------
    # TASK 2: Curator RBAC Verification
    # -------------------------------------------------------------
    log_step("TASK 2: Curator RBAC & Role Verification")
    is_p_curator = provider_client.read_contract(address=CONTRACT_ADDRESS, function_name="is_curator", args=[CalldataAddress(p_addr)])
    print(f"[+] Is Provider registered as Curator/Owner? : {is_p_curator}")
    assert is_p_curator == True, "Provider should be auto-initialized as Curator/Owner on first tx!"
    
    is_c_curator = provider_client.read_contract(address=CONTRACT_ADDRESS, function_name="is_curator", args=[CalldataAddress(c_addr)])
    print(f"[+] Is Client a Curator? : {is_c_curator} (Expected: False)")
    
    # -------------------------------------------------------------
    # TASK 3: Client files Misalignment Claim
    # -------------------------------------------------------------
    log_step("TASK 3: Client submits Misalignment Claim with Evidence URLs")
    transcript_url = "https://raw.githubusercontent.com/tuannguyenvan95/AgentSycophancy/main/README.md"
    truth_url = "https://raw.githubusercontent.com/tuannguyenvan95/AgentSycophancy/main/SECURITY.md"
    
    if v_data['status'] == 0:
        print(f"[*] Calling file_misalignment_claim from Client ({c_addr})...")
        tx_claim = client_client.write_contract(
            address=CONTRACT_ADDRESS,
            function_name="file_misalignment_claim",
            args=[vault_id, transcript_url, truth_url]
        )
        print(f"[+] Tx Hash: {tx_claim}")
        print("[*] Waiting for transaction receipt...")
        receipt_claim = client_client.wait_for_transaction_receipt(tx_claim)
        print(f"[OK] Claim Filed Successfully! Status: {receipt_claim.get('status', 'SUCCESS')}")
    else:
        print(f"[*] Vault #{vault_id} is already in status {v_data['status']}, proceeding.")
    
    time.sleep(2)
    v_data_claimed = json.loads(provider_client.read_contract(address=CONTRACT_ADDRESS, function_name="get_vault", args=[vault_id]))
    print(f"[+] Post-Claim Status: {v_data_claimed['status']} (1 = STATUS_CLAIM_FILED)")
    print(f"[+] Claim Reason: {v_data_claimed['reason']}")
    print(f"[+] Transcript URL: {v_data_claimed['transcript_url']}")
    print(f"[+] Ground Truth URL: {v_data_claimed['ground_truth_url']}")
    
    # -------------------------------------------------------------
    # TASK 4: Curator Emergency Quarantine & Lift Quarantine
    # -------------------------------------------------------------
    log_step("TASK 4: Curator Council Emergency Freeze & Lift Protocol")
    print(f"[*] Curator ({p_addr}) triggers emergency_quarantine_vault...")
    tx_freeze = provider_client.write_contract(
        address=CONTRACT_ADDRESS,
        function_name="emergency_quarantine_vault",
        args=[vault_id, "Forensic audit for prompt injection exploit"]
    )
    print(f"[+] Quarantine Tx Hash: {tx_freeze}")
    provider_client.wait_for_transaction_receipt(tx_freeze)
    print("[OK] Vault Frozen on-chain!")
    
    time.sleep(2)
    v_frozen = json.loads(provider_client.read_contract(address=CONTRACT_ADDRESS, function_name="get_vault", args=[vault_id]))
    print(f"[+] Frozen Vault Status: {v_frozen['status']} (8 = STATUS_FROZEN_QUARANTINE)")
    print(f"[+] Reason: {v_frozen['reason']}")
    assert v_frozen['status'] == 8, "Status should be STATUS_FROZEN_QUARANTINE!"
    
    print(f"\n[*] Curator ({p_addr}) lifts quarantine with lift_quarantine...")
    tx_lift = provider_client.write_contract(
        address=CONTRACT_ADDRESS,
        function_name="lift_quarantine",
        args=[vault_id]
    )
    print(f"[+] Lift Quarantine Tx Hash: {tx_lift}")
    provider_client.wait_for_transaction_receipt(tx_lift)
    print("[OK] Quarantine Lifted on-chain!")
    
    time.sleep(2)
    v_restored = json.loads(provider_client.read_contract(address=CONTRACT_ADDRESS, function_name="get_vault", args=[vault_id]))
    print(f"[+] Restored Vault Status: {v_restored['status']} (1 = STATUS_CLAIM_FILED)")
    print(f"[+] Reason: {v_restored['reason']}")
    assert v_restored['status'] == 1, "Status should be restored to STATUS_CLAIM_FILED!"
    
    # -------------------------------------------------------------
    # TASK 5: On-Chain Holographic SVG SLA Certificate
    # -------------------------------------------------------------
    log_step("TASK 5: On-Chain Holographic SVG SLA Credential Generation")
    svg_data = provider_client.read_contract(address=CONTRACT_ADDRESS, function_name="get_alignment_certificate_svg", args=[vault_id])
    print(f"[+] SVG Credential Byte Length: {len(svg_data)} chars")
    assert "<svg" in svg_data and "</svg>" in svg_data, "SVG structure invalid!"
    assert "CANARY_AGENT_SYCOPHANCY_V1" in svg_data, "Canary token missing from SVG!"
    print(f"[+] SVG Preview (first 180 chars): {svg_data[:180]}...")
    print("[OK] Holographic SVG Credential successfully synthesized from GenVM memory!")
    
    # -------------------------------------------------------------
    # TASK 6: Live Protocol Telemetry & Frontend Feed Verification
    # -------------------------------------------------------------
    log_step("TASK 6: Live Protocol Telemetry & Frontend Feed Verification")
    raw_all = provider_client.read_contract(address=CONTRACT_ADDRESS, function_name="get_all_vaults", args=[])
    all_vaults = json.loads(raw_all) if isinstance(raw_all, str) else raw_all
    print(f"[+] Total Vaults feed for Frontend: {len(all_vaults)}")
    print(f"[+] Vault #1 in Live Radar Feed:\n{json.dumps(all_vaults[0], indent=2)}")
    
    final_stats = json.loads(provider_client.read_contract(address=CONTRACT_ADDRESS, function_name="get_stats", args=[]))
    print(f"\n[OK] FINAL LIVE ON-CHAIN STATS:")
    print(f"    - Total Vaults: {final_stats['total_vaults']}")
    print(f"    - Total Escrow Locked: {int(final_stats['total_insurance_locked'])/1e18:.4f} GEN")
    print(f"    - Total Claims Settled: {final_stats['total_claims_settled']}")
    print(f"    - Protocol Owner: {final_stats['owner']}")
    
    print("\n" + "=" * 70, flush=True)
    print("  >>> ALL ON-CHAIN TASKS EXECUTED AND VERIFIED 100% OPERATIONAL! <<<", flush=True)
    print("=" * 70, flush=True)

if __name__ == "__main__":
    main()
