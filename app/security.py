"""Acesso via código compartilhado, sem cadastro de usuários."""
from __future__ import annotations

import hmac
import os
import secrets
import time
from collections import defaultdict

from fastapi import HTTPException, Request
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

COOKIE = "paletes_session"
_MAX_AGE = 60 * 60 * 24 * 30
_attempts: dict[str, list[float]] = defaultdict(list)


def config() -> tuple[str, str]:
    code = os.getenv("ACCESS_CODE", "")
    secret = os.getenv("SESSION_SECRET", "")
    if len(code) < 8 or len(secret) < 32:
        raise RuntimeError("Configure ACCESS_CODE (8+ caracteres) e SESSION_SECRET (32+ caracteres) como segredos do servidor.")
    return code, secret


def serializer() -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(config()[1], salt="paletes-aeroportuarios-v1")


def is_authorized(request: Request) -> bool:
    token = request.cookies.get(COOKIE)
    if not token:
        return False
    try:
        return serializer().loads(token, max_age=_MAX_AGE) == "authorized"
    except (BadSignature, SignatureExpired):
        return False


def verify_code(code: str, request: Request) -> None:
    ip = (request.client.host if request.client else "unknown")[:90]
    now = time.monotonic()
    recent = [ts for ts in _attempts[ip] if now - ts < 900]
    # Evita acúmulo ilimitado de endereços maliciosos.
    if len(_attempts) > 2000:
        _attempts.clear()
    _attempts[ip] = recent
    if len(recent) >= 6:
        raise HTTPException(429, "Muitas tentativas. Tente novamente mais tarde.")
    expected = config()[0]
    if not hmac.compare_digest(code.encode("utf-8"), expected.encode("utf-8")):
        _attempts[ip].append(now)
        raise HTTPException(401, "Código de acesso incorreto.")
    _attempts.pop(ip, None)


def create_token() -> str:
    return serializer().dumps("authorized")


def is_secure_cookie() -> bool:
    return os.getenv("COOKIE_SECURE", "1") != "0"
