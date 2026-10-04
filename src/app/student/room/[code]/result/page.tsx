'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import RubricScoreBreakdown from '@/components/RubricScoreBreakdown';
import HandTraceStepView from '@/components/HandTraceStepView';
import { Room, User, GroupSubmission, HandTraceData } from '@/types';
import { Award, RotateCcw, CheckCircle2, BookOpen, ArrowLeft, Send } from 'lucide-react';

export default function StudentResultPage({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = use(params);
  const roomCode = resolvedParams.code.toUpperCase();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [myGroup, setMyGroup] = useState<any | null>(null);
  const [submission, setSubmission] = useState<GroupSubmission | null>(null);

  // Trạng thái lượt sửa sai
  const [isRevising, setIsRevising] = useState(false);
  const [revisedHandTrace, setRevisedHandTrace] = useState<HandTraceData>({
    steps: [],
    finalIndex: '',
    checkCount: '',
    eliminationExplanation: '',
  });
  const [revisedSubmitting, setRevisedSubmitting] = useState(false);
  const [revisedSuccess, setRevisedSuccess] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('app_user');
    if (!saved) {
      router.push(`/login?role=student&returnUrl=${encodeURIComponent(`/student/room/${roomCode}/result`)}`);
      return;
    }
    const u = JSON.parse(saved);
    setUser(u);
    loadData(u.id);

    // Lắng nghe SSE
    const eventSource = new EventSource(`/api/rooms/${roomCode}/events`);
    eventSource.onmessage = () => {
      loadData(u.id);
    };

    return () => {
      eventSource.close();
    };
  }, [roomCode]);

  const loadData = async (studentId: string) => {
    try {
      const res = await fetch(`/api/rooms/${roomCode}?studentId=${studentId}`);
      const data = await res.json();
      if (data.room) {
        setRoom(data.room);
        const g = data.groups?.find((grp: any) => grp.studentIds.includes(studentId));
        if (g) {
          setMyGroup(g);
          if (g.submission) {
            setSubmission(g.submission);
            if (!isRevising) {
              setRevisedHandTrace(g.submission.handTrace);
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myGroup || !user || !submission) return;

    setRevisedSubmitting(true);
    try {
      const res = await fetch(`/api/rooms/${roomCode}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: myGroup.id,
          studentId: user.id,
          mcqAnswers: submission.mcqAnswers,
          handTrace: revisedHandTrace,
          isRevision: true,
        }),
      });

      if (res.ok) {
        setRevisedSuccess(true);
        setIsRevising(false);
        loadData(user.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRevisedSubmitting(false);
    }
  };

  const isDriver = myGroup && user && myGroup.driverStudentId === user.id;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-16">
      <Header currentUser={user} roomCode={roomCode} />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-6 w-full space-y-6">
        {/* Banner kết quả */}
        <div className="bg-gradient-to-r from-sky-600 to-teal-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur text-xs font-bold uppercase tracking-wider mb-2">
              <Award className="w-4 h-4 text-amber-300" />
              Kết quả & Đánh giá sư phạm
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              {myGroup?.name || 'Nhóm'} • Bài thi hoàn tất
            </h1>
            <p className="text-xs text-sky-100 mt-1">
              Phòng: <strong>{roomCode}</strong> • {room?.name}
            </p>
          </div>

          <button
            onClick={() => router.push(`/student/room/${roomCode}/play`)}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Xem lại phòng thi
          </button>
        </div>

        {/* Bảng điểm Rubric chi tiết từng tiêu chí */}
        {submission?.score ? (
          <RubricScoreBreakdown score={submission.score} />
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
            Đang tải dữ liệu điểm số của nhóm...
          </div>
        )}

        {/* Khu vực sửa sai để học tập (Nếu giáo viên mở lượt sửa) */}
        {room?.isRevisionOpen && (
          <div className="bg-white rounded-2xl border border-teal-200 shadow-sm p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-teal-600 block">
                  Hoạt động sửa sai để khắc phục lỗi nhận thức
                </span>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-teal-600" />
                  Lượt sửa bài tập chạy tay nhị phân
                </h3>
              </div>

              {!isRevising && (
                <button
                  onClick={() => setIsRevising(true)}
                  disabled={!isDriver}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                >
                  {isDriver ? 'Bắt đầu sửa bài' : 'Chờ người điều khiển bấm sửa'}
                </button>
              )}
            </div>

            {isRevising ? (
              <form onSubmit={handleSendRevision} className="space-y-4">
                <p className="text-xs text-slate-600">
                  Dựa vào các nhận xét ở trên, các em hãy cùng thảo luận để điều chỉnh lại các bước chạy tay và nộp bản sửa:
                </p>

                <HandTraceStepView
                  data={revisedHandTrace}
                  onChange={setRevisedHandTrace}
                  disabled={!isDriver}
                />

                <div className="flex justify-end gap-2 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setIsRevising(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Hủy sửa
                  </button>
                  <button
                    type="submit"
                    disabled={revisedSubmitting || !isDriver}
                    className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {revisedSubmitting ? 'Đang nộp...' : 'Nộp bản sửa sai'}
                  </button>
                </div>
              </form>
            ) : revisedSuccess ? (
              <div className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Đã nộp bài sửa thành công! Điểm xếp hạng chính thức giữ nguyên lượt 1, Thầy/Cô sẽ ghi nhận tiến bộ của nhóm.
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                *Theo nguyên tắc sư phạm: Bảng xếp hạng giữ điểm lần đầu để đảm bảo công bằng thi đua, bài sửa giúp các em hiểu rõ bản chất thuật toán và được giáo viên đánh giá tiến bộ.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
