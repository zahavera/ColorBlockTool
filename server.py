from http.server import HTTPServer, SimpleHTTPRequestHandler
import json
import os

class VersionHandler(SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/version.json':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            # Update version file
            with open('version.json', 'w') as f:
                f.write(post_data.decode('utf-8'))
            
            self.send_response(200)
            self.end_headers()
        else:
            super().do_POST()

if __name__ == '__main__':
    server_address = ('', 8000)
    httpd = HTTPServer(server_address, VersionHandler)
    print('Starting server on port 8000...')
    httpd.serve_forever()
