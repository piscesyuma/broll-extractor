import { NextRequest, NextResponse } from 'next/server'
import { readdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    if (!type || !['knowledge', 'schema', 'both'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type specified. Use: knowledge, schema, or both' }, { status: 400 })
    }

    const result: { knowledge?: string[], schema?: string[] } = {}

    if (type === 'knowledge' || type === 'both') {
      const knowledgeDir = join(process.cwd(), 'public', 'knowledge')
      if (existsSync(knowledgeDir)) {
        const knowledgeFiles = await readdir(knowledgeDir)
        result.knowledge = knowledgeFiles.filter(file => 
          file.endsWith('.md') || file.endsWith('.txt')
        )
      } else {
        result.knowledge = []
      }
    }

    if (type === 'schema' || type === 'both') {
      const schemaDir = join(process.cwd(), 'public', 'schema')
      if (existsSync(schemaDir)) {
        const schemaFiles = await readdir(schemaDir)
        result.schema = schemaFiles.filter(file => 
          file.endsWith('.md') || file.endsWith('.txt')
        )
      } else {
        result.schema = []
      }
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Error listing files:', error)
    return NextResponse.json(
      { error: 'Failed to list files' },
      { status: 500 }
    )
  }
} 