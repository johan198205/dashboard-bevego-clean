import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const files = await prisma.fileUpload.findMany({
      where: { active: true },
      orderBy: { uploadedAt: 'desc' },
      select: {
        id: true,
        kind: true,
        originalName: true,
        uploadedAt: true,
        period: true,
        active: true,
      },
    });

    return NextResponse.json(files);
  } catch (error) {
    console.error('Error fetching files:', error);
    return NextResponse.json(
      { error: 'Failed to fetch files' },
      { status: 500 }
    );
  }
}
