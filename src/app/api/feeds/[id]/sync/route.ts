export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { authorizeApi, WRITE_ROLES } from '@/lib/authz'
import { isDatabaseConnectivityError } from '@/lib/database-health'
import { withDatabaseRoute } from '@/lib/database-route'
import { syncFeedSource } from '@/lib/feed-ingestion'

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await authorizeApi(WRITE_ROLES)
  if (access.response) return access.response

  const { id } = await context.params
  return withDatabaseRoute(async () => {
    try {
      const result = await syncFeedSource(id)
      return NextResponse.json(result)
    } catch (error) {
      if (isDatabaseConnectivityError(error)) throw error
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Synchronisatie mislukt.' }, { status: 422 })
    }
  })
}
