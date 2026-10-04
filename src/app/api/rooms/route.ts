import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const teacherId = searchParams.get('teacherId');

  if (!teacherId) {
    return NextResponse.json({ error: 'Thiếu teacherId' }, { status: 400 });
  }

  const rooms = store.getRoomsByTeacher(teacherId);
  return NextResponse.json({ rooms });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { teacherId, classId, name, selectedQuestionIds, timeLimitMinutes, groupCount } = body;

    if (!teacherId || !classId || !name) {
      return NextResponse.json({ error: 'Vui lòng điền đủ tên phòng, lớp học' }, { status: 400 });
    }

    // Kiểm tra quyền giáo viên phía máy chủ
    const user = store.getUserById(teacherId);
    if (!user || user.role !== 'teacher') {
      return NextResponse.json({ error: 'Chỉ giáo viên mới có quyền tạo phòng học' }, { status: 403 });
    }

    // Chọn đúng 5 trong 6 câu
    const questions = selectedQuestionIds && selectedQuestionIds.length === 5
      ? selectedQuestionIds
      : ['mcq-1', 'mcq-2', 'mcq-3', 'mcq-4', 'mcq-5'];

    const { room, groups } = store.createRoom(
      teacherId,
      classId,
      name,
      questions,
      timeLimitMinutes || 9,
      groupCount || 3
    );

    return NextResponse.json({ room, groups });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi tạo phòng' }, { status: 500 });
  }
}
