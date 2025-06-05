import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    if (!type || !['knowledge', 'schema'].includes(type)) {
      return NextResponse.json({ error: 'Invalid file type specified' }, { status: 400 })
    }

    // Validate file type
    const allowedExtensions = ['.md', '.txt']
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
    
    if (!allowedExtensions.includes(fileExtension)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only .md and .txt files are allowed' 
      }, { status: 400 })
    }

    // Determine target directory
    const targetDir = type === 'knowledge' ? 'knowledge' : 'schema'
    const uploadDir = join(process.cwd(), 'public', targetDir)

    // Create directory if it doesn't exist
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Generate safe filename
    const timestamp = Date.now()
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filename = `${timestamp}_${safeName}`
    const filepath = join(uploadDir, filename)

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer()
    const buffer = new Uint8Array(bytes)
    await writeFile(filepath, buffer)

    console.log(`File uploaded successfully: ${filepath}`)

    return NextResponse.json({
      message: 'File uploaded successfully',
      filename: filename,
      path: `${targetDir}/${filename}`,
      type: type,
      size: file.size
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
} 