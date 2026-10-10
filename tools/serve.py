#!/usr/bin/env python3
"""Dev server for MergeBoy: a static file server that tells the browser never
to cache, so edits show up on a plain reload. Usage: python3 tools/serve.py [port]"""
import functools
import http.server
import os
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8123
    root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
    handler = functools.partial(NoCacheHandler, directory=root)
    print(f'MergeBoy on http://localhost:{port}')
    http.server.ThreadingHTTPServer(('', port), handler).serve_forever()
