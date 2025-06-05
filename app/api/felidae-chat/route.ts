import { readFile } from 'fs/promises'
import { join } from 'path'

type RequestData = {
  currentModel: string
  message: string
  selectedKnowledgeFiles?: string[]
  selectedSchemaFiles?: string[]
}

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const { message, currentModel, selectedKnowledgeFiles, selectedSchemaFiles } = (await request.json()) as RequestData

  console.log('Message:', message, 'Model:', currentModel)
  console.log('Selected Knowledge Files:', selectedKnowledgeFiles)
  console.log('Selected Schema Files:', selectedSchemaFiles)

  if (!message) {
    return new Response('No message in the request', { status: 400 })
  }

  try {
    // Use default files if none selected
    const knowledgeFiles = selectedKnowledgeFiles && selectedKnowledgeFiles.length > 0 
      ? selectedKnowledgeFiles 
      : ['broll-keyword-engine.md']
    
    const schemaFiles = selectedSchemaFiles && selectedSchemaFiles.length > 0 
      ? selectedSchemaFiles 
      : ['3-keyword-extractor.md']

    // Read multiple knowledge base files
    let knowledgeBaseContent = ''
    for (const filename of knowledgeFiles) {
      try {
        const filePath = join(process.cwd(), 'public', 'knowledge', filename)
        const content = await readFile(filePath, 'utf-8')
        knowledgeBaseContent += `\n--- ${filename} ---\n${content}\n`
      } catch (error) {
        console.warn(`Could not read knowledge file: ${filename}`, error)
      }
    }
    
    // Read multiple schema tool files
    let schemaToolContent = ''
    for (const filename of schemaFiles) {
      try {
        const filePath = join(process.cwd(), 'public', 'schema', filename)
        const content = await readFile(filePath, 'utf-8')
        schemaToolContent += `\n--- ${filename} ---\n${content}\n`
      } catch (error) {
        console.warn(`Could not read schema file: ${filename}`, error)
      }
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