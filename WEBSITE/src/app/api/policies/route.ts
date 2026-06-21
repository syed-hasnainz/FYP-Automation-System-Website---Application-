import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const faculty = searchParams.get('faculty')
    
    const where: any = { isActive: true }
    if (faculty) {
      where.faculty = faculty
    }
    
    const policies = await db.policy.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json(policies)
  } catch (error) {
    console.error('Error fetching policies:', error)
    return NextResponse.json({ error: 'Failed to fetch policies' }, { status: 500 })
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
    const faculty = formData.get('faculty') as string | null
    const file = formData.get('file') as File

    if (!title || !file) {
      return NextResponse.json({ error: 'Title and file are required' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only PDF, DOC, DOCX, PPT, PPTX are allowed' }, { status: 400 })
    }

    // Get file extension
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || ''
    const fileType = fileExtension === 'pdf' ? 'PDF' : fileExtension === 'doc' || fileExtension === 'docx' ? 'DOC' : 'PPT'

    // Save file
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'policies')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const filePath = join(uploadsDir, fileName)
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, fileBuffer)

    const fileUrl = `/uploads/policies/${fileName}`

    // Create policy in database
    const policy = await db.policy.create({
      data: {
        title,
        description: description || null,
        fileUrl,
        fileName: file.name,
        fileSize: file.size,
        fileType,
        faculty: faculty || null,
        createdBy: userId,
        isActive: true
      }
    })

    return NextResponse.json({ policy }, { status: 201 })
  } catch (error) {
    console.error('Error creating policy:', error)
    return NextResponse.json({ error: 'Failed to create policy' }, { status: 500 })
  }
}

