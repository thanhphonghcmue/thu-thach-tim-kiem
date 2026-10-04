import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function GET(request: Request, props: { params: Promise<{ code: string }> }) {
  const { searchParams } = new URL(request.url);
  const groupId = searchParams.get('groupId');

  if (!groupId) {
    return NextResponse.json({ error: 'Thiếu groupId' }, { status: 400 });
  }

  const draft = store.getDraft(groupId);
  return NextResponse.json({ draft });
}

export async function POST(request: Request, props: { params: Promise<{ code: string }> }) {
  try {
    const body = await request.json();
    const { groupId, studentId, draft } = body;

    if (!groupId || !studentId || !draft) {
      return NextResponse.json({ error: 'Thiếu dữ liệu lưu bản nháp' }, { status: 400 });
    }

    const result = store.saveDraft(groupId, draft, studentId);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }

    return NextResponse.json({ success: true, draft: result.draft });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi lưu bản nháp' }, { status: 500 });
  }
}
