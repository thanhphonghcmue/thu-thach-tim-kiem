import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function POST(request: Request, props: { params: Promise<{ code: string }> }) {
  try {
    const body = await request.json();
    const { groupId, studentId, mcqAnswers, handTrace, isRevision } = body;

    if (!groupId || !studentId || !mcqAnswers || !handTrace) {
      return NextResponse.json({ error: 'Thiếu dữ liệu nộp bài' }, { status: 400 });
    }

    const result = store.submitGroup(groupId, studentId, mcqAnswers, handTrace, !!isRevision);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, submission: result.submission });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi nộp bài' }, { status: 500 });
  }
}
