import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function GET(request: Request, props: { params: Promise<{ code: string }> }) {
  const params = await props.params;
  const { code } = params;

  const room = store.getRoomByCode(code);
  if (!room) {
    return NextResponse.json({ error: 'Không tìm thấy phòng' }, { status: 404 });
  }

  const reflections = store.getReflectionsByRoom(room.id);
  return NextResponse.json({ reflections });
}

export async function POST(request: Request, props: { params: Promise<{ code: string }> }) {
  try {
    const params = await props.params;
    const { code } = params;
    const body = await request.json();
    const { studentId, studentName, groupId, content } = body;

    const room = store.getRoomByCode(code);
    if (!room) {
      return NextResponse.json({ error: 'Không tìm thấy phòng' }, { status: 404 });
    }

    if (!studentId || !content || content.trim() === '') {
      return NextResponse.json({ error: 'Nội dung ghi chú không được để trống' }, { status: 400 });
    }

    const saved = store.addReflection({
      roomId: room.id,
      groupId: groupId || '',
      studentId,
      studentName: studentName || 'Học sinh',
      content: content.trim(),
    });

    return NextResponse.json({ success: true, reflection: saved });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi lưu ghi chú cá nhân' }, { status: 500 });
  }
}
