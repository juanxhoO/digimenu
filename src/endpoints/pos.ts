// src/endpoints/pos.ts
import type { Endpoint } from 'payload'
import crypto from 'crypto'

export const posWebhook: Endpoint = {
  path: '/pos/webhook',
  method: 'post',
  handler: async (req) => {
    const payload = req.payload
    const signature = req.headers.get('x-pos-signature')
    const secret = process.env.POS_WEBHOOK_SECRET

    if (!secret || !signature) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!req.text) {
      return Response.json({ error: 'Request body required' }, { status: 400 })
    }

    // 1. Verify signature
    let rawBody: string
    try {
      rawBody = await req.text()
    } catch {
      return Response.json({ error: 'Failed to read request body' }, { status: 400 })
    }

    const computed = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex')

    const sigBuffer = Buffer.from(signature.replace(/^sha256=/, ''))
    const compBuffer = Buffer.from(computed)

    if (sigBuffer.length !== compBuffer.length || !crypto.timingSafeEqual(sigBuffer, compBuffer)) {
      return Response.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // 2. Parse payload safely
    let body: { itemId?: string; price?: number; available?: boolean }
    try {
      body = JSON.parse(rawBody)
    } catch {
      return Response.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }

    if (!body || !body.itemId || typeof body.price !== 'number') {
      return Response.json(
        { error: 'Missing or invalid fields: itemId (string) and price (number) required' },
        { status: 400 },
      )
    }

    try {
      // 3. Find the MenuItem by posItemId
      const { docs } = await payload.find({
        collection: 'menu-items',
        where: { posItemId: { equals: body.itemId } },
        limit: 1,
      })

      if (docs.length === 0) {
        return Response.json({ error: `Item with posItemId '${body.itemId}' not found` }, { status: 404 })
      }

      // 4. Update price (and availability if provided) with context to prevent recursive sync
      await payload.update({
        collection: 'menu-items',
        id: docs[0].id,
        data: {
          basePrice: body.price,
          ...(typeof body.available === 'boolean' ? { available: body.available } : {}),
        },
        context: { fromPOSWebhook: true }, // Guard in afterChange hook
      })

      return Response.json({ success: true, updatedId: docs[0].id })
    } catch (err) {
      payload.logger.error(`POS webhook error: ${err}`)
      return Response.json({ error: 'Internal server error processing webhook' }, { status: 500 })
    }
  },
}
