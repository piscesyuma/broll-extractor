import { readFile } from 'fs/promises'
import { join } from 'path'

type RequestData = {
  currentModel: string
  message: string
  selectedKnowledgeFiles?: string[]
  selectedSchemaFiles?: string[]
  uploadedKnowledgeFiles?: {[key: string]: string}
  uploadedSchemaFiles?: {[key: string]: string}
}

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const { 
    message, 
    currentModel, 
    selectedKnowledgeFiles, 
    selectedSchemaFiles,
    uploadedKnowledgeFiles = {},
    uploadedSchemaFiles = {}
  } = (await request.json()) as RequestData

  console.log('Message:', message, 'Model:', currentModel)
  console.log('Selected Knowledge Files:', selectedKnowledgeFiles)
  console.log('Selected Schema Files:', selectedSchemaFiles)
  console.log('Uploaded Knowledge Files:', Object.keys(uploadedKnowledgeFiles))
  console.log('Uploaded Schema Files:', Object.keys(uploadedSchemaFiles))

  if (!message) {
    return new Response('No message in the request', { status: 400 })
  }

  try {
    // Build knowledge base content from uploaded files or defaults
    let knowledgeBaseContent = ''

    if (selectedKnowledgeFiles?.includes('broll-keyword-engine.md')) {
      const filePath = join(process.cwd(), 'public', 'knowledge', 'broll-keyword-engine.md')
      knowledgeBaseContent = await readFile(filePath, 'utf-8')
    }

    for (const filename of Object.keys(uploadedKnowledgeFiles)) {
      let content = ''
      
      // First try to get from uploaded files
      content = uploadedKnowledgeFiles[filename]
      console.log(`Using uploaded content for knowledge file: ${filename}`)
      
      knowledgeBaseContent += `\n--- ${filename} ---\n${content}\n`
    }
    
    // Build schema tool content from uploaded files or defaults
    let schemaToolContent = ''
    const filePathSchema = join(process.cwd(), 'public', 'schema', '3-keyword-extractor.md')
    const defaultSchemaToolContent = await readFile(filePathSchema, 'utf-8')

    for (const filename of Object.keys(uploadedSchemaFiles)) {
      let content = ''
      
      // First try to get from uploaded files
      if (uploadedSchemaFiles[filename]) {
        content = uploadedSchemaFiles[filename]
        console.log(`Using uploaded content for schema file: ${filename}`)
      } else {
        // Fallback to default content
        content = defaultSchemaToolContent
        console.log(`Using default content for schema file: ${filename}`)
      }
      
      schemaToolContent += `\n--- ${filename} ---\n${content}\n`
    }
    
    if (schemaToolContent.length === 0) {
      schemaToolContent = defaultSchemaToolContent
    }

    // Convert knowledge base and schema content to string and prepend to message
    const enhancedMessage = `Knowledge Base:${knowledgeBaseContent}\n\nSchema Tool:${schemaToolContent}\n\nUser Query: ${message}`
    
    console.log('Knowledge base content length:', knowledgeBaseContent.length)
    console.log('Schema tool content length:', schemaToolContent.length)

    // Create FormData for multipart/form-data request
    const formData = new FormData()
    formData.append('model', currentModel || 'gpt-4')
    formData.append('messages', enhancedMessage)
    formData.append('temperature', '0.7')
    formData.append('max_tokens', '4000')
    formData.append('knowledge_base', '')
    formData.append('schema_tool', '')

    // Call the Felidae network API
    const felidaeResponse = await fetch('https://dev.felidae.network/api/chatgpt/chat_completion', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'X-CSRF-TOKEN': '',
        // Don't set Content-Type for FormData - browser will set it automatically with boundary
      },
      body: formData,
    })

    if (!felidaeResponse.ok) {
      throw new Error(`Felidae API error: ${felidaeResponse.status} ${felidaeResponse.statusText}`)
    }

    // Handle the JSON response
    const responseJson = await felidaeResponse.json()
    console.log("API Response:", responseJson)
    
    // Extract the content from the nested response structure
    const content = responseJson?.data?.choices?.[0]?.message?.content || ''
    
    if (!content) {
      throw new Error('No content found in API response')
    }

    // Since the original UI expects streaming, we'll simulate it by sending the content as chunks
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder()
        
        // Split content into words to simulate streaming
        const words = content.split(' ')
        let index = 0
        
        const sendNextChunk = () => {
          if (index < words.length) {
            const chunk = (index === 0 ? words[index] : ' ' + words[index])
            controller.enqueue(encoder.encode(chunk))
            index++
            // Add a small delay to simulate streaming
            setTimeout(sendNextChunk, 50)
          } else {
            controller.close()
          }
        }
        
        sendNextChunk()
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error) {
    console.error('Error calling Felidae API:', error)
    return new Response(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, { 
      status: 500 
    })
  }
} 