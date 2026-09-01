"""Reproducible TerraNode benchmarks with honest labels and machine-readable output."""

import argparse
import csv
import hashlib
import json
import os
import platform
import statistics
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "backend"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

import django

django.setup()

from django.core.cache import cache
from django.conf import settings

from apps.telemetry.encryption_service import (
    decrypt_telemetry_payload,
    encrypt_telemetry_payload,
    serialize_canonical_plaintext,
)


def summary(durations_ms):
    ordered = sorted(durations_ms)
    count = len(ordered)
    percentile_index = max(0, min(count - 1, int(count * 0.95) - 1))
    mean_ms = statistics.mean(ordered)
    return {
        "status": "measured",
        "sample_size": count,
        "mean_ms": round(mean_ms, 6),
        "median_ms": round(statistics.median(ordered), 6),
        "p95_ms": round(ordered[percentile_index], 6),
        "min_ms": round(ordered[0], 6),
        "max_ms": round(ordered[-1], 6),
        "operations_per_second": round(1000 / mean_ms, 2) if mean_ms else None,
    }


def time_call(operation, iterations):
    durations = []
    for _ in range(iterations):
        started = time.perf_counter_ns()
        operation()
        durations.append((time.perf_counter_ns() - started) / 1_000_000)
    return summary(durations)


def crypto_benchmarks(iterations):
    key = bytes(range(32))
    farmer_id = "benchmark-farmer"
    recorded_at = "2026-09-01T00:00:00+00:00"
    values = (28.5, 60.0, 6.5)
    canonical = serialize_canonical_plaintext(
        farmer_id, recorded_at, *values
    )

    hash_result = time_call(lambda: hashlib.sha256(canonical).hexdigest(), iterations)
    encrypt_result = time_call(
        lambda: encrypt_telemetry_payload(
            farmer_id, recorded_at, *values, key_bytes=key
        ),
        iterations,
    )
    encrypted = [
        encrypt_telemetry_payload(
            farmer_id, recorded_at, *values, key_bytes=key
        )
        for _ in range(iterations)
    ]
    encrypted_iter = iter(encrypted)

    def decrypt_next():
        ciphertext, nonce, tag, _ = next(encrypted_iter)
        decrypt_telemetry_payload(
            farmer_id,
            recorded_at,
            ciphertext,
            nonce,
            tag,
            key_bytes=key,
        )

    decrypt_result = time_call(decrypt_next, iterations)
    return {
        "canonical_payload_bytes": len(canonical),
        "sha256": hash_result,
        "aes_256_gcm_encrypt": encrypt_result,
        "aes_256_gcm_decrypt_and_parse": decrypt_result,
        "notes": "Each AES-GCM encryption uses a fresh 96-bit random nonce.",
    }


def cache_benchmark(iterations):
    key = "benchmark:terranode:cache"
    value = {"source": "benchmark", "value": 1}
    try:
        cache.set(key, value, timeout=60)
        if cache.get(key) != value:
            raise RuntimeError("cache round-trip returned a different value")
        result = time_call(lambda: cache.get(key), iterations)
        configured = settings.CACHES["default"]
        backend = configured.get("BACKEND", "unknown")
        result["configured_backend"] = backend
        result["backend_kind"] = (
            "redis" if "redis" in backend.lower() else "local_or_other"
        )
        result["notes"] = (
            "This measures direct Django cache get latency, not API latency."
        )
        cache.delete(key)
        return result
    except Exception as exc:
        return {
            "status": "skipped",
            "reason": f"Configured cache backend unavailable: {type(exc).__name__}: {exc}",
        }


def graphql_call(graphql_url, query, variables=None):
    payload = json.dumps(
        {"query": query, "variables": variables or {}}
    ).encode("utf-8")
    request = urllib.request.Request(
        graphql_url,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "User-Agent": "TerraNode-Benchmark/2.0",
        },
    )
    with urllib.request.urlopen(request, timeout=15) as response:
        body = json.loads(response.read().decode("utf-8"))
    if body.get("errors"):
        raise RuntimeError(body["errors"])
    return body.get("data")


def network_benchmark(name, operation, iterations):
    durations = []
    failures = []
    for _ in range(iterations):
        started = time.perf_counter_ns()
        try:
            operation()
            durations.append((time.perf_counter_ns() - started) / 1_000_000)
        except Exception as exc:
            failures.append(f"{type(exc).__name__}: {exc}")
    if not durations:
        return {
            "status": "skipped",
            "operation": name,
            "failures": failures,
        }
    result = summary(durations)
    result.update(
        {
            "operation": name,
            "failed_samples": len(failures),
            "failures": failures,
        }
    )
    return result


