import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// PUT /api/admin/departments/[id] - Update a department
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, code, facultyId, isActive } = body;

    const department = await db.department.update({
      where: { id },
      data: {
        name,
        description,
        code,
        facultyId: facultyId || null,
        isActive: isActive !== undefined ? isActive : true
      }
    });

    return NextResponse.json(department);
  } catch (error: any) {
    console.error('Error updating department:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Department not found' },
        { status: 404 }
      );
    }
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A department with this name or code already exists' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update department' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/departments/[id] - Delete a department
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    await db.department.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Department deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting department:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Department not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to delete department' },
      { status: 500 }
    );
  }
}

