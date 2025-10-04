import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('Delete request for file ID:', id);

    // First check if file exists
    const existingFile = await prisma.fileUpload.findUnique({
      where: { id },
    });

    console.log('Existing file:', existingFile);

    if (!existingFile) {
      console.log('File not found');
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Soft delete - set active to false
    const file = await prisma.fileUpload.update({
      where: { id },
      data: { active: false },
    });

    console.log('File deleted successfully:', file);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { error: `Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
