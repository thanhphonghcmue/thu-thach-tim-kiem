import { NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { QUESTION_BANK } from '@/data/questions';

export async function GET(request: Request, props: { params: Promise<{ code: string }> }) {
  const params = await props.params;
  const { code } = params;
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('studentId');
  const teacherId = searchParams.get('teacherId');

  const room = store.getRoomByCode(code);
  if (!room) {
    return NextResponse.json({ error: 'Không tìm thấy phòng thi với mã này' }, { status: 404 });
  }

  const isTeacher = teacherId && room.teacherId === teacherId;
  const isPublished = room.status === 'published';

  // Lấy các câu hỏi được chọn trong phòng
  const questions = room.selectedQuestionIds.map(qId => {
    const q = QUESTION_BANK.find(item => item.id === qId);
    if (!q) return null;

    // Bảo mật: Nếu chưa công bố và không phải giáo viên, giấu đáp án và giải thích
    if (!isPublished && !isTeacher) {
      return {
        id: q.id,
        title: q.title,
        content: q.content,
        options: q.options,
        // Giấu correctOptionId và explanation
      };
    }

    return q;
  }).filter(Boolean);

  const allParticipants = store.getParticipantsByRoom(room.id);
  const enhancedParticipants = allParticipants.map(p => {
    const isMe = studentId && p.id === studentId;
    const canView = isTeacher || isMe;
    const draft = canView ? store.getDraft(p.id) : undefined;
    const rawSub = store.getSubmission(p.id);

    let submission = undefined;
    if (rawSub && (canView || isPublished)) {
      submission = {
        ...rawSub,
        score: (!isPublished && !isTeacher) ? undefined : rawSub.score,
      };
    }

    return {
      ...p,
      draft,
      submission,
    };
  });

  const myDraft = studentId ? store.getDraft(studentId) : undefined;
  const rawMySub = studentId ? store.getSubmission(studentId) : undefined;
  const mySubmission = rawMySub ? {
    ...rawMySub,
    score: (!isPublished && !isTeacher) ? undefined : rawMySub.score,
  } : undefined;

  const leaderboard = (isPublished || isTeacher) ? store.getLeaderboard(room.id) : [];

  return NextResponse.json({
    room,
    questions,
    groups: [],
    participants: enhancedParticipants,
    myDraft,
    mySubmission,
    leaderboard,
  });
}
