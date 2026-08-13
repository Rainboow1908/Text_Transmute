# 本地静态服务器：所有响应都带 Cache-Control: no-store，且忽略条件请求，避免浏览器缓存旧文件
# 运行：python server.py  （代替 python -m http.server）
import http.server
import socketserver

PORT = 8000


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # 去掉条件请求头，避免返回 304（浏览器就不会用缓存）
        for h in ('If-Modified-Since', 'If-None-Match', 'If-Match'):
            if h in self.headers:
                del self.headers[h]
        super().do_GET()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()


class ThreadingServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True


with ThreadingServer(("", PORT), NoCacheHandler) as httpd:
    print(f"Serving at http://localhost:{PORT} (no-cache)")
    httpd.serve_forever()
