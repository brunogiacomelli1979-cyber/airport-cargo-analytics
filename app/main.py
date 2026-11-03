"""Aplicativo web completo: PWA, API e relatórios com PostgreSQL central."""
from __future__ import annotations

import csv
import io
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy import text

from .database import ROOT, engine, init_database
from .security import COOKIE, config, create_token, is_authorized, is_secure_cookie, verify_code
from .services import (
    SAO_PAULO, insert_entry, month_airlines, monthly_report,
    recent_entries, remove_entry, today_local,
)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    config()
    init_database()
    yield


app = FastAPI(title="Controle de Paletes Aeronáuticos", version="2.0.0",
              lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)
app.mount("/static", StaticFiles(directory=ROOT / "static"), name="static")


@app.middleware("http")
async def access_and_headers(request: Request, call_next):
    path = request.url.path
    public = path == "/entrar" or path == "/api/acesso/entrar" or path == "/api/saude" or path == "/manifest.webmanifest" or path == "/sw.js" or path.startswith("/static/")
    if not public and not is_authorized(request):
        if path.startswith("/api/"):
            return JSONResponse({"detail": "Acesso expirado. Digite novamente o código de acesso."}, status_code=401)
        return RedirectResponse("/entrar", status_code=303)
    if path.startswith("/api/") and request.method in ("POST", "PUT", "PATCH", "DELETE"):
        if request.headers.get("X-Paletes-Action") != "1":
            return JSONResponse({"detail": "Requisição inválida (cabeçalho de segurança ausente)."}, status_code=403)
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    if path.startswith("/api/") or path == "/entrar" or path == "/relatorios":
        response.headers["Cache-Control"] = "no-store"
    return response


class EntryIn(BaseModel):
    turno: str
    palete: str
    cia: str


class AccessIn(BaseModel):
    codigo: str


@app.get("/", include_in_schema=False)
def home():
    return FileResponse(ROOT / "static" / "index.html", media_type="text/html", headers={"Cache-Control": "no-store"})


@app.get("/entrar", include_in_schema=False)
def access_page(request: Request):
    if is_authorized(request):
        return RedirectResponse("/", status_code=303)
    return FileResponse(ROOT / "static" / "entrar.html", media_type="text/html")


@app.get("/relatorios", include_in_schema=False)
def reports_page():
    return FileResponse(ROOT / "static" / "relatorios.html", media_type="text/html")


@app.get("/manifest.webmanifest", include_in_schema=False)
def manifest():
    return FileResponse(ROOT / "static" / "manifest.webmanifest", media_type="application/manifest+json")


@app.get("/sw.js", include_in_schema=False)
def service_worker():
    return FileResponse(ROOT / "static" / "sw.js", media_type="application/javascript",
                        headers={"Service-Worker-Allowed": "/"})


@app.post("/api/acesso/entrar")
def access_login(payload: AccessIn, request: Request):
    verify_code(payload.codigo, request)
    response = JSONResponse({"autorizado": True})
    response.set_cookie(COOKIE, create_token(), max_age=60*60*24*30,
                        httponly=True, secure=is_secure_cookie(), samesite="lax", path="/")
    return response


@app.post("/api/acesso/sair")
def access_logout():
    response = JSONResponse({"autorizado": False})
    response.delete_cookie(COOKIE, path="/")
    return response


@app.get("/api/contexto")
def context():
    now = datetime.now(SAO_PAULO)
    return {"data": today_local().isoformat(), "data_legivel": now.strftime("%d/%m/%Y"),
            "mes": now.strftime("%Y-%m"), "turno_sugerido": "08:00" if now.hour < 14 else "20:00",
            "fuso": "America/Sao_Paulo"}


@app.post("/api/registros", status_code=201)
def create_entry(payload: EntryIn, request: Request):
    try:
        return insert_entry(today_local(), payload.turno, payload.palete, payload.cia, request.headers.get("X-Device-Id"))
    except ValueError as exc:
        raise HTTPException(status_code=409 if "já foi registrado" in str(exc) else 422, detail=str(exc)) from exc


@app.get("/api/registros")
def list_entries():
    today = today_local()
    records = recent_entries(today)
    return {"data": today.isoformat(), "total_exibido": len(records), "itens": records}


@app.delete("/api/registros/{record_id}")
def delete_entry(record_id: int, request: Request):
    if record_id < 1 or not remove_entry(record_id, today_local(), request.headers.get("X-Device-Id")):
        raise HTTPException(status_code=404, detail="Registro não encontrado no dia atual.")
    return {"excluido": True, "id": record_id}


@app.get("/api/cias")
def list_airlines(mes: str = Query(...)):
    try:
        return {"mes": mes, "cias": month_airlines(mes)}
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.get("/api/relatorios")
def get_report(mes: str = Query(...), cia: str = Query(...)):
    try:
        return monthly_report(mes, cia)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.get("/api/relatorios/csv")
def export_csv(mes: str = Query(...), cia: str = Query(...)):
    try:
        report = monthly_report(mes, cia)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    buffer = io.StringIO(newline="")
    writer = csv.writer(buffer, delimiter=";")
    writer.writerow(["Mês", "Companhia aérea", "Palete", "Períodos registrados no mês", "Maior sequência consecutiva", "Períodos cobrados", "Horas cobradas", "Primeiro registro", "Último registro"])
    for item in report["itens"]:
        writer.writerow([mes, item["cia"], item["palete"], item["periodos_registrados"],
                         item["maior_sequencia"], item["periodos_cobraveis"], item["horas_cobraveis"],
                         item["primeiro_registro"], item["ultimo_registro"]])
    writer.writerow(["TOTAL", cia, "", "", "", report["total_periodos"], report["total_horas"], "", ""])
    return Response(content="\ufeff"+buffer.getvalue(), media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="permanencia_{mes}_cia_{cia}.csv"'})


@app.get("/api/saude")
def health_check():
    try:
        with engine().connect() as connection:
            connection.execute(text("SELECT 1"))
        return {"status": "ok"}
    except Exception:
        return JSONResponse({"status": "banco indisponível"}, status_code=503)
