'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import QRCodeCard from '@/components/QRCodeCard';
import RoleBadge from '@/components/RoleBadge';
import RubricScoreBreakdown from '@/components/RubricScoreBreakdown';
import { Room, Group, User, GroupSubmission, TeacherAdjustment } from '@/types';
import {
  Play,
  Pause,
  StopCircle,
  Share2,
  Lock,
  Unlock,
  RotateCcw,
  Clock,
  Download,
  Eye,
  Tv,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Award,
  BookOpen,
} from 'lucide-react';

export default function TeacherRoomMonitor({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = use(params);
  const roomCode = resolvedParams.code.toUpperCase();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [reflections, setReflections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal xem và duyệt bài nhóm
  const [selectedGroupToReview, setSelectedGroupToReview] = useState<any | null>(null);
  const [reviewAdjustmentPts, setReviewAdjustmentPts] = useState(0.5);
  const [reviewReason, setReviewReason] = useState('Giải thích đúng cơ sở dãy tăng dần và loại nửa trái.');
  const [reviewing, setReviewing] = useState(false);

  // Modal chuyển quyền điều khiển
  const [switchingGroup, setSwitchingGroup] = useState<any | null>(null);

  // Hiển thị card QR
  const [showQrModal, setShowQrModal] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('app_user');
    if (!saved) {
      router.push('/login?role=teacher');
      return;
    }
    const u = JSON.parse(saved);
    if (u.role !== 'teacher') {
      router.push('/login?role=teacher');
      return;
    }
    setUser(u);
    loadRoomData(u.id);

    // Kết nối Realtime qua SSE (Server-Sent Events)
    const eventSource = new EventSource(`/api/rooms/${roomCode}/events`);
    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'connected') return;
        // Tải lại dữ liệu phòng tức thì
        loadRoomData(u.id);
      } catch (err) {
        console.error('Lỗi parse SSE:', err);
      }
    };

    // Định kỳ fallback kiểm tra 3 giây một lần
    const timer = setInterval(() => {
      loadRoomData(u.id);
    }, 3000);

    return () => {
      eventSource.close();
      clearInterval(timer);
    };
  }, [roomCode]);

  const loadRoomData = async (teacherId: string) => {
    try {
      const res = await fetch(`/api/rooms/${roomCode}?teacherId=${teacherId}`);
      const data = await res.json();
      if (data.room) {
        setRoom(data.room);
        setGroups(data.groups || []);
        setQuestions(data.questions || []);
        setLeaderboard(data.leaderboard || []);
      }

      // Tải phản ánh cá nhân
      const refRes = await fetch(`/api/rooms/${roomCode}/reflection`);
      const refData = await refRes.json();
      if (refData.reflections) {
        setReflections(refData.reflections);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleControl = async (action: string, extraSeconds?: number) => {
    if (!user || !room) return;
    try {
      const res = await fetch(`/api/rooms/${roomCode}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: user.id,
          action,
          extraSeconds,
        }),
      });
      const data = await res.json();
      if (data.room) {
        setRoom(data.room);
        loadRoomData(user.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSwitchDriver = async (groupId: string, newDriverId: string) => {
    if (!user) return;
    try {
      await fetch(`/api/rooms/${roomCode}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: user.id,
          action: 'change_driver',
          groupId,
          driverStudentId: newDriverId,
        }),
      });
      setSwitchingGroup(null);
      loadRoomData(user.id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdjustExplanationScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedGroupToReview) return;

    setReviewing(true);
    try {
      const res = await fetch(`/api/rooms/${roomCode}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: user.id,
          groupId: selectedGroupToReview.id,
          criterion: 'explanation',
          originalPts: 0,
          adjustedPts: reviewAdjustmentPts,
          reason: reviewReason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedGroupToReview(null);
        loadRoomData(user.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setReviewing(false);
    }
  };

  // Thống kê tỉ lệ sai
  const totalSubmissions = groups.filter(g => g.submission).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header currentUser={user} roomCode={roomCode} />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full space-y-6">
        {/* Top Control Bar: Thông tin phòng & Bộ nút điều khiển nhanh */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black font-mono tracking-widest text-sky-800 bg-sky-50 px-3 py-1 rounded-xl border border-sky-200">
                {roomCode}
              </span>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900">
                {room?.name}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-700">
                Trạng thái:{' '}
                <strong className="text-sky-700 uppercase">{room?.status}</strong>
              </span>
              <span>•</span>
              <span>Tổng nhóm: <strong>{groups.length} nhóm</strong></span>
              <span>•</span>
              <span>Đã nộp bài: <strong>{totalSubmissions} / {groups.length}</strong></span>
              {room?.isLocked && (
                <span className="text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  🔒 Đã khóa tham gia mới
                </span>
              )}
            </div>
          </div>

          {/* Cụm nút thao tác của Giáo viên */}
          <div className="flex flex-wrap items-center gap-2">
            {room?.status === 'waiting' && (
              <button
                onClick={() => handleControl('start')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-colors"
              >
                <Play className="w-4 h-4" />
                Bắt đầu làm bài
              </button>
            )}

            {room?.status === 'running' && (
              <>
                <button
                  onClick={() => handleControl('pause')}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center gap-1.5"
                >
                  <Pause className="w-4 h-4" />
                  Tạm dừng
                </button>
                <button
                  onClick={() => handleControl('extend_time', 180)}
                  className="px-3.5 py-2 bg-sky-100 hover:bg-sky-200 text-sky-800 font-semibold text-xs rounded-xl border border-sky-200 flex items-center gap-1.5"
                >
                  <Clock className="w-4 h-4 text-sky-600" />
                  +3 Phút
                </button>
                <button
                  onClick={() => handleControl('close')}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center gap-1.5"
                >
                  <StopCircle className="w-4 h-4" />
                  Đóng lượt làm
                </button>
              </>
            )}

            {room?.status === 'paused' && (
              <button
                onClick={() => handleControl('resume')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5"
              >
                <Play className="w-4 h-4" />
                Tiếp tục bài làm
              </button>
            )}

            {room?.status === 'closed' && (
              <button
                onClick={() => handleControl('publish')}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5"
              >
                <Award className="w-4 h-4" />
                Công bố đáp án & Điểm
              </button>
            )}

            {room?.status === 'published' && !room?.isRevisionOpen && (
              <button
                onClick={() => handleControl('open_revision')}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                Mở 1 lượt sửa sai
              </button>
            )}

            <button
              onClick={() => handleControl('toggle_lock')}
              className={`p-2 rounded-xl border text-xs font-semibold ${
                room?.isLocked
                  ? 'bg-rose-50 text-rose-700 border-rose-300'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
              title={room?.isLocked ? 'Mở khóa tham gia' : 'Khóa không cho thêm học sinh mới'}
            >
              {room?.isLocked ? <Lock className="w-4 h-4 text-rose-600" /> : <Unlock className="w-4 h-4 text-slate-600" />}
            </button>

            <button
              onClick={() => setShowQrModal(true)}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 flex items-center gap-1.5"
            >
              <Share2 className="w-4 h-4 text-sky-600" />
              Mã QR
            </button>

            <button
              onClick={() => router.push(`/teacher/room/${roomCode}/projector`)}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-sm flex items-center gap-1.5"
            >
              <Tv className="w-4 h-4 text-sky-400" />
              Chiếu Máy chiếu
            </button>

            <a
              href={`/api/rooms/${roomCode}/export-csv`}
              download
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs rounded-xl border border-emerald-200 flex items-center gap-1.5"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              Xuất Excel (CSV)
            </a>
          </div>
        </div>

        {/* Giám sát trực tiếp các nhóm */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-sky-600" />
              Giám sát trực tiếp các nhóm ({groups.length} nhóm)
            </h2>
            <span className="text-xs text-slate-500">
              Cập nhật thời gian thực qua Server-Sent Events
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {groups.map((group) => {
              const driver = group.members.find((m: any) => m.id === group.driverStudentId);
              const sub: GroupSubmission = group.submission;
              const draft = group.draft;
              const isSubmitted = !!sub?.submittedAt;
              const score = sub?.score;

              return (
                <div
                  key={group.id}
                  className={`bg-white rounded-2xl border p-5 shadow-sm transition-all flex flex-col justify-between ${
                    isSubmitted ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-slate-200'
                  }`}
                >
                  <div>
                    {/* Header nhóm */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                      <div>
                        <h3 className="font-extrabold text-base text-slate-800">{group.name}</h3>
                        <span className="text-[11px] text-slate-400">
                          Kết nối gần nhất: {group.lastSyncedAt ? new Date(group.lastSyncedAt).toLocaleTimeString('vi-VN') : 'Mới vào'}
                        </span>
                      </div>

                      {isSubmitted ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Đã nộp bài
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          Đang làm bài
                        </span>
                      )}
                    </div>

                    {/* Người điều khiển hiện tại */}
                    <div className="mb-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs flex items-center justify-between">
                      <div>
                        <span className="text-[11px] text-slate-500 block">Người điều khiển (Driver):</span>
                        <strong className="text-slate-800">{driver?.name || 'Chưa chọn'}</strong>
                      </div>
                      <button
                        onClick={() => setSwitchingGroup(group)}
                        className="text-[11px] text-sky-600 hover:text-sky-800 font-semibold underline"
                      >
                        Đổi người
                      </button>
                    </div>

                    {/* Tiến độ câu làm */}
                    <div className="mb-3 space-y-1.5 text-xs text-slate-600">
                      <div className="flex justify-between">
                        <span>Tiến độ nháp:</span>
                        <strong className="text-slate-800">
                          {Object.keys(draft?.mcqAnswers || {}).length} / 5 câu trắc nghiệm
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Chạy tay:</span>
                        <strong className="text-slate-800">
                          {draft?.handTrace?.steps?.filter((s: any) => s.action).length || 0} / 3 bước ghi nhận
                        </strong>
                      </div>
                    </div>

                    {/* Điểm và trạng thái duyệt */}
                    {score && (
                      <div className="mt-3 p-3 rounded-xl bg-sky-50 border border-sky-200 text-xs space-y-1">
                        <div className="flex justify-between font-bold text-sky-950">
                          <span>Điểm Rubric:</span>
                          <span className="text-base text-sky-800 font-extrabold">{score.totalScore.toFixed(2)} / 10đ</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-sky-700">
                          <span>Trắc nghiệm: {score.mcqScore.toFixed(2)}đ</span>
                          <span>Chạy tay: {score.handScore.toFixed(2)}đ</span>
                        </div>
                        {score.pendingReviewScore > 0 && (
                          <div className="pt-1 border-t border-sky-200 text-[11px] text-amber-800 font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Còn 0.50đ giải thích chờ duyệt!
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Nút xem chi tiết & duyệt */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex gap-2">
                    {isSubmitted ? (
                      <button
                        onClick={() => setSelectedGroupToReview(group)}
                        className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Xem bài nộp & Duyệt điểm
                      </button>
                    ) : (
                      <span className="w-full py-2 text-center text-xs text-slate-400 italic">
                        Chờ nhóm nộp bài...
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bảng tổng hợp phản ánh cá nhân cuối tiết */}
        {reflections.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h2 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-teal-600" />
              Ghi chú cá nhân học sinh: "Một điều em đã hiểu rõ hơn hoặc lỗi em đã sửa" ({reflections.length})
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {reflections.map((rf) => (
                <div key={rf.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div className="flex items-center justify-between mb-1 font-bold text-slate-800">
                    <span>{rf.studentName}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(rf.submittedAt).toLocaleTimeString('vi-VN')}
                    </span>
                  </div>
                  <p className="text-slate-600 italic">"{rf.content}"</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Modal QR Code */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full relative">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 text-lg font-bold"
            >
              ✕
            </button>
            <QRCodeCard roomCode={roomCode} />
          </div>
        </div>
      )}

      {/* Modal Chuyển quyền điều khiển */}
      {switchingGroup && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-base font-bold text-slate-800 mb-2">
              Chuyển người điều khiển ({switchingGroup.name})
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Chọn bạn thành viên sẽ đảm nhận quyền thao tác và lưu bài:
            </p>

            <div className="space-y-2 mb-4">
              {switchingGroup.members.map((member: any) => {
                const isCurrent = member.id === switchingGroup.driverStudentId;
                return (
                  <button
                    key={member.id}
                    onClick={() => handleSwitchDriver(switchingGroup.id, member.id)}
                    className={`w-full p-3 rounded-xl border text-xs flex items-center justify-between transition-colors ${
                      isCurrent
                        ? 'bg-amber-50 border-amber-300 font-bold text-amber-900'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <span>{member.name}</span>
                    {isCurrent ? <span>(Đang điều khiển)</span> : <span>Chuyển cho bạn này</span>}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setSwitchingGroup(null)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* Modal Xem chi tiết bài nộp & Duyệt điểm giải thích */}
      {selectedGroupToReview && selectedGroupToReview.submission?.score && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Bài làm của {selectedGroupToReview.name}
                </h3>
                <span className="text-xs text-slate-500">
                  Nộp lúc: {new Date(selectedGroupToReview.submission.submittedAt).toLocaleTimeString('vi-VN')}
                </span>
              </div>
              <button
                onClick={() => setSelectedGroupToReview(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {/* Chi tiết rubric */}
            <RubricScoreBreakdown score={selectedGroupToReview.submission.score} />

            {/* Khung duyệt điểm giải thích của Giáo viên */}
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 space-y-3">
              <h4 className="font-bold text-amber-950 text-sm flex items-center gap-2">
                ✏️ Duyệt & Điều chỉnh điểm giải thích (Tối đa 0.50 đ)
              </h4>

              <div className="text-xs bg-white p-3 rounded-lg border border-amber-200">
                <span className="font-semibold text-slate-700 block mb-1">Học sinh đã viết:</span>
                <p className="italic text-slate-800 font-medium">
                  "{selectedGroupToReview.submission.handTrace?.eliminationExplanation || '(Không ghi giải thích)'}"
                </p>
              </div>

              <form onSubmit={handleAdjustExplanationScore} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-amber-950 mb-1">
                      Mức điểm điều chỉnh:
                    </label>
                    <select
                      value={reviewAdjustmentPts}
                      onChange={(e) => setReviewAdjustmentPts(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm border rounded-xl bg-white"
                    >
                      <option value={0.5}>+0.50 đ (Chấp nhận toàn bộ)</option>
                      <option value={0.25}>+0.25 đ (Đúng một phần)</option>
                      <option value={0.0}>0.00 đ (Chưa đạt)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-amber-950 mb-1">
                      Lý do điều chỉnh (Bắt buộc theo chuẩn sư phạm):
                    </label>
                    <input
                      type="text"
                      value={reviewReason}
                      onChange={(e) => setReviewReason(e.target.value)}
                      required
                      placeholder="Ghi lý do cho điểm..."
                      className="w-full px-3 py-2 text-sm border rounded-xl bg-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={reviewing}
                    className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
                  >
                    {reviewing ? 'Đang lưu...' : 'Lưu điểm duyệt vào bài thi'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
