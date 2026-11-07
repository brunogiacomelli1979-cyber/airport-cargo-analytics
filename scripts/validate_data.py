#!/usr/bin/env python3
"""Validador reprodutivel da base educacional Airport Cargo.
Uso: python scripts/validate_data.py [--output caminho.json]
Sem dependencias externas; nao altera os CSVs de origem.
"""
from __future__ import annotations
import argparse
import csv
import json
from collections import Counter, defaultdict
from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIR = ROOT / "data" / "processed" / "csv"
TABLES = {
    "flights": ("flight_id", 120),
    "cargo": ("cargo_id", 1111),
    "manifest": ("manifest_id", 1111),
    "operations": ("operation_id", 1111),
    "inconsistencies": ("inconsistency_id", 394),
    "release_process": ("release_id", 1111),
    "delivery": ("delivery_id", 1111),
}
DT = "%Y-%m-%d %H:%M"


def read_table(name):
    with (DIR / (name + ".csv")).open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def timestamp(value):
    return datetime.strptime(value, DT)


def hours(start, end):
    return (timestamp(end) - timestamp(start)).total_seconds() / 3600


def validate():
    data = {name: read_table(name) for name in TABLES}
    errors = []
    for name, (pk, baseline) in TABLES.items():
        rows = data[name]
        keys = [r.get(pk, "").strip() for r in rows]
        if not rows or any(not v for v in keys):
            errors.append(f"{name}: identificador obrigatorio ausente")
        if len(keys) != len(set(keys)):
            errors.append(f"{name}: chave primaria duplicada")
        if len(rows) != baseline:
            errors.append(f"{name}: base esperada {baseline}, encontrada {len(rows)}; revisar versao/escopo")

    flights = {x["flight_id"]: x for x in data["flights"]}
    cargo = {x["cargo_id"]: x for x in data["cargo"]}
    operations = {x["cargo_id"]: x for x in data["operations"]}
    manifest = {x["cargo_id"]: x for x in data["manifest"]}
    release = {x["cargo_id"]: x for x in data["release_process"]}
    delivery = {x["cargo_id"]: x for x in data["delivery"]}
    for name in ("manifest", "operations", "release_process", "delivery"):
        refs = [x["cargo_id"] for x in data[name]]
        if len(refs) != len(set(refs)):
            errors.append(f"{name}: repeticao em relacao 1:1 com cargo")
        if set(refs) != set(cargo):
            errors.append(f"{name}: cobertura 1:1 ou integridade referencial incompleta")
    if any(x["flight_id"] not in flights for x in data["cargo"]):
        errors.append("cargo: voo nao encontrado")
    if any(x["cargo_id"] not in cargo for x in data["inconsistencies"]):
        errors.append("inconsistencies: cargo nao encontrada")

    inc = defaultdict(list)
    for item in data["inconsistencies"]:
        inc[item["cargo_id"]].append(item)
        try:
            if hours(item["detected_datetime"], item["resolved_datetime"]) < 0:
                errors.append(f"{item['inconsistency_id']}: resolucao anterior a deteccao")
        except (ValueError, TypeError) as exc:
            errors.append(f"{item['inconsistency_id']}: data invalida: {exc}")

    # Validate every stored datetime without imputing missing optional events.
    for name, rows in data.items():
        for row in rows:
            for key, value in row.items():
                if key.endswith("_datetime") and value:
                    try:
                        timestamp(value)
                    except (ValueError, TypeError):
                        errors.append(f"{name}: {key} invalida")
    event_pairs = {
        "operations": [("physical_receiving_start_datetime", "physical_receiving_end_datetime"),
                       ("physical_receiving_end_datetime", "depositary_system_receiving_datetime"),
                       ("conference_start_datetime", "conference_end_datetime")],
        "delivery": [("cargo_available_datetime", "pickup_request_datetime"),
                     ("pickup_request_datetime", "delivery_datetime")],
    }
    for name, pairs in event_pairs.items():
        for row in data[name]:
            for start, end in pairs:
                try:
                    if hours(row[start], row[end]) < 0:
                        errors.append(f"{name}: {end} anterior a {start}")
                except (ValueError, TypeError):
                    errors.append(f"{name}: evento obrigatorio invalido")
    for row in data["release_process"]:
        if row["anuence_required"] == "Sim" and not row["anuence_release_datetime"]:
            errors.append("release_process: anuencia exigida sem data")

    on_time = 0
    late = 0
    for f in data["flights"]:
        try:
            span = hours(f["aircraft_arrival_datetime"], f["mantra_closure_datetime"])
            assert span >= 0
            assert hours(f["aircraft_arrival_datetime"], f["legal_deadline_datetime"]) >= 0
            if timestamp(f["mantra_closure_datetime"]) <= timestamp(f["legal_deadline_datetime"]):
                on_time += 1
            else:
                late += 1
        except (ValueError, TypeError, AssertionError) as exc:
            errors.append(f"{f['flight_id']}: temporalidade de voo invalida: {exc}")

    awb = set()
    dwell_hours = []
    receiving_hours = []
    post_depositary_hours = []
    received_pieces = 0
    received_kg = 0.0
    for item in data["cargo"]:
        cid = item["cargo_id"]
        if item["awb_number"] in awb:
            errors.append(f"{cid}: AWB repetido no recorte")
        awb.add(item["awb_number"])
        try:
            f = flights[item["flight_id"]]
            o = operations[cid]
            dv = delivery[cid]
            receiv = hours(f["aircraft_arrival_datetime"], o["depositary_system_receiving_datetime"])
            closure = hours(o["depositary_system_receiving_datetime"], f["mantra_closure_datetime"])
            dwell = hours(f["aircraft_arrival_datetime"], dv["delivery_datetime"])
            if min(receiv, closure, dwell) < 0:
                errors.append(f"{cid}: duracao operacional negativa")
            receiving_hours.append(receiv)
            post_depositary_hours.append(closure)
            dwell_hours.append(dwell)
            pieces = int(item["received_pieces"])
            weight = float(item["received_weight_kg"])
            if pieces < 0 or weight < 0:
                errors.append(f"{cid}: quantidade ou peso negativo")
            received_pieces += pieces
            received_kg += weight
        except (KeyError, ValueError, TypeError) as exc:
            errors.append(f"{cid}: erro de integridade/tempo: {exc}")

    summary = {
        "source_type": "dados simulados / educacionais",
        "grain": {"flights": "flight_id", "cargo": "cargo_id", "inconsistencies": "inconsistency_id"},
        "table_rows": {name: len(rows) for name, rows in data.items()},
        "flight_on_time": on_time,
        "flight_late": late,
        "flight_on_time_pct": round(100 * on_time / max(1, len(flights)), 2),
        "manifest_error_cargo": sum(x["manifest_error_flag"] == "Sim" for x in manifest.values()),
        "cargo_with_inconsistency": len(inc),
        "cargo_with_rework": sum(any(x["rework_flag"] == "Sim" for x in events) for events in inc.values()),
        "storage_compliant_cargo": sum(x["storage_compliance_status"] == "Conforme" for x in operations.values()),
        "received_pieces": received_pieces,
        "received_weight_kg": round(received_kg, 2),
        "avg_hours_arrival_to_delivery": round(sum(dwell_hours) / len(dwell_hours), 3) if dwell_hours else None,
        "avg_hours_arrival_to_depositary": round(sum(receiving_hours) / len(receiving_hours), 3) if receiving_hours else None,
        "occurrences_by_responsibility": dict(sorted(Counter(x["responsibility_group"] for x in data["inconsistencies"]).items())),
        "avg_hours_depositary_to_closure": round(sum(post_depositary_hours) / len(post_depositary_hours), 3) if post_depositary_hours else None,
        "avg_hours_arrival_to_closure_per_flight": float((Decimal(sum(int((timestamp(f["mantra_closure_datetime"]) - timestamp(f["aircraft_arrival_datetime"])).total_seconds()) for f in data["flights"])) / Decimal(3600 * len(flights))).quantize(Decimal("0.001"), rounding=ROUND_HALF_UP)),
        "avg_occurrence_resolution_hours": round(sum(hours(i["detected_datetime"], i["resolved_datetime"]) for i in data["inconsistencies"]) / len(data["inconsistencies"]), 3),
        "physical_weight_divergence_cargo": sum(float(c["declared_weight_kg"]) != float(c["received_weight_kg"]) for c in data["cargo"]),
        "physical_pieces_divergence_cargo": sum(int(c["declared_pieces"]) != int(c["received_pieces"]) for c in data["cargo"]),
        "coverage_warning": "Sem eventos de warehouse_flow_events ou exportacao; nao calcular dwell operacional limpo ou ocupacao.",
        "errors": errors[:50],
        "error_count": len(errors),
    }
    if len(errors) > 50:
        summary["truncated_errors"] = len(errors) - 50
    return summary


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--output", help="Escreve resumo JSON no caminho informado")
    args = ap.parse_args()
    report = validate()
    encoded = json.dumps(report, ensure_ascii=False, indent=2)
    if args.output:
        p = Path(args.output)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(encoded + "\n", encoding="utf-8")
    print(encoded)
    raise SystemExit(1 if report["error_count"] else 0)


if __name__ == "__main__":
    main()
