import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function POST(request: Request, props: { params: Promise<{ code: string }> }) {
  try {
    const params = await props.params;
    const { code } = params;
    const body = await request.json();
    const { teacherId, groupId, criterion, originalPts, adjustedPts, reason } = body;

    const room = store.getRoomByCode(code);
    if (!room || room.teacherId !== teacherId) {
      return NextResponse.json({ error: 'Không có quyền duyệt điểm' }, { status: 403 });
    }

    if (!reason || reason.trim() === '') {
      return NextResponse.json({ error: 'Vui lòng nhập lý do điều chỉnh điểm' }, { status: 400 });
    }

    const result = store.adjustScore(groupId, {
      criterion: criterion || 'explanation',
      originalPts: Number(originalPts) || 0,
      adjustedPts: Number(adjustedPts) || 0,
      reason: reason.trim(),
      adjustedAt: new Date().toISOString(),
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, submission: result.submission });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi duyệt điểm' }, { status: 500 });
  }
}
