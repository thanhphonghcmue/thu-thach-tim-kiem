'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import CppCodeViewer from '@/components/CppCodeViewer';
import HandTraceStepView from '@/components/HandTraceStepView';
import HandTraceTextView from '@/components/HandTraceTextView';
import ConnectionStatus, { SyncState } from '@/components/ConnectionStatus';
import { getAvatarInfo } from '@/components/AvatarPicker';
import { Room, User, HandTraceData, AvatarId } from '@/types';
import {
  Send,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  BookOpen,
  MessageSquare,
  Award,
  ChevronRight,
} from 'lucide-react';

export default function StudentPlayArena({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = use(params);
  const roomCode = resolvedParams.code.toUpperCase();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [avatar, setAvatar] = useState<AvatarId>('cat');
  const [room, setRoom] = useState<Room | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);

  // Trạng thái bài làm cá nhân của học sinh
  const [mcqAnswers, setMcqAnswers] = useState<Record<string, string>>({});
  const [handTraceData, setHandTraceData] = useState<HandTraceData>({
    steps: [
      { stepNumber: 1, left: '', right: '', mid: '', aMid: '', comparison: '', action: '', newLeft: '', newRight: '' },
      { stepNumber: 2, left: '', right: '', mid: '', aMid: '', comparison: '', action: '', newLeft: '', newRight: '' },
      { stepNumber: 3, left: '', right: '', mid: '', aMid: '', comparison: '', action: '', newLeft: '', newRight: '' },
    ],
    finalIndex: '',
    checkCount: '',
    eliminationExplanation: '',
  });

  // Chế độ nhập chạy tay: 'step' (Mặc định) hoặc 'text' (Nhật kí văn bản)
  const [handMode, setHandMode] = useState<'step' | 'text'>('step');

  // Trạng thái đồng bộ mạng
  const [syncState, setSyncState] = useState<SyncState>('saved');
  const [lastSyncedAt, setLastSyncedAt] = useState<string>('');

  // Trạng thái nộp bài
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Ghi chú cá nhân cuối hoạt động
  const [reflectionText, setReflectionText] = useState('');
  const [reflectionSaved, setReflectionSaved] = useState(false);

  useEffect(() => {
    let studentId = '';
    const partSaved = localStorage.getItem(`student_session_${roomCode}`);
    if (partSaved) {
      try {
        const p = JSON.parse(partSaved);
        studentId = p.id;
        if (p.avatar) setAvatar(p.avatar);
        setUser({
          id: p.id,
          role: 'student',
          name: p.nickname,
          username: p.nickname,
          createdAt: p.joinedAt,
        });
      } catch (e) {}
    }

    if (!studentId) {
      const saved = localStorage.getItem('app_user');
      if (saved) {
        try {
          const u = JSON.parse(saved);
          studentId = u.id;
          if (u.avatar) setAvatar(u.avatar);
          setUser(u);
        } catch (e) {}
      }
    }

    if (!studentId) {
      router.push(`/join?room=${roomCode}`);
      return;
    }

    loadRoomAndDraft(studentId);

    // Lắng nghe realtime SSE
    const eventSource = new EventSource(`/api/rooms/${roomCode}/events`);
    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'scores_published' || (payload.type === 'room_updated' && payload.data?.status === 'published')) {
          router.push(`/student/room/${roomCode}/result`);
        }
      } catch (err) {}
    };

    // Định kỳ đồng bộ kiểm tra trạng thái phòng mỗi 5 giây
    const interval = setInterval(() => {
      loadRoomAndDraft(studentId);
    }, 5000);

    return () => {
      eventSource.close();
      clearInterval(interval);
    };
  }, [roomCode]);

  const loadRoomAndDraft = async (studentId: string) => {
    try {
      const res = await fetch(`/api/rooms/${roomCode}?studentId=${studentId}`);
      const data = await res.json();
      if (!res.ok) return;

      if (data.room) {
        setRoom(data.room);
        if (data.room.status === 'published') {
          router.push(`/student/room/${roomCode}/result`);
          return;
        }

        setQuestions(data.questions || []);

        // Khôi phục bài nộp nếu đã nộp
        const mySub = data.mySubmission || data.submission;
        if (mySub?.submittedAt) {
          setIsSubmitted(true);
        }

        // Khôi phục bản nháp nếu chưa nộp
        const myDraft = data.myDraft || data.draft;
        if (!mySub?.submittedAt && myDraft) {
          if (myDraft.mcqAnswers && Object.keys(myDraft.mcqAnswers).length > 0) {
            setMcqAnswers(myDraft.mcqAnswers);
          }
          if (myDraft.handTrace && myDraft.handTrace.steps?.length > 0) {
            setHandTraceData(myDraft.handTrace);
          }
          if (myDraft.updatedAt) {
            setLastSyncedAt(myDraft.updatedAt);
          }
        }
      }
    } catch (err) {
      console.error(err);
      setSyncState('offline');
    }
  };

  // Tự động lưu bản nháp cá nhân lên máy chủ
  const triggerAutoSave = async (updatedMcq: Record<string, string>, updatedHand: HandTraceData) => {
    if (!user || isSubmitted) return;

    setSyncState('saving');
    // Lưu tạm vào localStorage làm bản nháp ngoại tuyến phòng khi mất mạng
    try {
      localStorage.setItem(`offline_draft_${user.id}`, JSON.stringify({
        mcqAnswers: updatedMcq,
        handTrace: updatedHand,
        timestamp: Date.now(),
      }));
    } catch (e) {}

    try {
      const res = await fetch(`/api/rooms/${roomCode}/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: user.id,
          participantId: user.id,
          draft: {
            mcqAnswers: updatedMcq,
            handTrace: updatedHand,
          },
        }),
      });

      if (res.ok) {
        setSyncState('saved');
        setLastSyncedAt(new Date().toISOString());
      } else {
        setSyncState('offline');
      }
    } catch (err) {
      setSyncState('offline');
    }
  };

  const handleMcqSelect = (qId: string, optId: string) => {
    if (isSubmitted) return;
    const nextAnswers = { ...mcqAnswers, [qId]: optId };
    setMcqAnswers(nextAnswers);
    triggerAutoSave(nextAnswers, handTraceData);
  };

  const handleHandTraceChange = (newHandData: HandTraceData) => {
    if (isSubmitted) return;
    setHandTraceData(newHandData);
    triggerAutoSave(mcqAnswers, newHandData);
  };

  const handleSubmitOfficial = async () => {
    if (!user || isSubmitted) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/rooms/${roomCode}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: user.id,
          participantId: user.id,
          mcqAnswers,
          handTrace: handTraceData,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsSubmitted(true);
        setShowSubmitModal(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveReflection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reflectionText.trim() || !user || !room) return;

    try {
      const res = await fetch(`/api/rooms/${roomCode}/reflection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: user.id,
          studentName: user.name,
          content: reflectionText.trim(),
        }),
      });

      if (res.ok) {
        setReflectionSaved(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const avInfo = getAvatarInfo(avatar);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-16">
      <Header currentUser={user} roomCode={roomCode} />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-6 w-full space-y-6">
        {/* Thanh trạng thái cá nhân học sinh và kết nối mạng */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-3xl leading-none">{avInfo.emoji}</span>
            <div>
              <span className="font-extrabold text-sm sm:text-base text-slate-800 block">
                {user?.name || 'Học sinh'}
              </span>
              <span className="text-[11px] text-teal-600 font-semibold block">
                Bài làm cá nhân • Phòng {roomCode}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ConnectionStatus status={syncState} lastSyncedAt={lastSyncedAt} />
          </div>
        </div>

        {/* Màn hình tra cứu mã C++ chuẩn */}
        <CppCodeViewer defaultOpen={false} />

        {/* CHẶNG 1: MỞ KHÓA KIẾN THỨC (5 CÂU TRẮC NGHIỆM) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-teal-600 block">
                Chặng 1 • Thang điểm 5.0
              </span>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-teal-500" />
                Mở khóa kiến thức (5 câu trắc nghiệm)
              </h2>
            </div>
            <span className="text-xs text-slate-500 font-semibold">
              Đã trả lời: {Object.keys(mcqAnswers).length} / {questions.length} câu
            </span>
          </div>

          <div className="space-y-6">
            {questions.map((q, qIdx) => (
              <div key={q.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-start gap-2">
                  <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-800 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {qIdx + 1}
                  </span>
                  <div>
                    <h3 className="font-bold text-sm text-slate-800 leading-snug">{q.title}</h3>
                    <p className="text-xs text-slate-600 whitespace-pre-line mt-1">{q.content}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 pl-8">
                  {q.options.map((opt: any) => {
                    const isSelected = mcqAnswers[q.id] === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={isSubmitted}
                        onClick={() => handleMcqSelect(q.id, opt.id)}
                        className={`text-left p-3 rounded-xl border text-xs transition-all ${
                          isSelected
                            ? 'bg-sky-600 text-white border-sky-600 font-semibold shadow-sm'
                            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                        } ${isSubmitted ? 'cursor-default opacity-85' : 'cursor-pointer'}`}
                      >
                        {opt.text}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CHẶNG 2: THU HẸP VÙNG TÌM (BÀI CHẠY TAY) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="border-b border-slate-100 pb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-sky-600 block">
                Chặng 2 • Thang điểm 5.0
              </span>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-sky-600" />
                Thu hẹp vùng tìm (Mô phỏng Tìm kiếm nhị phân)
              </h2>
            </div>

            {/* Toggle chế độ A (Nhập bước) và B (Văn bản) */}
            <div className="flex rounded-lg bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setHandMode('step')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  handMode === 'step'
                    ? 'bg-white text-sky-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Chế độ A: Nhập theo bước
              </button>
              <button
                type="button"
                onClick={() => setHandMode('text')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  handMode === 'text'
                    ? 'bg-white text-sky-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Chế độ B: Nhật kí văn bản
              </button>
            </div>
          </div>

          {handMode === 'step' ? (
            <HandTraceStepView
              data={handTraceData}
              onChange={handleHandTraceChange}
              disabled={isSubmitted}
            />
          ) : (
            <HandTraceTextView
              data={handTraceData}
              onApplyParsed={handleHandTraceChange}
              disabled={isSubmitted}
            />
          )}
        </div>

        {/* Nút nộp bài chính thức */}
        {!isSubmitted ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-md text-center space-y-3">
            <h3 className="font-bold text-slate-800 text-sm">
              Hoàn thành và Nộp bài thi cá nhân
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Sau khi bấm nộp bài, câu trả lời của em sẽ được lưu chính thức trên hệ thống và chuyển sang giai đoạn chấm điểm.
            </p>

            <button
              type="button"
              onClick={() => setShowSubmitModal(true)}
              className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-600/20 inline-flex items-center gap-2 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              Nộp bài thi của em
            </button>
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-6 text-center space-y-4 shadow-xs">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <div>
              <h3 className="font-black text-emerald-950 text-base">
                Em đã nộp bài thành công!
              </h3>
              <p className="text-xs text-emerald-800 max-w-md mx-auto mt-1">
                Bài thi cá nhân của em đã được lưu an toàn. Vui lòng quan sát màn hình máy chiếu hoặc chờ Thầy/Cô công bố đáp án và biểu điểm chi tiết.
              </p>
            </div>

            {room?.status === 'published' && (
              <button
                onClick={() => router.push(`/student/room/${roomCode}/result`)}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md inline-flex items-center gap-1.5 transition-colors"
              >
                <Award className="w-4 h-4" />
                Xem kết quả & Biểu điểm chi tiết
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* CHẶNG 3: GHI CHÚ SUY NGẪM CÁ NHÂN */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
            <MessageSquare className="w-4 h-4 text-sky-600" />
            <span>Chặng 3: Suy ngẫm cá nhân (Nhật ký học tập)</span>
          </div>

          <form onSubmit={handleSaveReflection} className="space-y-3">
            <div>
              <label className="block text-xs text-slate-600 mb-1.5">
                "Một điều em đã hiểu rõ hơn hoặc một lỗi em đã sửa qua hoạt động này":
              </label>
              <textarea
                value={reflectionText}
                onChange={(e) => setReflectionText(e.target.value)}
                disabled={reflectionSaved}
                rows={3}
                placeholder="VD: Em đã hiểu rõ vì sao mid = left + (right - left) / 2 tránh tràn số và nhận ra chỉ số mảng bắt đầu từ 0..."
                className="w-full p-3 text-xs border rounded-xl border-slate-300 focus:ring-2 focus:ring-sky-500 bg-white leading-relaxed resize-none"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                *Ghi chú của em giúp Thầy/Cô theo dõi mức độ tiếp thu bài học.
              </span>
              <button
                type="submit"
                disabled={reflectionSaved || !reflectionText.trim()}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
              >
                {reflectionSaved ? 'Đã gửi ghi chú' : 'Gửi ghi chú riêng'}
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Modal xác nhận nộp bài */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
            <h3 className="text-lg font-bold text-slate-800">
              Xác nhận nộp bài thi cá nhân?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Các câu trả lời của em sẽ được gửi lên máy chủ để chấm điểm. Em có chắc chắn muốn nộp bài bây giờ không?
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Quay lại sửa
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmitOfficial}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
              >
                {submitting ? 'Đang nộp...' : 'Nộp bài'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
