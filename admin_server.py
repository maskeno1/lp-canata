"""
株式会社かなた - 管理サーバー
Python 3.6+ / 標準ライブラリのみ使用
背景削除には別途 pip install rembg が必要
"""
import base64
import http.server
import json
import os
import re
import secrets
import smtplib
import subprocess
import sys
import time
import urllib.parse
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from http.cookies import SimpleCookie

def _check_rembg():
    try:
        import rembg  # noqa: F401
        return True
    except ImportError:
        return False

HAS_REMBG = _check_rembg()

BASE_DIR      = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE   = os.path.join(BASE_DIR, 'config.json')
CONTACTS_FILE = os.path.join(BASE_DIR, 'contacts.json')
SERVICES_FILE  = os.path.join(BASE_DIR, 'services.json')
STRENGTHS_FILE = os.path.join(BASE_DIR, 'strengths.json')
BADGES_FILE    = os.path.join(BASE_DIR, 'badges.json')
INDEX_FILE    = os.path.join(BASE_DIR, 'index.html')
PORT          = 8080

sessions = {}  # token -> expiry timestamp

# ---- Config helpers --------------------------------------------------------

def load_config():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {
        'admin_password': 'kanata2024',
        'contact_email':  'shibata@canata-consult.jp',
        'smtp_host':      '',
        'smtp_port':      '587',
        'smtp_user':      '',
        'smtp_pass':      '',
    }

def save_config(cfg):
    with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
        json.dump(cfg, f, ensure_ascii=False, indent=2)

# ---- Contact storage -------------------------------------------------------

