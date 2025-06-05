'use client'
import type OpenAI from 'openai'
import { useEffect, useRef, useState } from 'react'

// Loading Spinner Component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center space-x-2">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
    <span className="text-gray-600 dark:text-gray-300">Processing...</span>
  </div>
)

const Form = ({ modelsList }: { modelsList: OpenAI.ModelsPage }) => {
  const messageInput = useRef<HTMLTextAreaElement | null>(null)
  const knowledgeFileInput = useRef<HTMLInputElement | null>(null)
  const schemaFileInput = useRef<HTMLInputElement | null>(null)
  const [history, setHistory] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isUploading, setIsUploading] = useState<boolean>(false)
  const [models, setModels] = useState(modelsList.data)
  const [currentModel, setCurrentModel] = useState<string>('gpt-4')
  const [uploadStatus, setUploadStatus] = useState<string>('')
  const [showFileUpload, setShowFileUpload] = useState<boolean>(false)
  const [showFileSelector, setShowFileSelector] = useState<boolean>(false)
  const [availableFiles, setAvailableFiles] = useState<{knowledge: string[], schema: string[]}>({knowledge: [], schema: []})
  const [selectedKnowledgeFiles, setSelectedKnowledgeFiles] = useState<string[]>(['broll-keyword-engine.md'])
  const [selectedSchemaFiles, setSelectedSchemaFiles] = useState<string[]>(['3-keyword-extractor.md'])

  const handleEnter = (
    e: React.KeyboardEvent<HTMLTextAreaElement> &
      React.FormEvent<HTMLFormElement>
  ) => {
    if (e.key === 'Enter' && !e.shiftKey && isLoading === false) {
      e.preventDefault()
      setIsLoading(true)
      handleSubmit(e)
    }
  }

  const handleFileUpload = async (file: File, type: 'knowledge' | 'schema') => {
    setIsUploading(true)
    setUploadStatus(`Uploading ${type} file...`)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)

    try {
      const response = await fetch('/api/upload-files', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`)
      }

      const result = await response.json()
      setUploadStatus(`${type} file uploaded successfully: ${result.filename}`)
      
      // Clear file input
      if (type === 'knowledge' && knowledgeFileInput.current) {
        knowledgeFileInput.current.value = ''
      }
      if (type === 'schema' && schemaFileInput.current) {
        schemaFileInput.current.value = ''
      }

      setTimeout(() => setUploadStatus(''), 3000)
    } catch (error) {
      console.error('Upload error:', error)
      setUploadStatus(`Error: ${error instanceof Error ? error.message : 'Upload failed'}`)
      setTimeout(() => setUploadStatus(''), 5000)
    } finally {
      setIsUploading(false)
    }
  }

  const handleKnowledgeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file, 'knowledge')
    }
  }

  const handleSchemaFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file, 'schema')
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const message = messageInput.current?.value

    if (!message || !message.trim()) {
      setIsLoading(false)
      return
    }

    // Clear the input field
    messageInput.current!.value = ''
    
    try {
      const response = await fetch('/api/felidae-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message.trim(),
          currentModel,
          selectedKnowledgeFiles,
          selectedSchemaFiles,
        }),
      })
      
      console.log('Felidae API response received.')

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API Error: ${response.status} - ${errorText}`)
      }

      const data = response.body
      if (!data) {
        throw new Error('No response data received')
      }

      const reader = data.getReader()
      const decoder = new TextDecoder()
      let done = false

      // Initialize response accumulator
      let accumulatedResponse = ''
      
      while (!done) {
        const { value, done: doneReading } = await reader.read()
        done = doneReading
        
        if (value) {
          const chunkValue = decoder.decode(value)
          accumulatedResponse += chunkValue
          
          // Update history with the accumulated response so far
          setHistory([accumulatedResponse])
        }
      }
      
      console.log('Streaming complete. Final response:', accumulatedResponse)
      
    } catch (error) {
      console.error('Error in handleSubmit:', error)
      setHistory([`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`])
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    localStorage.removeItem('response')
    setHistory([])
  }

  // Save the 'history' state to 'localStorage' whenever it changes
  useEffect(() => {
    localStorage.setItem('response', JSON.stringify(history))
  }, [history])

  // Initialize 'history' state from 'localStorage' when the component mounts
  useEffect(() => {
    const storedResponse = localStorage.getItem('response')
    if (storedResponse) {
      setHistory(JSON.parse(storedResponse))
    }
  }, [])

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentModel(e.target.value)
  }

  const toggleFileUpload = () => {
    setShowFileUpload(!showFileUpload)
  }

  const toggleFileSelector = () => {
    setShowFileSelector(!showFileSelector)
    if (!showFileSelector) {
      loadAvailableFiles()
    }
  }

  const loadAvailableFiles = async () => {
    try {
      const response = await fetch('/api/list-files?type=both')
      if (response.ok) {
        const files = await response.json()
        setAvailableFiles(files)
      }
    } catch (error) {
      console.error('Failed to load available files:', error)
    }
  }

  const handleKnowledgeFileSelection = (filename: string) => {
    setSelectedKnowledgeFiles(prev => 
      prev.includes(filename) 
        ? prev.filter(f => f !== filename)
        : [...prev, filename]
    )
  }

  const handleSchemaFileSelection = (filename: string) => {
    setSelectedSchemaFiles(prev => 
      prev.includes(filename) 
        ? prev.filter(f => f !== filename)
        : [...prev, filename]
    )
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800'>
      {/* Header */}
      <div className='fixed top-0 left-0 right-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700'>
        <div className='max-w-7xl mx-auto px-4 py-4 flex items-center justify-between'>
          <div className='flex items-center space-x-4'>
            <h1 className='text-xl font-bold text-gray-900 dark:text-white'>
              🎬 B-Roll Keyword Generator
            </h1>
            <select
              value={currentModel}
              onChange={handleModelChange}
              className='px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all'
            >
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.id}
                </option>
              ))}
            </select>
          </div>
          
          <div className='flex items-center space-x-3'>
            <button
              onClick={toggleFileUpload}
              type='button'
              className={`px-4 py-2 rounded-lg font-medium transition-colors shadow-sm flex items-center space-x-2 ${
                showFileUpload 
                  ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                  : 'bg-gray-500 hover:bg-gray-600 text-white'
              }`}
            >
              <svg
                className='h-4 w-4'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                viewBox='0 0 24 24'
              >
                <path d='M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-5l-2-2H5a2 2 0 00-2 2z'></path>
              </svg>
              <span>{showFileUpload ? 'Hide Files' : 'Show Files'}</span>
            </button>
            
            <button
              onClick={handleReset}
              type='button'
              className='px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition-colors shadow-sm'
            >
              Clear History
            </button>
          </div>
        </div>
      </div>

      {/* File Upload Section */}
      {showFileUpload && (
        <div className='pt-20 pb-4 px-4'>
          <div className='max-w-4xl mx-auto'>
            <div className='bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-6'>
              <h2 className='text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center'>
                <span className='mr-2'>📁</span>
                File Management
              </h2>
              
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                {/* Knowledge File Upload */}
                <div className='space-y-2'>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300'>
                    Knowledge Base Files (.md)
                  </label>
                  <div className='flex items-center space-x-2'>
                    <input
                      ref={knowledgeFileInput}
                      type='file'
                      accept='.md,.txt'
                      onChange={handleKnowledgeFileChange}
                      disabled={isUploading}
                      className='block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-blue-300 file:cursor-pointer disabled:opacity-50'
                    />
                  </div>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>
                    Upload to /public/knowledge/
                  </p>
                </div>

                {/* Schema File Upload */}
                <div className='space-y-2'>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300'>
                    Schema Tool Files (.md)
                  </label>
                  <div className='flex items-center space-x-2'>
                    <input
                      ref={schemaFileInput}
                      type='file'
                      accept='.md,.txt'
                      onChange={handleSchemaFileChange}
                      disabled={isUploading}
                      className='block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-green-700 hover:file:bg-green-100 dark:file:bg-green-900 dark:file:text-green-300 file:cursor-pointer disabled:opacity-50'
                    />
                  </div>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>
                    Upload to /public/schema/
                  </p>
                </div>
              </div>

              {/* Upload Status */}
              {(uploadStatus || isUploading) && (
                <div className='mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'>
                  <div className='flex items-center space-x-2'>
                    {isUploading && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                    )}
                    <span className='text-sm text-blue-700 dark:text-blue-300'>{uploadStatus}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={`pb-32 px-4 ${showFileUpload ? '' : 'pt-20'}`}>
        <div className='max-w-4xl mx-auto'>
          {/* Response Area */}
          {(history.length > 0 || isLoading) && (
            <div className='mb-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6'>
              <div className='flex items-center justify-between mb-4'>
                <h2 className='text-lg font-semibold text-gray-900 dark:text-white flex items-center'>
                  <span className='mr-2'>🤖</span>
                  AI Response
                </h2>
                {isLoading && <LoadingSpinner />}
              </div>
              
              {isLoading && history.length === 0 ? (
                <div className='flex items-center justify-center py-12'>
                  <div className='text-center'>
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-300">Analyzing your content...</p>
                  </div>
                </div>
              ) : (
                <div className='bg-gray-50 dark:bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto'>
                  <pre className='whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200 font-mono leading-relaxed'>
                    {history[0] || 'No response yet...'}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Fixed Input Area */}
      <div className='fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 p-4'>
        <div className='max-w-4xl mx-auto'>
          <form onSubmit={handleSubmit} className='relative'>
            <div className='bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden'>
              <textarea
                ref={messageInput}
                name='Message'
                placeholder='Paste your VSL script here for b-roll keyword extraction...'
                onKeyDown={handleEnter}
                disabled={isLoading}
                className='w-full h-32 resize-none bg-transparent outline-none p-4 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50'
              />
              
              <div className='flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600'>
                <div className='flex items-center space-x-4'>
                  <div className='text-sm text-gray-500 dark:text-gray-400'>
                    Press Enter to send • Shift+Enter for new line
                  </div>
                  
                  <button
                    type='button'
                    onClick={toggleFileSelector}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                      showFileSelector 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                    }`}
                  >
                    {showFileSelector ? 'Hide Files' : 'Select Files'}
                  </button>
                </div>
                
                <button
                  disabled={isLoading}
                  type='submit'
                  className='px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors shadow-sm flex items-center space-x-2 disabled:cursor-not-allowed'
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <svg
                        className='h-4 w-4'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth='2'
                        viewBox='0 0 24 24'
                      >
                        <path d='M12 19l9 2-9-18-9 18 9-2zm0 0v-8'></path>
                      </svg>
                      <span>Generate Keywords</span>
                    </>
                  )}
                </button>
              </div>

              {/* File Selector */}
              {showFileSelector && (
                <div className='p-4 bg-gray-100 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-600'>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    {/* Knowledge Files */}
                    <div>
                      <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                        Knowledge Files ({selectedKnowledgeFiles.length} selected)
                      </h4>
                      <div className='max-h-32 overflow-y-auto space-y-1'>
                        {availableFiles.knowledge.map((filename) => (
                          <label key={filename} className='flex items-center space-x-2 cursor-pointer'>
                            <input
                              type='checkbox'
                              checked={selectedKnowledgeFiles.includes(filename)}
                              onChange={() => handleKnowledgeFileSelection(filename)}
                              className='rounded border-gray-300 text-blue-600 focus:ring-blue-500'
                            />
                            <span className='text-xs text-gray-600 dark:text-gray-400 truncate'>
                              {filename}
                            </span>
                          </label>
                        ))}
                        {availableFiles.knowledge.length === 0 && (
                          <p className='text-xs text-gray-500 italic'>No knowledge files available</p>
                        )}
                      </div>
                    </div>

                    {/* Schema Files */}
                    <div>
                      <h4 className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                        Schema Files ({selectedSchemaFiles.length} selected)
                      </h4>
                      <div className='max-h-32 overflow-y-auto space-y-1'>
                        {availableFiles.schema.map((filename) => (
                          <label key={filename} className='flex items-center space-x-2 cursor-pointer'>
                            <input
                              type='checkbox'
                              checked={selectedSchemaFiles.includes(filename)}
                              onChange={() => handleSchemaFileSelection(filename)}
                              className='rounded border-gray-300 text-green-600 focus:ring-green-500'
                            />
                            <span className='text-xs text-gray-600 dark:text-gray-400 truncate'>
                              {filename}
                            </span>
                          </label>
                        ))}
                        {availableFiles.schema.length === 0 && (
                          <p className='text-xs text-gray-500 italic'>No schema files available</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Form
