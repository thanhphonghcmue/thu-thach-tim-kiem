import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function POST(request: Request, props: { params: Promise<{ code: string }> }) {
  try {
    const params = await props.params;
    const { code } = params;
    const body = await request.json();
    const { nickname, avatar, groupId } = body;

    if (!nickname || !nickname.trim()) {
      return NextResponse.json({ error: 'Vui lòng nhập tên hoặc biệt danh của bạn' }, { status: 400 });
    }

    const result = store.joinRoomParticipant(code, nickname, avatar, groupId);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const room = store.getRoomByCode(code);
    const groups = room ? store.getGroupsByRoom(room.id) : [];

    return NextResponse.json({
      success: true,
      participant: result.participant,
      room,
      groups,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi tham gia phòng' }, { status: 500 });
  }
}
