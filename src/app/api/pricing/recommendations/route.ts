export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { authorizeApi, VIEW_ROLES } from '@/lib/authz'
import { withDatabaseRoute } from '@/lib/database-route'
import { getPricingRecommendations, type PricingStrategy } from '@/lib/pricing-engine'

const strategies = new Set<PricingStrategy>(['LOWEST_MATCH', 'LOWEST_MINUS', 'SECOND_LOWEST', 'MARKET_MEDIAN', 'MARKET_AVERAGE'])
function numberParam(value: string | null, fallback: number) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback }

export async function GET(request: Request) {
  const access = await authorizeApi(VIEW_ROLES)
  if (access.response) return access.response

  const { searchParams } = new URL(request.url)
  const requestedStrategy = searchParams.get('strategy') as PricingStrategy | null
  const strategy = requestedStrategy && strategies.has(requestedStrategy) ? requestedStrategy : 'MARKET_MEDIAN'
  return withDatabaseRoute(async () => {
    const result = await getPricingRecommendations({ strategy, adjustmentPct: numberParam(searchParams.get('adjustmentPct'), 0), maxChangePct: Math.max(0, numberParam(searchParams.get('maxChangePct'), 5)), minimumSignalPct: Math.max(0, numberParam(searchParams.get('minimumSignalPct'), 1)), onlyInStock: searchParams.get('onlyInStock') !== 'false' }, Math.min(Math.max(numberParam(searchParams.get('limit'), 200), 1), 500))
    return NextResponse.json(result)
  })
}
