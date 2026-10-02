import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Custom local dev middleware for Vercel serverless /api functions
function localApiPlugin(env: Record<string, string>) {
  return {
    name: 'local-api-handlers',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const url = req.url?.split('?')[0]
        if (!url || !url.startsWith('/api/')) {
          return next()
        }

        // Set process.env from loaded Vite env for API scripts
        Object.assign(process.env, env)

        // Read incoming request body if POST/PUT
        let body: any = {}
        if (req.method === 'POST' || req.method === 'PUT') {
          const buffers = []
          for await (const chunk of req) {
            buffers.push(chunk)
          }
          const raw = Buffer.concat(buffers).toString('utf-8')
          if (raw) {
            try {
              body = JSON.parse(raw)
            } catch {
              body = raw
            }
          }
        }
        req.body = body

        // Wrap res with status() and json() helpers expected by Vercel handlers
        res.status = function (statusCode: number) {
          res.statusCode = statusCode
          return res
        }
        res.json = function (data: any) {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(data))
          return res
        }

        try {
          if (url === '/api/create-razorpay-order') {
            const mod = await server.ssrLoadModule('/api/create-razorpay-order.ts')
            return await mod.default(req, res)
          }
          if (url === '/api/verify-razorpay-payment') {
            const mod = await server.ssrLoadModule('/api/verify-razorpay-payment.ts')
            return await mod.default(req, res)
          }
          next()
        } catch (err: any) {
          console.error(`[Local API Error] ${url}:`, err)
          res.status(500).json({ error: err.message || 'Internal local server error' })
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), localApiPlugin(env)],
    server: {
      host: true,
      port: 5173,
    },
  }
})

