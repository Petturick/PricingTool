import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseImportFile } from '@/lib/import-parser'

export async function GET() {
  const tasks = await prisma.importTask.findMany({ include: { user: true }, orderBy: { createdAt: 'desc' }, take: 25 })
  return NextResponse.json(tasks)
}

export async function POST(request: Request) {
  const contentType = request.headers.get('content-type') ?? ''

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Bestand ontbreekt.' }, { status: 400 })
    }

    try {
      const parsed = await parseImportFile(file.name, await file.arrayBuffer())
      return NextResponse.json({ headers: parsed.headers, preview: parsed.rows.slice(0, 10), rows: parsed.rows, format: parsed.format })
    } catch {
      return NextResponse.json({ error: 'Bestand kon niet veilig worden verwerkt.' }, { status: 400 })
    }
  }

  const body = await request.json()
  return NextResponse.json({ message: 'Gebruik de importwizard of upload een bestand via multipart/form-data.', received: body }, { status: 202 })
}
