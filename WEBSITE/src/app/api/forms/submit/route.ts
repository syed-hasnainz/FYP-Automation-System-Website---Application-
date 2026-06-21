import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createNotification, notifyUsersByRole, NotificationTemplates } from '@/lib/notification-service';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// POST /api/forms/submit
export async function POST(request: NextRequest) {
  try {
    const submittedBy = request.headers.get('x-user-id') || null;
    
    // Check if request is FormData (for file uploads) or JSON
    const contentType = request.headers.get('content-type') || '';
    
    let formType: string;
    let formData: any;
    let fileUrl: string | null = null;
    let fileName: string | null = null;
    let fileType: string | null = null;
    let fileSize: number | null = null;

    if (contentType.includes('multipart/form-data')) {
      // Handle FormData (with optional file)
      const formDataObj = await request.formData();
      formType = formDataObj.get('type') as string;
      const dataString = formDataObj.get('data') as string;
      
      if (!formType || !dataString) {
        return NextResponse.json(
          { error: 'Form type and data are required' },
          { status: 400 }
        );
      }

      try {
        formData = JSON.parse(dataString);
      } catch (parseError) {
        return NextResponse.json(
          { error: 'Invalid form data format' },
          { status: 400 }
        );
      }

      // Handle file upload if present
      const file = formDataObj.get('file') as File | null;
      if (file && file.size > 0) {
        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
          return NextResponse.json(
            { error: 'File size exceeds 10MB limit' },
            { status: 400 }
          );
        }

        // Validate file type
        const allowedTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'image/jpeg',
          'image/png',
        ];
        
        if (!allowedTypes.includes(file.type)) {
          return NextResponse.json(
            { error: 'Invalid file type. Only PDF, DOC, DOCX, JPG, PNG are allowed' },
            { status: 400 }
          );
        }

        // Save file
        const uploadsDir = join(process.cwd(), 'public', 'uploads', 'form-submissions');
        if (!existsSync(uploadsDir)) {
          await mkdir(uploadsDir, { recursive: true });
        }

        const timestamp = Date.now();
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        fileName = `${timestamp}_${sanitizedFileName}`;
        const filePath = join(uploadsDir, fileName);

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await writeFile(filePath, buffer);

        fileUrl = `/uploads/form-submissions/${fileName}`;
        fileType = file.type;
        fileSize = file.size;
      }
    } else {
      // Handle JSON (for forms without files)
      try {
        const data = await request.json();
        formType = data.type;
        formData = data;
      } catch (jsonError) {
        return NextResponse.json(
          { error: 'Invalid request format. Expected JSON or FormData.' },
          { status: 400 }
        );
      }
    }

    if (!formType) {
      return NextResponse.json(
        { error: 'Form type is required' },
        { status: 400 }
      );
    }

    // Add file information to form data if file was uploaded
    if (fileUrl) {
      formData.fileUrl = fileUrl;
      formData.fileName = fileName;
      formData.fileType = fileType;
      formData.fileSize = fileSize;
    }

    // Create submission in database
    const submission = await db.formSubmission.create({
      data: {
        type: formType,
        data: formData,
        submittedBy,
        status: 'PENDING',
      },
    });

    // Notify student (submitter)
    if (submittedBy) {
      await createNotification({
        userId: submittedBy,
        ...NotificationTemplates.fileUploaded(
          formData.projectTitle || formData.subject || formType,
          'You',
          formData.projectTitle || formData.subject || formType
        ),
        category: 'form',
        link: '/student/forms',
      });
    }

    // Notify committee head and super admin
    await notifyUsersByRole('COMMITTEE_HEAD', {
      ...NotificationTemplates.fileUploaded(
        formData.projectTitle || formData.subject || formType,
        submittedBy || 'Student',
        formData.projectTitle || formData.subject || formType
      ),
      category: 'form',
      link: '/committee-head',
    });
    await notifyUsersByRole('ADMIN', {
      ...NotificationTemplates.fileUploaded(
        formData.projectTitle || formData.subject || formType,
        submittedBy || 'Student',
        formData.projectTitle || formData.subject || formType
      ),
      category: 'form',
      link: '/super-admin',
    });

    return NextResponse.json({ success: true, submissionId: submission.id });
  } catch (error: any) {
    console.error('Failed to save form submission:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to submit form' },
      { status: 500 }
    );
  }
}
