// Shared file upload utilities for incidents, problems, and changes

// File system imports - wrapped in try-catch for edge runtime compatibility
let writeFile: any, mkdir: any, join: any, existsSync: any
try {
  const fs = require('fs/promises')
  const path = require('path')
  const fsSync = require('fs')
  writeFile = fs.writeFile
  mkdir = fs.mkdir
  join = path.join
  existsSync = fsSync.existsSync
} catch (error) {
  console.warn('File system operations not available in this runtime')
}

// File upload validation with strict rules
export function validateFile(file: any): { valid: boolean; error?: string } {
  // Rule 1: Check file size (2MB limit)
  const maxSize = 2 * 1024 * 1024 // 2MB in bytes
  if (file.size > maxSize) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
    return {
      valid: false,
      error: `File "${file.name}" (${sizeMB}MB) exceeds the 2MB limit. Please compress or split the file into smaller parts.`
    }
  }
  
  // Rule 3: Check file type - only images (jpg, png), PDFs, and text log files
  const allowedTypes = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'application/pdf': ['.pdf'],
    'text/plain': ['.txt', '.log']
  }
  
  const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
  const isValidType = Object.entries(allowedTypes).some(([mimeType, extensions]) => {
    return file.type === mimeType || extensions.includes(fileExtension)
  })
  
  if (!isValidType) {
    return {
      valid: false,
      error: `File type "${fileExtension}" is not allowed. Please use images (JPG, PNG), PDFs, or text/log files only.`
    }
  }
  
  return { valid: true }
}

// Save uploaded file to local storage
export async function saveUploadedFile(
  file: any, 
  organizationId: string, 
  entityType: 'incidents' | 'problems' | 'changes' | 'comments',
  entityId: string
): Promise<string> {
  console.log(`💾 Saving ${entityType} file:`, file.name, 'Size:', file.size)
  
  if (!writeFile || !mkdir || !join || !existsSync) {
    throw new Error('File system operations not available in this runtime environment')
  }
  
  try {
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    // Create directory structure: uploads/[orgId]/[entityType]/[entityId]/
    const uploadDir = join(process.cwd(), 'uploads', organizationId, entityType, entityId)
    console.log('📁 Upload directory:', uploadDir)
    
    if (!existsSync(uploadDir)) {
      console.log('📁 Creating directory:', uploadDir)
      await mkdir(uploadDir, { recursive: true })
    }
    
    // Sanitize filename and add timestamp to avoid conflicts
    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileName = `${timestamp}_${sanitizedName}`
    const filePath = join(uploadDir, fileName)
    
    console.log('💾 Writing file to:', filePath)
    await writeFile(filePath, buffer)
    console.log('✅ File saved successfully')
    
    // Return relative path for database storage
    return `uploads/${organizationId}/${entityType}/${entityId}/${fileName}`
  } catch (error) {
    console.error('💥 File save error:', error)
    throw error
  }
}

// Create attachment object from uploaded file
export function createAttachmentObject(
  file: any, 
  organizationId: string, 
  entityType: 'incidents' | 'problems' | 'changes' | 'comments',
  entityId: string,
  fileName: string
): any {
  return {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: file.name,
    size: file.size,
    type: file.type,
    url: `/api/files/${organizationId}/${entityType}/${entityId}/${fileName}`
  }
}

// Validate file count (2 files max)
export function validateFileCount(files: File[]): { valid: boolean; error?: string } {
  if (files.length > 2) {
    return {
      valid: false,
      error: 'You can only attach up to 2 files per record. Please remove some files or create separate records.'
    }
  }
  return { valid: true }
}

// Process FormData for entity creation
export function processFormData(formData: FormData): {
  data: Record<string, any>
  files: File[]
} {
  const files: File[] = []
  const data: Record<string, any> = {}
  
  // Extract files
  const fileEntries = formData.getAll('files')
  files.push(...fileEntries.filter(entry => 
    entry && 
    typeof entry === 'object' && 
    'size' in entry && 
    'name' in entry && 
    entry.size > 0
  ) as File[])
  
  // Extract other form data
  for (const [key, value] of formData.entries()) {
    if (key !== 'files') {
      // Try to parse JSON for arrays/objects
      if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
        try {
          data[key] = JSON.parse(value)
        } catch {
          data[key] = value
        }
      } else {
        data[key] = value
      }
    }
  }
  
  return { data, files }
}