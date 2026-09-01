import os
import sys
import time
import json
import base64
import statistics
import platform
import urllib.request
from datetime import datetime

# Setup Django environment
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "backend")))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
import django
django.setup()

from django.core.cache import cache
from apps.telemetry.encryption_service import encrypt_telemetry_payload, decrypt_telemetry_payload, get_encryption_key

def measure_crypto_throughput(iterations=500):
    key = get_encryption_key()
    durations = []

    for _ in range(iterations):
        t0 = time.perf_counter()
        ct, nonce, tag, h = encrypt_telemetry_payload("farmer_1", "2025-01-01T12:00:00Z", 28.5, 60.0, 6.5, key_bytes=key)
        decrypt_telemetry_payload("farmer_1", "2025-01-01T12:00:00Z", ct, nonce, tag, key_bytes=key)
        t1 = time.perf_counter()
        durations.append((t1 - t0) * 1000.0)

    return {
        "sample_size": iterations,
        "mean_ms": round(statistics.mean(durations), 4),
        "stdev_ms": round(statistics.stdev(durations), 4),
        "min_ms": round(min(durations), 4),
        "max_ms": round(max(durations), 4)
    }

def measure_sui_rpc_latency(rpc_url="https://fullnode.testnet.sui.io:443", iterations=5):
    durations = []
    payload = json.dumps({"jsonrpc": "2.0", "id": 1, "method": "sui_getChainIdentifier", "params": []}).encode("utf-8")

    for _ in range(iterations):
        t0 = time.perf_counter()
        try:
            req = urllib.request.Request(rpc_url, data=payload, headers={"Content-Type": "application/json", "User-Agent": "TerraNode-Benchmark/1.0"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                resp.read()
            t1 = time.perf_counter()
            durations.append((t1 - t0) * 1000.0)
        except Exception as e:
            pass

    if not durations:
        return {"error": "RPC Unreachable"}

    return {
        "rpc_url": rpc_url,
        "sample_size": len(durations),
        "mean_ms": round(statistics.mean(durations), 2),
        "min_ms": round(min(durations), 2),
        "max_ms": round(max(durations), 2)
    }

def run_benchmarks():
    timestamp = datetime.utcnow().isoformat() + "Z"
    sys_info = {
        "python_version": platform.python_version(),
        "system": platform.system(),
        "machine": platform.machine(),
        "processor": platform.processor()
    }

    print("Executing Cryptographic Throughput Benchmark (AES-256-GCM + SHA-256)...")
    crypto_res = measure_crypto_throughput(iterations=500)

    print("Executing Sui Testnet RPC Latency Benchmark...")
    rpc_res = measure_sui_rpc_latency()

    benchmark_data = {
        "timestamp": timestamp,
        "environment": sys_info,
        "crypto_operations": crypto_res,
        "sui_testnet_rpc": rpc_res
    }

    os.makedirs("docs", exist_ok=True)
    out_file = "docs/benchmark-results.json"
    with open(out_file, "w") as f:
        json.dump(benchmark_data, f, indent=2)

    print(f"Benchmark results successfully saved to {out_file}:")
    print(json.dumps(benchmark_data, indent=2))

if __name__ == "__main__":
    run_benchmarks()
