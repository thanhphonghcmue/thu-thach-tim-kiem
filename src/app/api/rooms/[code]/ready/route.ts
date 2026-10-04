import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function POST(request: Request, props: { params: Promise<{ code: string }> }) {
  try {
    const body = await request.json();
    const { participantId, isReady } = body;

    if (!participantId) {
      return NextResponse.json({ error: 'Thiếu participantId' }, { status: 400 });
    }

    const ok = store.setParticipantReady(participantId, !!isReady);
    return NextResponse.json({ success: ok });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi cập nhật trạng thái sẵn sàng' }, { status: 500 });
  }
}
