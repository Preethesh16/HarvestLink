"""Isolated workbook and role-boundary regressions; no external services."""
import base64
import csv
import io
import zipfile
from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from openpyxl import Workbook

from backend import app as module
from backend import identity
from backend.spreadsheets import HEADERS, preview, template


def encoded(rows, cells=None):
    book = Workbook()
    sheet = book.active
    for row in rows:
        sheet.append(row)
    for address, value in (cells or {}).items():
        sheet[address] = value
    stream = io.BytesIO()
    book.save(stream)
    return base64.b64encode(stream.getvalue()).decode()


def inventory_rows(count=1):
    return [HEADERS['inventory']] + [['Tomato', 20, 'kg', '2026-12-31']] * count


@pytest.mark.parametrize('kind', HEADERS)
def test_downloaded_templates_roundtrip(kind):
    result = preview(base64.b64encode(template(kind)).decode(), kind)
    assert result['headers'] == HEADERS[kind]
    assert result['count'] > 0
    assert len(result['rows']) <= 5
    assert list(csv.reader(io.StringIO(result['csv'])))[0] == HEADERS[kind]


def test_dates_unicode_and_csv_quoting_survive_preview():
    result = preview(encoded([HEADERS['inventory'], ['ಟೊಮೇಟೊ, local', 4.5, 'kg', datetime(2026, 12, 31)]]), 'inventory')
    rows = list(csv.reader(io.StringIO(result['csv'])))
    assert rows[1] == ['ಟೊಮೇಟೊ, local', '4.5', 'kg', '2026-12-31']
    assert result['count'] == 1


@pytest.mark.parametrize('rows,match', [
    ([HEADERS['inventory'], ['Tomato', '=1+1', 'kg', '2026-12-31']], 'formulas'),
    ([['wrong', 'quantity', 'unit', 'usable_until'], ['Tomato', 2, 'kg', '2026-12-31']], 'headers'),
    ([HEADERS['inventory']], 'no data'),
    ([HEADERS['inventory'], ['x' * 501, 2, 'kg', '2026-12-31']], 'too long'),
    ([HEADERS['inventory'], ['Tomato', 2, 'kg', '2026-12-31', 'unexpected']], 'extra column'),
])
def test_invalid_workbooks_rejected(rows, match):
    with pytest.raises(ValueError, match=match):
        preview(encoded(rows), 'inventory')


def test_workbook_row_boundaries():
    assert preview(encoded(inventory_rows(1000)), 'inventory')['count'] == 1000
    with pytest.raises(ValueError, match='1000'):
        preview(encoded(inventory_rows(1001)), 'inventory')


@pytest.mark.parametrize('cells', [{'G2': 'unexpected'}, {'A1500': 'Tomato'}, {'G2': '=1+1'}])
def test_outlying_cells_are_not_silently_truncated(cells):
    with pytest.raises(ValueError):
        preview(encoded(inventory_rows(), cells), 'inventory')


def test_invalid_base64_and_upload_size_rejected():
    with pytest.raises(ValueError):
        preview('not valid base64!', 'inventory')
    with pytest.raises(ValueError, match='2 MB'):
        preview('A' * 2_800_001, 'inventory')
    with pytest.raises(ValueError):
        preview(base64.b64encode(b'not an excel workbook').decode(), 'inventory')


def test_zip_member_count_and_macro_rejected():
    for names, match in [([f'entry{i}' for i in range(101)], 'expanded'), (['xl/vbaProject.bin'], 'Macro')]:
        data = io.BytesIO()
        with zipfile.ZipFile(data, 'w') as archive:
            for name in names:
                archive.writestr(name, b'x')
        with pytest.raises(ValueError, match=match):
            preview(base64.b64encode(data.getvalue()).decode(), 'inventory')


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(module, 'DB', tmp_path / 'xlsx.sqlite3')
    monkeypatch.delenv('HARVESTLINK_TEST_ROLE_ACCESS', raising=False)
    identity.ATTEMPTS.clear()
    with TestClient(module.app) as client:
        yield client


def login(client, username):
    result = client.post('/api/auth/login', json={'username': username, 'password': 'Harvest@123'})
    assert result.status_code == 200


def test_spreadsheet_endpoints_require_session(client):
    assert client.get('/api/templates/harvest.xlsx').status_code == 401
    assert client.post('/api/spreadsheets/preview', json={'kind': 'harvest'}).status_code == 401
    assert client.get('/api/market/catalog').status_code == 401


@pytest.mark.parametrize('username,allowed,forbidden', [
    ('farmer', ['harvest'], ['inventory', 'consumption']),
    ('restaurant1', ['inventory', 'consumption'], ['harvest']),
    ('restaurant2', ['inventory', 'consumption'], ['harvest']),
    ('restaurant3', ['inventory', 'consumption'], ['harvest']),
])
def test_workbook_roles_enforced_for_templates_and_preview(client, username, allowed, forbidden):
    login(client, username)
    for kind in allowed + forbidden:
        expected = 200 if kind in allowed else 403
        downloaded = client.get(f'/api/templates/{kind}.xlsx')
        assert downloaded.status_code == expected
        result = client.post('/api/spreadsheets/preview', json={'kind': kind, 'content': base64.b64encode(template(kind)).decode()})
        assert result.status_code == expected
        if expected == 200:
            assert result.json()['count'] > 0
            assert 'spreadsheetml' in downloaded.headers['content-type']
    if username != 'farmer':
        assert client.get('/api/market/catalog').status_code == 403
        assert client.get('/api/market/catalog', headers={'X-Actor': 'farmer'}).status_code == 403


def test_api_validation_does_not_mutate_inventory(client):
    login(client, 'restaurant1')
    before = client.get('/api/state').json()['inventory']
    result = client.post('/api/spreadsheets/preview', json={'kind': 'inventory', 'content': encoded([HEADERS['inventory'], ['Tomato', '=1+1', 'kg', '2026-12-31']])})
    assert result.status_code == 422
    assert 'formulas' in result.json()['detail']
    assert client.get('/api/state').json()['inventory'] == before


def test_farmer_catalog_returns_report_without_buyer_access(client, tmp_path, monkeypatch):
    import json
    # Redirect only the report path to a temporary fixture; never overwrite project data.
    monkeypatch.setattr(module, '__file__', str(tmp_path / 'backend' / 'app.py'))
    report_dir = tmp_path / 'demo-data'
    report_dir.mkdir()
    report = {'source': 'fixture government report', 'records': [{'commodity': 'Tomato', 'modal_price': 2800}]}
    (report_dir / 'government-prices.json').write_text(json.dumps(report))
    login(client, 'farmer')
    assert client.get('/api/market/catalog').json() == report
    client.post('/api/auth/logout')
    login(client, 'restaurant3')
    assert client.get('/api/market/catalog').status_code == 403


def test_successful_preview_is_not_an_import(client):
    login(client, 'restaurant1')
    before = client.get('/api/state').json()['inventory']
    result = client.post('/api/spreadsheets/preview', json={'kind': 'inventory', 'content': encoded(inventory_rows())})
    assert result.status_code == 200
    assert result.json()['count'] == 1
    assert client.get('/api/state').json()['inventory'] == before
