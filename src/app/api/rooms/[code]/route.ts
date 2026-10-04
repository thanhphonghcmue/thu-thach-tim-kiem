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

  const groups = store.getGroupsByRoom(room.id);
  const enhancedGroups = groups.map(g => {
    const members = g.studentIds.map(sId => store.getUserById(sId)).filter(Boolean);
    const draft = store.getDraft(g.id);
    const submission = store.getSubmission(g.id);

    // Bảo mật bài nộp: Học sinh không xem được điểm và bài nhóm khác trước khi công bố
    let visibleSubmission = undefined;
    if (submission) {
      if (isTeacher || isPublished || g.studentIds.includes(studentId || '')) {
        visibleSubmission = {
          ...submission,
          // Nếu học sinh xem nhóm mình nhưng chưa công bố, giấu điểm
          score: (!isPublished && !isTeacher) ? undefined : submission.score,
        };
      }
    }

    return {
      ...g,
      members,
      draft: (isTeacher || g.studentIds.includes(studentId || '')) ? draft : undefined,
      submission: visibleSubmission,
    };
  });

  const leaderboard = (isPublished || isTeacher) ? store.getLeaderboard(room.id) : [];

  return NextResponse.json({
    room,
    questions,
    groups: enhancedGroups,
    leaderboard,
  });
}
