// collections/MenuItems/hooks/pushToPOS.ts
import type { CollectionAfterChangeHook } from 'payload'

export async function getPOSCredentials(tenantId?: string | number | null) {
  // In production, retrieve credentials based on tenant from a secure vault or env
  return {
    baseUrl: process.env.POS_API_BASE_URL || 'https://api.pos-example.com/v1',
    apiKey: process.env.POS_API_KEY || '',
  }
}

export const pushToPOS: CollectionAfterChangeHook = async ({ doc, operation, req }) => {
  // 1. Guard against infinite loops if the update originated from the inbound POS webhook
  if (req.context?.fromPOSWebhook) return doc

  // 2. Only push on updates, and only if there's a POS ID
  if (operation !== 'update' || !doc.posItemId) return doc

  // 3. Get the tenant's POS credentials
  const posCredentials = await getPOSCredentials(doc.tenant)
  if (!posCredentials.apiKey) {
    req.payload.logger.warn?.(`POS sync skipped: No API key configured for tenant ${doc.tenant}`)
    return doc
  }

  try {
    const res = await fetch(`${posCredentials.baseUrl}/items/${doc.posItemId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${posCredentials.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ price: doc.basePrice }),
    })

    if (!res.ok) {
      req.payload.logger.error(`POS sync failed for item ${doc.posItemId}: ${res.statusText}`)
    }
  } catch (err) {
    req.payload.logger.error(`POS sync error: ${err}`)
  }

  return doc
}