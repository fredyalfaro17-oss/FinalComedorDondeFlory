import fs from 'fs'
import path from 'path'
import { resolve } from 'path'
import { defineConfig } from 'vite'

function salesSyncPlugin() {
  const salesFile = path.resolve(__dirname, 'sales_data.json')
  
  const getSalesFromFile = () => {
    try {
      if (fs.existsSync(salesFile)) {
        return JSON.parse(fs.readFileSync(salesFile, 'utf-8'))
      }
    } catch (e) {
      console.error('Error reading sales_data.json:', e)
    }
    return []
  }

  const saveSalesToFile = (sales) => {
    try {
      fs.writeFileSync(salesFile, JSON.stringify(sales, null, 2), 'utf-8')
    } catch (e) {
      console.error('Error writing sales_data.json:', e)
    }
  }

  let clients = []

  return {
    name: 'sales-sync-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url.split('?')[0]

        // SSE Real-time events
        if (url === '/api/events') {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
          })
          res.write(`data: ${JSON.stringify({ type: 'INIT', sales: getSalesFromFile() })}\n\n`)
          clients.push(res)

          req.on('close', () => {
            clients = clients.filter(c => c !== res)
          })
          return
        }

        // GET /api/sales
        if (url === '/api/sales' && req.method === 'GET') {
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          })
          res.end(JSON.stringify(getSalesFromFile()))
          return
        }

        // POST /api/sales
        if (url === '/api/sales' && req.method === 'POST') {
          let body = ''
          req.on('data', chunk => { body += chunk })
          req.on('end', () => {
            try {
              const data = JSON.parse(body)
              let currentSales = getSalesFromFile()
              
              if (data.action === 'SAVE_ALL') {
                currentSales = data.sales || []
              } else if (data.action === 'UPDATE_PROP') {
                const idx = currentSales.findIndex(s => s.id === Number(data.id))
                if (idx !== -1) {
                  currentSales[idx][data.property] = data.value
                  currentSales[idx].updatedAt = new Date().toISOString()
                }
              } else if (data.action === 'ADD_SALE') {
                const newId = currentSales.length > 0 ? Math.max(...currentSales.map(s => s.id || 0)) + 1 : 1
                const newSale = { ...data.sale, id: newId, updatedAt: new Date().toISOString() }
                currentSales.push(newSale)
              } else if (data.action === 'CLEAR') {
                currentSales = []
              }

              saveSalesToFile(currentSales)

              // Broadcast to all connected devices (iPhone, PC, etc.) via SSE
              const eventPayload = `data: ${JSON.stringify({ type: 'UPDATE', sales: currentSales })}\n\n`
              clients.forEach(c => {
                try { c.write(eventPayload) } catch(e) {}
              })

              res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              })
              res.end(JSON.stringify({ success: true, sales: currentSales }))
            } catch (err) {
              res.writeHead(400, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: err.message }))
            }
          })
          return
        }

        next()
      })
    }
  }
}

export default defineConfig({
  plugins: [salesSyncPlugin()],
  server: {
    allowedHosts: true,
  },
  resolve: {
    alias: {
      // Force Vite to use ExcelJS browser bundle instead of the Node.js entry point.
      'exceljs': 'exceljs/dist/exceljs.min.js',
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        menu: resolve(__dirname, 'menu.html'),
        vendedores: resolve(__dirname, 'vendedores.html'),
      }
    }
  }
})
