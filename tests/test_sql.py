"""Executar: python -m unittest discover -s tests -p 'test_*.py'"""
import sqlite3
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SQL=(ROOT/'src/report-query.sql').read_text()
SCHEMA=(ROOT/'migrations/0001_schema.sql').read_text()

class TestFaturamento(unittest.TestCase):
    def setUp(self):
        self.db=sqlite3.connect(':memory:')
        self.db.row_factory=sqlite3.Row
        self.db.executescript(SCHEMA)

    def add(self,d,s,p='PMC123',cia='001'):
        self.db.execute('INSERT INTO registros(data,turno,palete,cia,criado_em) VALUES(?,?,?,?,?)',(d,s,p,cia,d+'T'+s))
        self.db.commit()

    def report(self,mes='2026-11',cia='001'):
        y,m=map(int,mes.split('-'))
        start=f'{y:04d}-{m:02d}-01'
        end=f'{y+(m==12):04d}-{(m%12)+1:02d}-01'
        return [dict(x) for x in self.db.execute(SQL,(end,start,cia)).fetchall()]

    def test_three_periods_one_paid(self):
        self.add('2026-11-01','08:00');self.add('2026-11-01','20:00');self.add('2026-11-02','08:00')
        self.assertEqual(self.report()[0]['periodos_cobraveis'],1)
    def test_two_periods_free(self):
        self.add('2026-11-01','08:00');self.add('2026-11-01','20:00')
        self.assertEqual(self.report(),[])
    def test_four_periods_two_paid(self):
        self.add('2026-11-01','08:00');self.add('2026-11-01','20:00');self.add('2026-11-02','08:00');self.add('2026-11-02','20:00')
        self.assertEqual(self.report()[0]['periodos_cobraveis'],2)
    def test_gap_breaks(self):
        self.add('2026-11-01','08:00');self.add('2026-11-02','08:00');self.add('2026-11-02','20:00')
        self.assertEqual(self.report(),[])
    def test_ambiguous_airline_switch_breaks(self):
        self.add('2026-11-01','08:00',cia='001');self.add('2026-11-01','20:00',cia='002');self.add('2026-11-02','08:00',cia='002')
        self.assertEqual(self.report(cia='002'),[])
    def test_cross_month_only_charge_in_current_month(self):
        self.add('2026-10-31','08:00');self.add('2026-10-31','20:00');self.add('2026-11-01','08:00')
        r=self.report()
        self.assertEqual(r[0]['periodos_registrados'],1)
        self.assertEqual(r[0]['periodos_cobraveis'],1)
        self.assertEqual(self.report('2026-10'),[])
    def test_cross_year_continuity(self):
        self.add('2026-12-31','08:00');self.add('2026-12-31','20:00');self.add('2027-01-01','08:00')
        self.assertEqual(self.report('2027-01')[0]['periodos_cobraveis'],1)
    def test_two_companies_separate(self):
        for d,s in [('2026-11-01','08:00'),('2026-11-01','20:00'),('2026-11-02','08:00')]:self.add(d,s,'PMC123','001');self.add(d,s,'AKE456','002')
        self.assertEqual(self.report()[0]['palete'],'PMC123')
        self.assertEqual(self.report(cia='002')[0]['palete'],'AKE456')
    def test_duplicate_blocked(self):
        self.add('2026-11-01','08:00')
        with self.assertRaises(sqlite3.IntegrityError):self.add('2026-11-01','08:00',cia='002')
    def test_soft_delete_recalculates(self):
        for d,s in [('2026-11-01','08:00'),('2026-11-01','20:00'),('2026-11-02','08:00')]:self.add(d,s)
        self.db.execute("UPDATE registros SET ativo=0 WHERE turno='20:00'")
        self.assertEqual(self.report(),[])
    def test_reinsert_after_soft_delete(self):
        self.add('2026-11-01','08:00')
        self.db.execute('UPDATE registros SET ativo=0 WHERE id=1')
        self.add('2026-11-01','08:00')
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM registros').fetchone()[0],2)
    def test_no_spaces_in_database(self):
        with self.assertRaises(sqlite3.IntegrityError):self.add('2026-11-01','08:00',p='ABC 123')
    def test_no_letters_in_cia(self):
        with self.assertRaises(sqlite3.IntegrityError):self.add('2026-11-01','08:00',cia='0A1')
    def test_no_zero_leading_loss(self):
        self.add('2026-11-01','08:00',cia='001')
        self.assertEqual(self.db.execute('SELECT cia FROM registros').fetchone()[0],'001')
    def test_multi_sequence_same_month(self):
        for d,s in [('2026-11-01','08:00'),('2026-11-01','20:00'),('2026-11-02','08:00'),('2026-11-03','08:00'),('2026-11-03','20:00'),('2026-11-04','08:00')]:self.add(d,s)
        self.assertEqual(self.report()[0]['periodos_cobraveis'],2)

if __name__=='__main__':unittest.main()
