import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function GET(request: Request, props: { params: Promise<{ code: string }> }) {
  const { searchParams } = new URL(request.url);
  const targetId = searchParams.get('studentId') || searchParams.get('participantId') || searchParams.get('groupId');

  if (!targetId) {
    return NextResponse.json({ error: 'Thiếu định danh học sinh' }, { status: 400 });
  }

  const draft = store.getDraft(targetId);
  return NextResponse.json({ draft });
}

export async function POST(request: Request, props: { params: Promise<{ code: string }> }) {
  try {
    const body = await request.json();
    const { studentId, participantId, groupId, draft } = body;
    const targetId = studentId || participantId || groupId;

    if (!targetId || !draft) {
      return NextResponse.json({ error: 'Thiếu dữ liệu lưu bản nháp' }, { status: 400 });
    }

    const result = store.saveDraft(targetId, draft, targetId);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }

    return NextResponse.json({ success: true, draft: result.draft });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi lưu bản nháp' }, { status: 500 });
  }
}
