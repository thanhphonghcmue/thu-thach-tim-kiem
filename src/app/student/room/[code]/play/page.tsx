'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import CppCodeViewer from '@/components/CppCodeViewer';
import HandTraceStepView from '@/components/HandTraceStepView';
import HandTraceTextView from '@/components/HandTraceTextView';
import ConnectionStatus, { SyncState } from '@/components/ConnectionStatus';
import RoleBadge from '@/components/RoleBadge';
import { Room, Group, User, HandTraceData, GroupDraft } from '@/types';
import {
  ShieldCheck,
  Send,
  Users,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  BookOpen,
  MessageSquare,
} from 'lucide-react';

export default function StudentPlayArena({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = use(params);
  const roomCode = resolvedParams.code.toUpperCase();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [myGroup, setMyGroup] = useState<any | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);

  // Trạng thái bài làm của nhóm
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

  // Modal đổi người điều khiển
  const [showDriverSwapModal, setShowDriverSwapModal] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('app_user');
    if (!saved) {
      router.push(`/login?role=student&returnUrl=${encodeURIComponent(`/student/room/${roomCode}/play`)}`);
      return;
    }
    const u = JSON.parse(saved);
    setUser(u);
    loadRoomAndDraft(u.id);

    // Lắng nghe realtime SSE
    const eventSource = new EventSource(`/api/rooms/${roomCode}/events`);
    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'group_draft_updated' && payload.data.groupId === myGroup?.id) {
          // Nếu người khác lưu bản nháp, cập nhật giao diện thành viên
          if (payload.data.draft.updatedBy !== u.id) {
            setMcqAnswers(payload.data.draft.mcqAnswers || {});
            if (payload.data.draft.handTrace) {
              setHandTraceData(payload.data.draft.handTrace);
            }
            setLastSyncedAt(payload.data.draft.updatedAt);
          }
        } else if (payload.type === 'scores_published' || (payload.type === 'room_updated' && payload.data.status === 'published')) {
          router.push(`/student/room/${roomCode}/result`);
        } else if (payload.type === 'driver_changed' && payload.data.groupId === myGroup?.id) {
          loadRoomAndDraft(u.id);
        }
      } catch (err) {}
    };

    // Định kỳ đồng bộ 4 giây
    const interval = setInterval(() => {
      loadRoomAndDraft(u.id);
    }, 4000);

    return () => {
      eventSource.close();
      clearInterval(interval);
    };
  }, [roomCode, myGroup?.id]);

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

        const g = data.groups?.find((grp: any) => grp.studentIds.includes(studentId));
        if (g) {
          setMyGroup(g);
          if (g.submission?.submittedAt) {
            setIsSubmitted(true);
          }

          // Khôi phục bản nháp nếu chưa nộp
          if (!g.submission?.submittedAt && g.draft) {
            setMcqAnswers(g.draft.mcqAnswers || {});
            if (g.draft.handTrace && g.draft.handTrace.steps?.length > 0) {
              setHandTraceData(g.draft.handTrace);
            }
            setLastSyncedAt(g.draft.updatedAt);
          }
        }
      }
    } catch (err) {
      console.error(err);
      setSyncState('offline');
    }
  };

  const isDriver = myGroup && user && myGroup.driverStudentId === user.id;

  // Tự động lưu bản nháp lên máy chủ (Chỉ khi là Driver)
  const triggerAutoSave = async (updatedMcq: Record<string, string>, updatedHand: HandTraceData) => {
    if (!isDriver || !myGroup || isSubmitted) return;

    setSyncState('saving');
    // Lưu tạm vào localStorage làm bản nháp ngoại tuyến phòng khi mất mạng
    try {
      localStorage.setItem(`offline_draft_${myGroup.id}`, JSON.stringify({
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
          groupId: myGroup.id,
          studentId: user?.id,
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
    if (!isDriver || isSubmitted) return;
    const nextAnswers = { ...mcqAnswers, [qId]: optId };
    setMcqAnswers(nextAnswers);
    triggerAutoSave(nextAnswers, handTraceData);
  };

  const handleHandTraceChange = (newHandData: HandTraceData) => {
    if (!isDriver || isSubmitted) return;
    setHandTraceData(newHandData);
    triggerAutoSave(mcqAnswers, newHandData);
  };

  const handleSubmitOfficial = async () => {
    if (!isDriver || !myGroup || isSubmitted) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/rooms/${roomCode}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: myGroup.id,
          studentId: user?.id,
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
          groupId: myGroup?.id,
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

  const handleHandoverDriver = async (targetStudentId: string) => {
    if (!myGroup || !user) return;
    try {
      const res = await fetch(`/api/rooms/${roomCode}/switch-driver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: myGroup.id,
          requesterStudentId: user.id,
          newDriverStudentId: targetStudentId,
        }),
      });

      if (res.ok) {
        setShowDriverSwapModal(false);
        loadRoomAndDraft(user.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const currentDriver = myGroup?.members?.find((m: any) => m.id === myGroup.driverStudentId);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-16">
      <Header currentUser={user} roomCode={roomCode} />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-6 w-full space-y-6">
        {/* Thanh trạng thái nhóm và kết nối mạng */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="font-extrabold text-base text-slate-800">
              {myGroup?.name || 'Nhóm'}
            </span>
            <RoleBadge isDriver={isDriver} />
          </div>

          <div className="flex items-center gap-3">
            <ConnectionStatus status={syncState} lastSyncedAt={lastSyncedAt} />

            <button
              onClick={() => setShowDriverSwapModal(true)}
              className="text-xs text-sky-700 bg-sky-50 hover:bg-sky-100 px-3 py-1.5 rounded-lg border border-sky-200 font-semibold flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Đổi người thao tác
            </button>
          </div>
        </div>

        {/* Thông báo phân quyền nếu không phải là Driver */}
        {!isDriver && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Bạn <strong>{currentDriver?.name || 'thành viên khác'}</strong> đang giữ quyền điều khiển thao tác. Màn hình của em đang đồng bộ tiến độ thời gian thực.
              </span>
            </div>
            <button
              onClick={() => handleHandoverDriver(user?.id || '')}
              className="underline font-bold text-amber-800 shrink-0 hover:text-amber-950"
            >
              Nhận quyền điều khiển
            </button>
          </div>
        )}

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
                        disabled={!isDriver || isSubmitted}
                        onClick={() => handleMcqSelect(q.id, opt.id)}
                        className={`text-left p-3 rounded-xl border text-xs transition-all ${
                          isSelected
                            ? 'bg-sky-600 text-white border-sky-600 font-semibold shadow-sm'
                            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                        } ${(!isDriver || isSubmitted) ? 'cursor-default opacity-85' : 'cursor-pointer'}`}
                      >
                        {opt.text}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Lời nhắc sư phạm đổi người điều khiển */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-teal-50 to-sky-50 border border-teal-200 text-teal-950 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="font-bold text-xs block text-teal-900">
                🔄 Lời nhắc sư phạm: Chuyển sang phần Chạy tay
              </span>
              <p className="text-xs text-teal-800">
                Hãy đổi người thao tác để mọi thành viên trong nhóm đều được trực tiếp thực hành!
              </p>
            </div>
            <button
              onClick={() => setShowDriverSwapModal(true)}
              className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              Đổi người điều khiển nhóm
            </button>
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
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
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
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
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
              disabled={!isDriver || isSubmitted}
            />
          ) : (
            <HandTraceTextView
              data={handTraceData}
              onApplyParsed={handleHandTraceChange}
              disabled={!isDriver || isSubmitted}
            />
          )}
        </div>

        {/* Nút nộp bài chính thức */}
        {!isSubmitted ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-md text-center space-y-3">
            <h3 className="font-bold text-slate-800 text-sm">
              Hoàn thành và Nộp bài thi chính thức
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Chỉ Người điều khiển mới được bấm nộp. Sau khi nộp, câu trả lời sẽ được lưu chính thức trên hệ thống và chuyển sang giai đoạn chấm điểm.
            </p>

            <button
              type="button"
              disabled={!isDriver}
              onClick={() => setShowSubmitModal(true)}
              className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-600/20 inline-flex items-center gap-2 transition-all"
            >
              <Send className="w-4 h-4" />
              Nộp bài làm của nhóm
            </button>
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-6 text-center space-y-3 shadow-xs">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h3 className="font-black text-emerald-950 text-base">
              Nhóm đã nộp bài thành công!
            </h3>
            <p className="text-xs text-emerald-800 max-w-md mx-auto">
              Bài thi của nhóm đã được lưu an toàn. Vui lòng quan sát màn hình máy chiếu hoặc chờ Giáo viên công bố đáp án và biểu điểm chi tiết.
            </p>
          </div>
        )}

        {/* CHẶNG 3: GHI CHÚ SUY NGẪM CÁ NHÂN */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
            <MessageSquare className="w-4 h-4 text-sky-600" />
            <span>Chặng 3: Suy ngẫm cá nhân (Mỗi học sinh ghi riêng)</span>
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
                placeholder="VD: Em đã hiểu rõ vì sao mid = left + (right - left) / 2 tránh tràn số và nhận ra chỉ số bắt đầu từ 0..."
                className="w-full p-3 text-xs border rounded-xl border-slate-300 focus:ring-2 focus:ring-sky-500 bg-white leading-relaxed resize-none"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                *Ghi chú cá nhân không tính vào điểm nhóm, nhưng Giáo viên xem được để nhận xét.
              </span>
              <button
                type="submit"
                disabled={reflectionSaved || !reflectionText.trim()}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs"
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
              Xác nhận nộp bài chính thức?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Các câu trả lời của nhóm sẽ được khóa và gửi lên hệ thống máy chủ để chấm điểm. Hãy chắc chắn rằng cả nhóm đã thống nhất câu trả lời!
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Kiểm tra lại
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmitOfficial}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md"
              >
                {submitting ? 'Đang nộp...' : 'Đồng ý nộp bài'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal đổi người điều khiển */}
      {showDriverSwapModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-800">
              Đổi người điều khiển nhóm
            </h3>
            <p className="text-xs text-slate-500">
              Chọn thành viên sẽ nhận quyền thao tác máy:
            </p>

            <div className="space-y-2">
              {myGroup?.members?.map((m: any) => {
                const isCur = m.id === myGroup.driverStudentId;
                return (
                  <button
                    key={m.id}
                    onClick={() => handleHandoverDriver(m.id)}
                    className={`w-full p-3 rounded-xl border text-xs flex items-center justify-between ${
                      isCur
                        ? 'bg-amber-50 border-amber-300 font-bold text-amber-900'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <span>{m.name}</span>
                    {isCur ? <span>(Đang giữ quyền)</span> : <span>Chuyển cho bạn này</span>}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setShowDriverSwapModal(false)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
            >
              Hủy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
