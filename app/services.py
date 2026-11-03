"""Regras de negócio: registro de cada turno e isenção dos dois primeiros períodos."""
from __future__ import annotations

import re
from collections import defaultdict
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError

from .database import Registro, session_factory

SAO_PAULO = ZoneInfo("America/Sao_Paulo")
VALID_SHIFTS = ("08:00", "20:00")


def today_local() -> date:
    return datetime.now(SAO_PAULO).date()


def validate_entry(palete: str, cia: str, turno: str) -> tuple[str, str, str]:
    if not isinstance(palete, str) or not re.fullmatch(r"[A-Za-z0-9]{1,30}", palete):
        raise ValueError("O palete deve conter de 1 a 30 letras ou números, sem espaços ou símbolos.")
    if not isinstance(cia, str) or not re.fullmatch(r"[0-9]{3}", cia):
        raise ValueError("O código da companhia aérea deve conter exatamente 3 números.")
    if turno not in VALID_SHIFTS:
        raise ValueError("O horário deve ser 08:00 ou 20:00.")
    return palete.upper(), cia, turno


def safe_device(value: str | None) -> str | None:
    if not value or not re.fullmatch(r"[A-Za-z0-9-]{1,64}", value):
        return None
    return value


def insert_entry(data: date, turno: str, palete: str, cia: str, dispositivo: str | None = None) -> dict:
    palete, cia, turno = validate_entry(palete, cia, turno)
    row = Registro(data=data, turno=turno, palete=palete, cia=cia,
                   criado_em=datetime.now(SAO_PAULO), dispositivo=safe_device(dispositivo))
    with session_factory() as session:
        try:
            session.add(row)
            session.commit()
        except IntegrityError as exc:
            session.rollback()
            raise ValueError("Este palete já foi registrado neste mesmo dia e horário.") from exc
    return {"id": row.id, "data": data.isoformat(), "turno": turno, "palete": palete, "cia": cia}


def recent_entries(data: date, limit: int = 80) -> list[dict]:
    with session_factory() as session:
        records = session.scalars(select(Registro).where(Registro.ativo.is_(True), Registro.data == data)
                                  .order_by(Registro.id.desc()).limit(limit)).all()
    return [{"id": r.id, "data": r.data.isoformat(), "turno": r.turno, "palete": r.palete,
             "cia": r.cia, "criado_em": r.criado_em.isoformat()} for r in records]


def remove_entry(record_id: int, data: date, dispositivo: str | None = None) -> bool:
    with session_factory() as session:
        stmt = (update(Registro).where(Registro.id == record_id, Registro.data == data,
                                       Registro.ativo.is_(True))
                .values(ativo=False, excluido_em=datetime.now(SAO_PAULO),
                        excluido_dispositivo=safe_device(dispositivo)))
        count = session.execute(stmt).rowcount
        session.commit()
        return count == 1


def parse_month(mes: str) -> tuple[date, date]:
    if not re.fullmatch(r"[0-9]{4}-(0[1-9]|1[0-2])", mes or ""):
        raise ValueError("Mês inválido: utilize AAAA-MM.")
    year, month = map(int, mes.split("-"))
    if not 2000 <= year <= 2100:
        raise ValueError("Ano fora do intervalo permitido (2000 a 2100).")
    return date(year, month, 1), date(year + (month == 12), (month % 12) + 1, 1)


def month_airlines(mes: str) -> list[str]:
    first, next_month = parse_month(mes)
    with session_factory() as session:
        rows = session.scalars(select(Registro.cia).distinct()
                               .where(Registro.ativo.is_(True), Registro.data >= first, Registro.data < next_month)
                               .order_by(Registro.cia)).all()
    return list(rows)


def monthly_report(mes: str, cia_filter: str | None = None) -> dict:
    """Processa apenas turnos registrados. Ausências quebram sequência.

    Contagem de 12h ancorada no horário de coleta (08/20) e continuidade entre meses;
    mesmo palete em companhias distintas reinicia a contagem.
    """
    first, next_month = parse_month(mes)
    if cia_filter is not None and not re.fullmatch(r"[0-9]{3}", cia_filter):
        raise ValueError("O filtro de companhia deve conter 3 números.")

    with session_factory() as session:
        rows = session.execute(select(Registro.data, Registro.turno, Registro.palete, Registro.cia)
            .where(Registro.ativo.is_(True), Registro.data < next_month)
            .order_by(Registro.data.asc(), Registro.turno.asc(), Registro.id.asc())).all()
    history = {}
    grouped = defaultdict(lambda: {"periodos_registrados": 0, "periodos_cobraveis": 0,
      "maior_sequencia": 0, "primeiro_registro": None, "ultimo_registro": None})
    for day, shift, pallet, cia in rows:
        instant = datetime.combine(day, time.fromisoformat(shift))
        prior = history.get(pallet)
        seq = prior[2] + 1 if prior and prior[1] == cia and instant - prior[0] == timedelta(hours=12) else 1
        history[pallet] = (instant, cia, seq)
        if not first <= day < next_month or (cia_filter is not None and cia != cia_filter):
            continue
        item = grouped[(cia, pallet)]
        item["periodos_registrados"] += 1
        item["maior_sequencia"] = max(item["maior_sequencia"], seq)
        moment = f"{day.isoformat()} {shift}"
        if item["primeiro_registro"] is None:
            item["primeiro_registro"] = moment
        item["ultimo_registro"] = moment
        if seq >= 3:
            item["periodos_cobraveis"] += 1

    items = [{"cia": cia, "palete": pallet, **stats,
              "horas_cobraveis": stats["periodos_cobraveis"] * 12}
             for (cia, pallet), stats in grouped.items() if stats["periodos_cobraveis"] > 0]
    items.sort(key=lambda x: (x["cia"], x["palete"]))
    return {"mes": mes, "cia": cia_filter,
            "regra": "2 primeiros períodos consecutivos isentos; a partir do 3º, 12h por período registrado.",
            "total_paletes": len(items),
            "total_periodos": sum(x["periodos_cobraveis"] for x in items),
            "total_horas": sum(x["horas_cobraveis"] for x in items),
            "itens": items}
