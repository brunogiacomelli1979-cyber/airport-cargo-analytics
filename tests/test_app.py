"""Teste integral da lógica de faturamento e segurança sem serviços externos."""
from concurrent.futures import ThreadPoolExecutor
from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.database import Registro, session_factory
from app.main import app
from app.services import insert_entry, monthly_report, remove_entry

HEADERS = {'X-Paletes-Action':'1'}


@pytest.fixture
def client(tmp_path, monkeypatch):
    from app.security import _attempts
    _attempts.clear()
    monkeypatch.delenv('DATABASE_URL', raising=False)
    monkeypatch.delenv('PRODUCTION', raising=False)
    monkeypatch.delenv('RAILWAY_ENVIRONMENT', raising=False)
    monkeypatch.setenv('PALETES_DB_PATH', str(tmp_path/'db.sqlite3'))
    monkeypatch.setenv('ACCESS_CODE', 'COLETA-FORTE-1234')
    monkeypatch.setenv('SESSION_SECRET', 'abcdefgh1234567890abcdefgh1234567890')
    monkeypatch.setenv('COOKIE_SECURE', '0')
    monkeypatch.setattr('app.main.today_local', lambda: date(2026,11,3))
    with TestClient(app, follow_redirects=False) as c:
        yield c


@pytest.fixture
def authorized(client):
    r=client.post('/api/acesso/entrar', json={'codigo':'COLETA-FORTE-1234'},headers=HEADERS)
    assert r.status_code==200
    return client


def entry(day,shift,pallet,airline='001'):
    return insert_entry(date.fromisoformat(day),shift,pallet,airline)


def post(c,pallet='PMC1',cia='001',turno='08:00'):
    return c.post('/api/registros',json={'palete':pallet,'cia':cia,'turno':turno},headers=HEADERS)


def test_anonymous_denied(client):
    assert client.get('/').status_code==303
    assert client.get('/').headers['location']=='/entrar'
    assert client.get('/relatorios').status_code==303
    assert client.get('/api/registros').status_code==401
    assert post(client).status_code==401
    assert client.get('/api/relatorios/csv?mes=2026-11&cia=001').status_code==401
    assert client.get('/api/saude').json()=={'status':'ok'}
    assert client.get('/entrar').status_code==200


def test_login_code_strict_cookie_secure_attributes(client):
    assert client.post('/api/acesso/entrar',json={'codigo':'x'},headers=HEADERS).status_code==401
    r=client.post('/api/acesso/entrar',json={'codigo':'COLETA-FORTE-1234'},headers=HEADERS)
    assert r.status_code==200
    assert 'HttpOnly' in r.headers['set-cookie']
    assert 'samesite=lax' in r.headers['set-cookie'].lower()
    assert client.get('/').status_code==200
    assert client.post('/api/acesso/sair',headers=HEADERS).status_code==200
    assert client.get('/api/registros').status_code==401


def test_limit_wrong_code_attempts(client):
    for _ in range(6):
        assert client.post('/api/acesso/entrar',json={'codigo':'wrong'},headers=HEADERS).status_code==401
    assert client.post('/api/acesso/entrar',json={'codigo':'COLETA-FORTE-1234'},headers=HEADERS).status_code==429


def test_prevent_csrf_action_without_header(authorized):
    assert authorized.post('/api/registros',json={'palete':'PMC1','cia':'001','turno':'08:00'}).status_code==403
    assert authorized.delete('/api/registros/1').status_code==403


def test_registro_uppercase_and_3_digits(authorized):
    r=post(authorized,pallet='pmc99',cia='001')
    assert r.status_code==201
    assert r.json()['data']=='2026-11-03'
    assert r.json()['palete']=='PMC99'
    assert r.json()['cia']=='001'
    assert authorized.get('/api/registros').json()['itens'][0]['palete']=='PMC99'


@pytest.mark.parametrize('pallet',['','ABC 9',' 123','A-B','A_B','ç123','A'*31])
def test_reject_invalid_pallet(authorized,pallet):
    assert post(authorized,pallet=pallet).status_code==422


@pytest.mark.parametrize('company',['01','1234','1A3',' 123','１２３',''])
def test_reject_invalid_airline(authorized,company):
    assert post(authorized,cia=company).status_code==422


def test_reject_invalid_shift(authorized):
    assert post(authorized,turno='09:00').status_code==422


def test_duplicate_in_slot(authorized):
    assert post(authorized,pallet='abc1',cia='057').status_code==201
    assert post(authorized,pallet='ABC1',cia='057').status_code==409
    assert post(authorized,pallet='ABC1',cia='058').status_code==409
    assert post(authorized,pallet='ABC1',cia='057',turno='20:00').status_code==201


def test_cross_device_visibility(authorized):
    assert post(authorized,pallet='PMC7').status_code==201
    assert any(x['palete']=='PMC7' for x in authorized.get('/api/registros').json()['itens'])


def test_user_example_three_records_one_charged(authorized):
    for d,s in [('2026-10-12','08:00'),('2026-10-12','20:00'),('2026-10-13','08:00')]:
        entry(d,s,'PMC100')
    report=monthly_report('2026-10','001')
    assert report['total_periodos']==1
    assert report['total_horas']==12
    assert report['itens'][0]['maior_sequencia']==3


