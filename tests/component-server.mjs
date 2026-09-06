import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'

const html = await readFile(new URL('./component-host.html', import.meta.url))
createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' })
  res.end(html)
}).listen(5206, '127.0.0.1')
