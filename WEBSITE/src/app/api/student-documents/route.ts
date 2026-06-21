import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const uploadedBy = searchParams.get('uploadedBy')
    const documentType = searchParams.get('documentType')
    const faculty = searchParams.get('faculty')
    
    const where: any = {}
    if (uploadedBy) {
      where.uploadedBy = uploadedBy
    }
    if (documentType && documentType !== 'ALL') {
      where.documentType = documentType
    }
    if (faculty) {
      where.faculty = faculty
    }
    
    const documents = await db.studentDocument.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json(documents)
  } catch (error) {
    console.error('Error fetching student documents:', error)
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const title = formData.get('title') as string
    const description = formData.get('description') as string | null
    const documentType = formData.get('documentType') as string
    const file = formData.get('file') as File

    if (!title || !file || !documentType) {
      return NextResponse.json({ error: 'Title, file, and document type are required' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only PDF, DOC, DOCX, PPT, PPTX are allowed' }, { status: 400 })
    }

    // Get user to get faculty and department
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { studentProfile: true }
    })

    const faculty = user?.studentProfile?.faculty || null
    const department = user?.department || null

    // Get file extension
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || ''
    const fileType = fileExtension === 'pdf' ? 'PDF' : fileExtension === 'doc' || fileExtension === 'docx' ? 'DOC' : 'PPT'

    // Save file
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'student-documents')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const filePath = join(uploadsDir, fileName)
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, fileBuffer)

    const fileUrl = `/uploads/student-documents/${fileName}`

    // Create document in database
    const document = await db.studentDocument.create({
      data: {
        title,
        description: description || null,
        fileUrl,
        fileName: file.name,
        fileSize: file.size,
        fileType,
        documentType,
        uploadedBy: userId,
        faculty: faculty || null,
        department: department || null
      }
    })

    return NextResponse.json({ document }, { status: 201 })
  } catch (error) {
    console.error('Error creating student document:', error)
    return NextResponse.json({ error: 'Failed to create document' }, { status: 500 })
  }
}