def test_only_two_free(authorized):
    entry('2026-10-12','08:00','PMC100')
    entry('2026-10-12','20:00','PMC100')
    assert monthly_report('2026-10','001')['itens']==[]


def test_five_periods_three_charged(authorized):
    for d,s in [('2026-10-12','08:00'),('2026-10-12','20:00'),('2026-10-13','08:00'),('2026-10-13','20:00'),('2026-10-14','08:00')]:
        entry(d,s,'PMC100')
    assert monthly_report('2026-10','001')['total_periodos']==3


def test_gap_restarts(authorized):
    for d,s in [('2026-10-12','08:00'),('2026-10-12','20:00'),('2026-10-13','20:00'),('2026-10-14','08:00')]:
        entry(d,s,'PMC100')
    assert monthly_report('2026-10','001')['total_periodos']==0


def test_airline_change_restarts(authorized):
    entry('2026-10-12','08:00','PMC100','001')
    entry('2026-10-12','20:00','PMC100','002')
    entry('2026-10-13','08:00','PMC100','002')
    assert monthly_report('2026-10','002')['total_periodos']==0


def test_airlines_separate(authorized):
    for cia,pallet in [('001','PMC1'),('057','PMC2')]:
        for d,s in [('2026-10-12','08:00'),('2026-10-12','20:00'),('2026-10-13','08:00')]:
            entry(d,s,pallet,cia)
    assert monthly_report('2026-10','001')['itens'][0]['palete']=='PMC1'
    assert monthly_report('2026-10','057')['itens'][0]['palete']=='PMC2'
    assert authorized.get('/api/cias?mes=2026-10').json()['cias']==['001','057']


def test_cross_month(authorized):
    for d,s in [('2026-01-31','08:00'),('2026-01-31','20:00'),('2026-02-01','08:00'),('2026-02-01','20:00')]:
        entry(d,s,'PMC100')
    assert monthly_report('2026-01','001')['total_periodos']==0
    assert monthly_report('2026-02','001')['total_periodos']==2
    assert monthly_report('2026-02','001')['itens'][0]['maior_sequencia']==4


def test_soft_delete_and_reentry(authorized):
    r=post(authorized,pallet='PMC1').json()
    assert authorized.delete(f'/api/registros/{r["id"]}',headers=HEADERS).status_code==200
    assert authorized.get('/api/registros').json()['itens']==[]
    assert post(authorized,pallet='PMC1').status_code==201
    with session_factory() as s:
        records=s.scalars(select(Registro).order_by(Registro.id)).all()
    assert records[0].ativo is False and records[0].excluido_em
    assert records[1].ativo is True


def test_past_entry_cannot_be_deleted(authorized):
    record=entry('2026-10-02','08:00','PMC1')
    assert authorized.delete(f'/api/registros/{record["id"]}',headers=HEADERS).status_code==404


def test_csv_month(authorized):
    for d,s in [('2026-10-12','08:00'),('2026-10-12','20:00'),('2026-10-13','08:00')]:
        entry(d,s,'PMC100','003')
    r=authorized.get('/api/relatorios/csv?mes=2026-10&cia=003')
    assert r.status_code==200
    assert 'permanencia_2026-10_cia_003.csv' in r.headers['content-disposition']
    assert 'PMC100' in r.content.decode('utf-8-sig')
    assert r.content.startswith(b'\xef\xbb\xbf')


@pytest.mark.parametrize('month',['2026-13','2026-00','26-01','', 'abcd-aa','1999-12'])
def test_invalid_month(authorized,month):
    assert authorized.get('/api/cias',params={'mes':month}).status_code==422


def test_pwa_resources(authorized):
    for route in ('/','/relatorios','/manifest.webmanifest','/sw.js','/static/icons/icon-192.png'):
        assert authorized.get(route).status_code==200


def test_deleted_middle_shift_recalculates(authorized):
    a=entry('2026-11-03','08:00','PMC1')
    mid=entry('2026-11-03','20:00','PMC1')
    entry('2026-11-04','08:00','PMC1')
    assert monthly_report('2026-11','001')['total_periodos']==1
    assert remove_entry(mid['id'],date(2026,11,3))
    assert monthly_report('2026-11','001')['total_periodos']==0


def test_multiple_stays_aggregated(authorized):
    for d,s in [('2026-10-01','08:00'),('2026-10-01','20:00'),('2026-10-02','08:00'),
                ('2026-10-05','08:00'),('2026-10-05','20:00'),('2026-10-06','08:00')]:
        entry(d,s,'PMC1')
    report=monthly_report('2026-10','001')
    assert report['total_paletes']==1
    assert report['total_periodos']==2
    assert report['itens'][0]['periodos_registrados']==6


def test_race_same_slot_only_one_record(authorized):
    def insert(i):
        try:
            return entry('2026-11-03','08:00','RACE1','001')
        except ValueError:
            return None
    with ThreadPoolExecutor(max_workers=6) as pool:
        results=list(pool.map(insert,range(6)))
    assert sum(r is not None for r in results)==1
