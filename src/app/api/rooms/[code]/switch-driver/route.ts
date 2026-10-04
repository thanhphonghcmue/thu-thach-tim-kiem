import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function POST(request: Request, props: { params: Promise<{ code: string }> }) {
  try {
    const params = await props.params;
    const { code } = params;
    const body = await request.json();
    const { groupId, requesterStudentId, newDriverStudentId } = body;

    const group = store.getGroupById(groupId);
    if (!group) {
      return NextResponse.json({ error: 'Không tìm thấy nhóm' }, { status: 404 });
    }

    // Cho phép nếu người yêu cầu là thành viên của nhóm hoặc là driver hiện tại
    if (!group.studentIds.includes(requesterStudentId)) {
      return NextResponse.json({ error: 'Bạn không phải thành viên của nhóm này' }, { status: 403 });
    }

    if (!group.studentIds.includes(newDriverStudentId)) {
      return NextResponse.json({ error: 'Người được chuyển quyền không nằm trong nhóm' }, { status: 400 });
    }

    const updated = store.setGroupDriver(groupId, newDriverStudentId);
    return NextResponse.json({ success: true, group: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi chuyển quyền điều khiển' }, { status: 500 });
  }
}
