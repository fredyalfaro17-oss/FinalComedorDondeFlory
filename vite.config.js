import fs from 'fs'
import path from 'path'
import { resolve } from 'path'
import { defineConfig } from 'vite'

function salesSyncPlugin() {
  const salesFile = path.resolve(__dirname, 'sales_data.json')
  
  const getTodayKey = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const getSalesFromFile = () => {
    try {
      if (fs.existsSync(salesFile)) {
        const raw = JSON.parse(fs.readFileSync(salesFile, 'utf-8'))
        if (Array.isArray(raw)) {
          const today = getTodayKey()
          const todaySales = raw.filter(s => !s.date || s.date === today)
          if (todaySales.length !== raw.length) {
            saveSalesToFile(todaySales)
          }
          return todaySales
        }
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
                const incoming = Array.isArray(data.sales) ? data.sales : []
                const map = new Map()
                currentSales.forEach(s => {
                  if (s && s.id) map.set(Number(s.id), s)
                })
                incoming.forEach(s => {
                  if (s && s.id) {
                    const id = Number(s.id)
                    const existing = map.get(id)
                    map.set(id, existing ? { ...existing, ...s } : s)
                  }
                })
                currentSales = Array.from(map.values()).sort((a, b) => Number(a.id) - Number(b.id))
              } else if (data.action === 'UPDATE_PROP') {
                const targetId = Number(data.id)
                const idx = currentSales.findIndex(s => Number(s.id) === targetId)
                if (idx !== -1) {
                  currentSales[idx][data.property] = data.value
                  currentSales[idx].updatedAt = new Date().toISOString()
                } else if (data.sale && typeof data.sale === 'object') {
                  // Si no estaba en el servidor, añadirlo con la propiedad actualizada
                  currentSales.push({ ...data.sale, [data.property]: data.value, updatedAt: new Date().toISOString() })
                }
              } else if (data.action === 'ADD_SALE') {
                const incomingId = data.sale && data.sale.id ? Number(data.sale.id) : null
                const existingIdx = incomingId ? currentSales.findIndex(s => Number(s.id) === incomingId) : -1
                if (existingIdx !== -1) {
                  currentSales[existingIdx] = { ...currentSales[existingIdx], ...data.sale, updatedAt: new Date().toISOString() }
                } else {
                  const newId = incomingId || (currentSales.length > 0 ? Math.max(...currentSales.map(s => Number(s.id) || 0)) + 1 : 1)
                  const newSale = { ...data.sale, id: Number(newId), updatedAt: new Date().toISOString() }
                  currentSales.push(newSale)
                }
              } else if (data.action === 'CLEAR') {
                currentSales = []
                const clearedAt = Number(data.clearedAt) || Date.now()
                saveSalesToFile([])

                const eventPayload = `data: ${JSON.stringify({ type: 'CLEAR', clearedAt, sales: [] })}\n\n`
                clients.forEach(c => {
                  try { c.write(eventPayload) } catch(e) {}
                })

                res.writeHead(200, {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*'
                })
                res.end(JSON.stringify({ success: true, cleared: true, clearedAt, sales: [] }))
                return
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
