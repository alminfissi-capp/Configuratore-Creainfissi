import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { code, shop } = req.query

  if (!code || !shop) {
    res.status(400).send('Missing code or shop')
    return
  }

  try {
    const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_API_KEY,
        client_secret: process.env.SHOPIFY_API_SECRET,
        code,
      }),
    })

    const data = await response.json() as Record<string, string>

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.status(200).send(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Shopify Token</title>
<style>
  body { font-family: monospace; padding: 2rem; background: #111; color: #eee; }
  h2 { color: #1AACB5; }
  .token { font-size: 1.1rem; color: #6CB22A; font-weight: bold; word-break: break-all; background: #222; padding: 1rem; border-radius: 8px; display: block; margin: 1rem 0; }
  pre { background: #222; padding: 1rem; border-radius: 8px; overflow: auto; }
</style>
</head>
<body>
<h2>Token Shopify ottenuto</h2>
<p>Copia questo valore come <strong>SHOPIFY_ADMIN_API_TOKEN</strong>:</p>
<code class="token">${data.access_token ?? 'ERRORE'}</code>
<p>Risposta completa:</p>
<pre>${JSON.stringify(data, null, 2)}</pre>
</body>
</html>`)
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
}
