import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function POST(request: Request, props: { params: Promise<{ code: string }> }) {
  try {
    const params = await props.params;
    const { code } = params;
    const body = await request.json();
    const { teacherId, participantId, action, payload } = body;

    if (!teacherId || !participantId || !action) {
      return NextResponse.json({ error: 'Thiếu thông tin điều chỉnh người tham gia' }, { status: 400 });
    }

    const result = store.manageParticipant(code, teacherId, participantId, action, payload || {});
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi quản lý người tham gia' }, { status: 500 });
  }
}
