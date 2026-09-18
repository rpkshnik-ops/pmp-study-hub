"""Serve only application assets on loopback. Python 3.12+, no dependencies."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit
import argparse

ROOT = Path(__file__).resolve().parent
ALLOWED = {"index.html", "styles.css", "app.js", "core.js", "config.js", "sw.js", "manifest.webmanifest", "icon.svg"}

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        path = unquote(urlsplit(self.path).path).lstrip("/") or "index.html"
        allowed = path in ALLOWED or (path.startswith("content/pack-") and path.endswith(".json") and "/" not in path[8:])
        if not allowed or not (ROOT / path).resolve().is_relative_to(ROOT):
            self.send_error(404)
            return
        super().do_GET()

    def do_HEAD(self):
        path = unquote(urlsplit(self.path).path).lstrip("/") or "index.html"
        if path not in ALLOWED and not (path.startswith("content/pack-") and path.endswith(".json") and "/" not in path[8:]):
            self.send_error(404)
            return
        super().do_HEAD()

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'")
        super().end_headers()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    print(f"PMP Study Hub: http://localhost:{args.port} (local only)", flush=True)
    ThreadingHTTPServer(("127.0.0.1", args.port), Handler).serve_forever()
