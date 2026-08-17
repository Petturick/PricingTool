export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { authorizeApi, VIEW_ROLES, WRITE_ROLES } from '@/lib/authz'
import { withDatabaseRoute } from '@/lib/database-route'
import { prisma } from '@/lib/prisma'
import { competitorSchema } from '@/lib/validators'

export async function GET() {
  const access = await authorizeApi(VIEW_ROLES)
  if (access.response) return access.response

  return withDatabaseRoute(async () => {
    const competitors = await prisma.competitor.findMany({ include: { country: true }, orderBy: { name: 'asc' } })
    return NextResponse.json(competitors)
  })
}

export async function POST(request: Request) {
  const access = await authorizeApi(WRITE_ROLES)
  if (access.response) return access.response

  const body = await request.json()
  const parsed = competitorSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ errors: parsed.error.flatten() }, { status: 400 })
  }
  return withDatabaseRoute(async () => {
    const competitor = await prisma.competitor.create({ data: parsed.data })
    return NextResponse.json(competitor, { status: 201 })
  })
}
