import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function POST(request: Request, props: { params: Promise<{ code: string }> }) {
  try {
    const params = await props.params;
    const { code } = params;
    const body = await request.json();
    const { teacherId, action, extraSeconds, groupId, driverStudentId } = body;

    const room = store.getRoomByCode(code);
    if (!room) {
      return NextResponse.json({ error: 'Không tìm thấy phòng thi' }, { status: 404 });
    }

    const user = store.getUserById(teacherId);
    if (!user || user.role !== 'teacher' || room.teacherId !== teacherId) {
      return NextResponse.json({ error: 'Chỉ giáo viên sở hữu phòng mới có quyền điều khiển' }, { status: 403 });
    }

    let updatedRoom = room;

    switch (action) {
      case 'start':
        updatedRoom = store.updateRoom(room.id, {
          status: 'running',
          startedAt: room.startedAt || new Date().toISOString(),
        })!;
        break;

      case 'pause':
        updatedRoom = store.updateRoom(room.id, { status: 'paused' })!;
        break;

      case 'resume':
        updatedRoom = store.updateRoom(room.id, { status: 'running' })!;
        break;

      case 'close':
        updatedRoom = store.updateRoom(room.id, {
          status: 'closed',
          endedAt: new Date().toISOString(),
        })!;
        break;

      case 'publish':
        updatedRoom = store.updateRoom(room.id, { status: 'published' })!;
        break;

      case 'toggle_lock':
        updatedRoom = store.updateRoom(room.id, { isLocked: !room.isLocked })!;
        break;

      case 'extend_time':
        const added = Number(extraSeconds) || 180; // 3 phút mặc định
        updatedRoom = store.updateRoom(room.id, {
          remainingSeconds: room.remainingSeconds + added,
        })!;
        break;

      case 'open_revision':
        updatedRoom = store.updateRoom(room.id, { isRevisionOpen: true })!;
        break;

      case 'change_driver':
        if (groupId && driverStudentId) {
          store.setGroupDriver(groupId, driverStudentId);
        }
        break;

      default:
        return NextResponse.json({ error: `Hành động '${action}' không hợp lệ` }, { status: 400 });
    }

    return NextResponse.json({ success: true, room: updatedRoom });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi điều khiển phòng' }, { status: 500 });
  }
}