def http_get(url, token=None):
    headers = {"User-Agent": "TerraNode-Benchmark/2.0"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(request, timeout=15) as response:
        response.read()
        if response.status >= 400:
            raise RuntimeError(f"HTTP {response.status}")


def api_benchmark(url, token, iterations):
    if not url:
        return {
            "status": "skipped",
            "reason": "Pass --api-benchmark-url to measure a deployed endpoint.",
            "notes": (
                "No cached-versus-uncached API claim is made without an explicit "
                "deployed endpoint and controlled cache state."
            ),
        }
    first = network_benchmark("first_http_get", lambda: http_get(url, token), 1)
    warm = network_benchmark(
        "subsequent_http_get",
        lambda: http_get(url, token),
        iterations,
    )
    return {
        "status": "measured" if warm.get("status") == "measured" else "partial",
        "url": url,
        "first_request": first,
        "subsequent_requests": warm,
        "caveat": "The script does not claim a cache hit unless server-side evidence confirms one.",
    }


def flatten_rows(data):
    rows = []
    for category, values in data.items():
        if not isinstance(values, dict):
            continue
        for metric, result in values.items():
            if not isinstance(result, dict) or "status" not in result:
                continue
            rows.append(
                {
                    "category": category,
                    "metric": metric,
                    "status": result.get("status"),
                    "sample_size": result.get("sample_size"),
                    "mean_ms": result.get("mean_ms"),
                    "median_ms": result.get("median_ms"),
                    "p95_ms": result.get("p95_ms"),
                    "min_ms": result.get("min_ms"),
                    "max_ms": result.get("max_ms"),
                    "operations_per_second": result.get("operations_per_second"),
                    "reason": result.get("reason"),
                }
            )
    return rows


def write_results(data):
    output_dir = ROOT / "docs" / "benchmarks"
    output_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    json_path = output_dir / f"benchmark-{stamp}.json"
    csv_path = output_dir / f"benchmark-{stamp}.csv"
    latest_path = ROOT / "docs" / "benchmark-results.json"
    rendered = json.dumps(data, indent=2)
    json_path.write_text(rendered + "\n", encoding="utf-8")
    latest_path.write_text(rendered + "\n", encoding="utf-8")
    rows = flatten_rows(data)
    fieldnames = [
        "category",
        "metric",
        "status",
        "sample_size",
        "mean_ms",
        "median_ms",
        "p95_ms",
        "min_ms",
        "max_ms",
        "operations_per_second",
        "reason",
    ]
    with csv_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    return json_path, csv_path, latest_path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--iterations", type=int, default=500)
    parser.add_argument("--network-iterations", type=int, default=5)
    parser.add_argument(
        "--sui-graphql-url",
        default=os.environ.get(
            "SUI_GRAPHQL_URL", "https://graphql.testnet.sui.io/graphql"
        ),
    )
    parser.add_argument("--tx-digest")
    parser.add_argument("--api-benchmark-url")
    parser.add_argument("--access-token")
    args = parser.parse_args()
    if args.iterations < 2 or args.network_iterations < 1:
        parser.error("iterations must be >= 2 and network-iterations must be >= 1")

    timestamp = datetime.now(timezone.utc).isoformat()
    results = {
        "schema_version": 3,
        "timestamp_utc": timestamp,
        "environment": {
            "python_version": platform.python_version(),
            "system": platform.system(),
            "release": platform.release(),
            "machine": platform.machine(),
            "processor": platform.processor(),
        },
        "cryptography": crypto_benchmarks(args.iterations),
        "cache_backend_roundtrip": {
            "cache_get": cache_benchmark(args.iterations)
        },
        "api_latency": {
            "deployed_endpoint": api_benchmark(
                args.api_benchmark_url,
                args.access_token,
                args.network_iterations,
            )
        },
        "sui_testnet": {
            "chain_identifier_graphql": network_benchmark(
                "Query.chainIdentifier",
                lambda: graphql_call(
                    args.sui_graphql_url, "{ chainIdentifier }"
                ),
                args.network_iterations,
            ),
            "transaction_lookup_graphql": (
                network_benchmark(
                    "Query.transaction",
                    lambda: graphql_call(
                        args.sui_graphql_url,
                        "query Transaction($digest: String!) { transaction(digest: $digest) { digest effects { status } } }",
                        {"digest": args.tx_digest},
                    ),
                    args.network_iterations,
                )
                if args.tx_digest
                else {
                    "status": "skipped",
                    "reason": "Pass --tx-digest to measure a real transaction lookup.",
                }
            ),
            "graphql_url": args.sui_graphql_url,
        },
    }
    paths = write_results(results)
    print(json.dumps(results, indent=2))
    print("Wrote:")
    for path in paths:
        print(f"  {path}")


if __name__ == "__main__":
    main()