def load_contacts():
    if os.path.exists(CONTACTS_FILE):
        with open(CONTACTS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []

def load_services():
    if os.path.exists(SERVICES_FILE):
        with open(SERVICES_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return [
        {'title': '経営コーチング', 'text': ''},
        {'title': '組織診断・改善', 'text': ''},
        {'title': '人事制度設計',   'text': ''},
        {'title': '幹部育成・研修', 'text': ''},
    ]

def save_services(data):
    with open(SERVICES_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def load_strengths():
    if os.path.exists(STRENGTHS_FILE):
        with open(STRENGTHS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return [
        {'title': '論理的アプローチ×コーチング', 'text': ''},
        {'title': '経営者との対話を最優先に',     'text': ''},
        {'title': '現場を知る実践知',             'text': ''},
    ]

def save_strengths(data):
    with open(STRENGTHS_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def load_badges():
    if os.path.exists(BADGES_FILE):
        with open(BADGES_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return [
        {'label': '技術士（電気電子部門）'},
        {'label': '経営・人事コンサルタント'},
    ]

def save_badges(data):
    with open(BADGES_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def append_contact(entry):
    contacts = load_contacts()
    contacts.append(entry)
    with open(CONTACTS_FILE, 'w', encoding='utf-8') as f:
        json.dump(contacts, f, ensure_ascii=False, indent=2)

# ---- Email -----------------------------------------------------------------

def send_email(data, cfg):
    to_email  = cfg.get('contact_email', '').strip()
    smtp_host = cfg.get('smtp_host', '').strip()
    smtp_port = int(cfg.get('smtp_port') or 587)
    smtp_user = cfg.get('smtp_user', '').strip()
    smtp_pass = cfg.get('smtp_pass', '').strip()

    if not (to_email and smtp_host and smtp_user and smtp_pass):
        return False, 'SMTP未設定'

    body = f"""━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
株式会社かなた ウェブサイト お問い合わせ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ お名前    : {data.get('name', '')}
■ 会社名    : {data.get('company', '')}
■ メール    : {data.get('email', '')}
■ 電話番号  : {data.get('tel', '')}
■ 件名      : {data.get('subject', '')}

■ メッセージ:
{data.get('message', '')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
送信日時: {datetime.now().strftime('%Y年%m月%d日 %H:%M')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
    msg = MIMEMultipart()
    msg['From']    = smtp_user
    msg['To']      = to_email
    msg['Subject'] = f"【かなた お問い合わせ】{data.get('subject', 'お問い合わせ')}"
    msg.attach(MIMEText(body, 'plain', 'utf-8'))

    try:
        with smtplib.SMTP(smtp_host, smtp_port, timeout=30) as srv:
            srv.starttls()
            srv.login(smtp_user, smtp_pass)
            srv.send_message(msg)
        return True, 'OK'
    except Exception as e:
        return False, str(e)

# ---- Background removal (subprocess for isolation) ------------------------

_REMBG_SCRIPT = (
    "import sys,base64;"
    "from rembg import remove;"
    "sys.stdout.write(base64.b64encode(remove(base64.b64decode(sys.stdin.read()))).decode())"
)

def remove_bg(img_bytes):
    """Run rembg in a subprocess so a crash doesn't kill the server."""
    proc = subprocess.run(
        [sys.executable, '-c', _REMBG_SCRIPT],
        input=base64.b64encode(img_bytes).decode('ascii'),
        capture_output=True,
        timeout=180,
        text=True,
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.strip() or 'rembg処理に失敗しました')
    return base64.b64decode(proc.stdout.strip())

# ---- HTML content update ---------------------------------------------------

def load_html():
    with open(INDEX_FILE, 'r', encoding='utf-8') as f:
        return f.read()

def save_html(html):
    with open(INDEX_FILE, 'w', encoding='utf-8') as f:
        f.write(html)

def update_editable(html, key, value):
    """Replace text content of the first element with data-editable="key"."""
    # Match opening tag with data-editable="key", any attributes, then content up to closing tag
    pattern = r'(<[a-zA-Z][^>]*\bdata-editable="' + re.escape(key) + r'"[^>]*>)(.*?)(</[a-zA-Z]+>)'
    replacement = r'\g<1>' + value.replace('\\', '\\\\').replace('\n', '<br>') + r'\g<3>'
    return re.sub(pattern, replacement, html, count=1, flags=re.DOTALL)

# ---- Session ----------------------------------------------------------------

def check_session(cookie_header):
    if not cookie_header:
        return False
    c = SimpleCookie()
    c.load(cookie_header)
    token = c.get('admin_token')
    if not token:
        return False
    tk = token.value
    if tk not in sessions:
        return False
    expiry = sessions[tk]
    if datetime.now(timezone.utc).timestamp() > expiry:
        del sessions[tk]
        return False
    return True

def create_session():
    token = secrets.token_hex(24)
    sessions[token] = datetime.now(timezone.utc).timestamp() + 7 * 86400
    return token

# ---- HTTP Handler -----------------------------------------------------------

MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css':  'text/css; charset=utf-8',
    '.js':   'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg':  'image/svg+xml',
    '.ico':  'image/x-icon',
}

class Handler(http.server.BaseHTTPRequestHandler):

    def log_message(self, fmt, *args):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {fmt % args}")

    # ---- helpers ------------------------------------------------------------

    def send_json(self, code, data):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_json_body(self):
        length = int(self.headers.get('Content-Length', 0))
        if length == 0:
            return {}
        raw = self.rfile.read(length)
        try:
            return json.loads(raw.decode('utf-8'))
        except Exception:
            return {}

    def require_auth(self):
        if not check_session(self.headers.get('Cookie', '')):
            self.send_json(401, {'error': '認証が必要です'})
            return False
        return True

    # ---- GET ----------------------------------------------------------------

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path   = parsed.path

        if path == '/api/ping':
            self.send_json(200, {'ok': True, 'has_rembg': HAS_REMBG})
            return

        if path == '/api/logout':
            self.send_response(302)
            self.send_header('Location', '/admin-login.html')
            self.send_header('Set-Cookie', 'admin_token=; Max-Age=0; Path=/')
            self.end_headers()
            return

        if path == '/api/contacts':
            if not self.require_auth():
                return
            self.send_json(200, load_contacts())
            return

        if path == '/api/content':
            if not self.require_auth():
                return
            # Return all editable keys from index.html
            html = load_html()
            keys = re.findall(r'data-editable="([^"]+)"', html)
            result = {}
            for key in keys:
                pattern = r'<[a-zA-Z][^>]*\bdata-editable="' + re.escape(key) + r'"[^>]*>(.*?)</[a-zA-Z]+'
                m = re.search(pattern, html, re.DOTALL)
                if m:
                    val = m.group(1).strip().replace('<br>', '\n')
                    result[key] = val
            self.send_json(200, result)
            return

        if path == '/api/services':
            self.send_json(200, load_services())
            return

        if path == '/api/strengths':
            self.send_json(200, load_strengths())
            return

        if path == '/api/badges':
            self.send_json(200, load_badges())
            return

        if path == '/api/config':
            if not self.require_auth():
                return
            cfg = load_config()
            safe = {k: v for k, v in cfg.items() if k != 'admin_password' and k != 'smtp_pass'}
            self.send_json(200, safe)
            return

        # --- Static file serving ---
        if path == '/':
            path = '/index.html'
        file_path = os.path.join(BASE_DIR, path.lstrip('/').replace('/', os.sep))

        # Security: prevent directory traversal
        if not os.path.abspath(file_path).startswith(BASE_DIR):
            self.send_json(403, {'error': 'Forbidden'})
            return

        # Admin pages require auth
        if os.path.basename(file_path) == 'admin.html' and not check_session(self.headers.get('Cookie', '')):
            self.send_response(302)
            self.send_header('Location', '/admin-login.html')
            self.end_headers()
            return

        if not os.path.isfile(file_path):
            self.send_response(404)
            self.end_headers()
            return

        ext = os.path.splitext(file_path)[1].lower()
        ctype = MIME_TYPES.get(ext, 'application/octet-stream')
        with open(file_path, 'rb') as f:
            data = f.read()
        self.send_response(200)
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    # ---- POST ---------------------------------------------------------------

    def do_POST(self):
        path = urllib.parse.urlparse(self.path).path

        if path == '/api/login':
            body = self.read_json_body()
            cfg  = load_config()
            if body.get('password') == cfg.get('admin_password', 'kanata2024'):
                token = create_session()
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Set-Cookie',
                    f'admin_token={token}; Max-Age={7*86400}; Path=/; HttpOnly; SameSite=Strict')
                self.send_header('Content-Length', '2')
                self.end_headers()
                self.wfile.write(b'{}')
            else:
                self.send_json(401, {'error': 'パスワードが正しくありません'})
            return

        if path == '/api/contact':
            data = self.read_json_body()
            required = ['name', 'email', 'subject', 'message']
            if not all(data.get(k) for k in required):
                self.send_json(400, {'error': '必須項目が不足しています'})
                return

            entry = dict(data)
            entry['date'] = datetime.now().strftime('%Y-%m-%d %H:%M')
            append_contact(entry)

            cfg = load_config()
            ok, err = send_email(data, cfg)
            if not ok:
                print(f'[MAIL] 送信スキップ: {err}')

            self.send_json(200, {'status': 'ok'})
            return

        if path == '/api/content':
            if not self.require_auth():
                return
            data = self.read_json_body()
            html = load_html()
            for key, val in data.items():
                html = update_editable(html, key, val)
            save_html(html)
            self.send_json(200, {'status': 'ok'})
            return

        if path == '/api/services':
            if not self.require_auth():
                return
            data = self.read_json_body()
            if not isinstance(data, list):
                self.send_json(400, {'error': '不正なデータです'})
                return
            save_services(data)
            self.send_json(200, {'status': 'ok'})
            return

        if path == '/api/strengths':
            if not self.require_auth():
                return
            data = self.read_json_body()
            if not isinstance(data, list):
                self.send_json(400, {'error': '不正なデータです'})
                return
            save_strengths(data)
            self.send_json(200, {'status': 'ok'})
            return

        if path == '/api/badges':
            if not self.require_auth():
                return
            data = self.read_json_body()
            if not isinstance(data, list):
                self.send_json(400, {'error': '不正なデータです'})
                return
            save_badges(data)
            self.send_json(200, {'status': 'ok'})
            return

        if path == '/api/config':
            if not self.require_auth():
                return
            data = self.read_json_body()
            cfg  = load_config()
            allowed = ['contact_email', 'smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass']
            for k in allowed:
                if k in data and data[k]:
                    cfg[k] = data[k]
            save_config(cfg)
            self.send_json(200, {'status': 'ok'})
            return

        if path == '/api/test-smtp':
            if not self.require_auth():
                return
            cfg = load_config()
            ok, err = send_email({
                'name': 'テスト送信',
                'company': '',
                'email':   cfg.get('smtp_user', ''),
                'tel':     '',
                'subject': 'テスト',
                'message': 'これはかなたサイト管理画面からのテスト送信です。',
            }, cfg)
            if ok:
                self.send_json(200, {'status': 'ok'})
            else:
                self.send_json(500, {'error': err})
            return

        if path == '/api/remove-bg-preview':
            if not self.require_auth():
                return
            if not HAS_REMBG:
                self.send_json(500, {
                    'error': 'rembgがインストールされていません。コマンドプロンプトで「pip install rembg」を実行後、start-server.bat を再起動してください。'
                })
                return
            data = self.read_json_body()
            raw = data.get('image', '')
            if ',' in raw:
                raw = raw.split(',', 1)[1]
            try:
                img_bytes = base64.b64decode(raw)
                result_bytes = remove_bg(img_bytes)
                result_b64 = 'data:image/png;base64,' + base64.b64encode(result_bytes).decode()
                self.send_json(200, {'result': result_b64})
            except subprocess.TimeoutExpired:
                self.send_json(500, {'error': '処理がタイムアウトしました（3分）。画像サイズを小さくして再試行してください。'})
            except Exception as e:
                self.send_json(500, {'error': f'背景削除エラー: {e}'})
            return

        if path == '/api/save-profile-photo':
            if not self.require_auth():
                return
            data = self.read_json_body()
            raw = data.get('image', '')
            if ',' in raw:
                raw = raw.split(',', 1)[1]
            try:
                img_bytes = base64.b64decode(raw)
                save_path = os.path.join(BASE_DIR, 'images', 'profile.png')
                with open(save_path, 'wb') as f:
                    f.write(img_bytes)
                self.send_json(200, {'status': 'ok'})
            except Exception as e:
                self.send_json(500, {'error': str(e)})
            return

        if path == '/api/save-logo-image':
            if not self.require_auth():
                return
            data = self.read_json_body()
            raw = data.get('image', '')
            if ',' in raw:
                raw = raw.split(',', 1)[1]
            try:
                img_bytes = base64.b64decode(raw)
                os.makedirs(os.path.join(BASE_DIR, 'images'), exist_ok=True)
                save_path = os.path.join(BASE_DIR, 'images', 'logo.png')
                with open(save_path, 'wb') as f:
                    f.write(img_bytes)
                self.send_json(200, {'status': 'ok'})
            except Exception as e:
                self.send_json(500, {'error': str(e)})
            return

        if path == '/api/change-password':
            if not self.require_auth():
                return
            data = self.read_json_body()
            cfg  = load_config()
            if data.get('current') != cfg.get('admin_password', 'kanata2024'):
                self.send_json(400, {'error': '現在のパスワードが正しくありません'})
                return
            new_pw = data.get('new', '')
            if len(new_pw) < 6:
                self.send_json(400, {'error': 'パスワードは6文字以上にしてください'})
                return
            cfg['admin_password'] = new_pw
            save_config(cfg)
            self.send_json(200, {'status': 'ok'})
            return

        self.send_json(404, {'error': 'Not found'})


def run():
    print('=' * 55)
    print('  株式会社かなた - 管理サーバー')
    print(f'  http://localhost:{PORT}')
    print(f'  管理画面: http://localhost:{PORT}/admin-login.html')
    print(f'  初期パスワード: kanata2024')
    print('=' * 55)
    server = http.server.HTTPServer(('', PORT), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nサーバーを停止しました。')


if __name__ == '__main__':
    run()
