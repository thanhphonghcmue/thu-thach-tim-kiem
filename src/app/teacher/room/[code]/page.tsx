'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import QRCodeCard from '@/components/QRCodeCard';
import RubricScoreBreakdown from '@/components/RubricScoreBreakdown';
import { getAvatarInfo } from '@/components/AvatarPicker';
import { Room, User, StudentSubmission, Participant, LeaderboardEntry } from '@/types';
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
  Award,
  BookOpen,
  Edit2,
  Trash2,
  Users,
  Check,
} from 'lucide-react';

export default function TeacherRoomMonitor({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = use(params);
  const roomCode = resolvedParams.code.toUpperCase();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal QR
  const [showQrModal, setShowQrModal] = useState(false);

  // Modal xem chi tiết & duyệt điểm học sinh
  const [selectedStudentToReview, setSelectedStudentToReview] = useState<any | null>(null);
  const [reviewAdjustmentPts, setReviewAdjustmentPts] = useState(0.5);
  const [reviewReason, setReviewReason] = useState('Giải thích đúng bản chất dãy tăng dần');
  const [reviewing, setReviewing] = useState(false);

  // Modal đổi tên học sinh
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [newParticipantName, setNewParticipantName] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('app_user');
    if (!saved) {
      router.push('/login?role=teacher');
      return;
    }

    try {
      const u = JSON.parse(saved);
      if (u.role !== 'teacher') {
        router.push('/login?role=teacher');
        return;
      }
      setUser(u);
      loadData(u.id);
    } catch (e) {
      router.push('/login?role=teacher');
    }

    // Kết nối Realtime SSE
    const eventSource = new EventSource(`/api/rooms/${roomCode}/events`);
    eventSource.onmessage = (event) => {
      try {
        const uSaved = localStorage.getItem('app_user');
        if (uSaved) {
          loadData(JSON.parse(uSaved).id);
        }
      } catch (err) {}
    };

    const interval = setInterval(() => {
      const uSaved = localStorage.getItem('app_user');
      if (uSaved) {
        loadData(JSON.parse(uSaved).id);
      }
    }, 4000);

    return () => {
      eventSource.close();
      clearInterval(interval);
    };
  }, [roomCode]);

  const loadData = async (teacherId: string) => {
    try {
      const res = await fetch(`/api/rooms/${roomCode}?teacherId=${teacherId}`);
      const data = await res.json();
      if (!res.ok) return;

      if (data.room) {
        setRoom(data.room);
        setParticipants(data.participants || []);
        setLeaderboard(data.leaderboard || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleControl = async (action: 'start' | 'pause' | 'resume' | 'close' | 'publish' | 'open_revision' | 'toggle_lock') => {
    if (!user || !room) return;

    try {
      const res = await fetch(`/api/rooms/${roomCode}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: user.id,
          action,
        }),
      });

      const data = await res.json();
      if (res.ok && data.room) {
        setRoom(data.room);
        loadData(user.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdjustExplanationScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedStudentToReview) return;

    setReviewing(true);
    try {
      const res = await fetch(`/api/rooms/${roomCode}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: user.id,
          participantId: selectedStudentToReview.id,
          criterion: 'explanation',
          originalPts: 0,
          adjustedPts: reviewAdjustmentPts,
          reason: reviewReason,
        }),
      });

      if (res.ok) {
        setSelectedStudentToReview(null);
        loadData(user.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setReviewing(false);
    }
  };

  const handleManageParticipant = async (participantId: string, action: 'rename' | 'kick', payload?: any) => {
    if (!user) return;
    try {
      await fetch(`/api/rooms/${roomCode}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: user.id,
          participantId,
          action,
          payload,
        }),
      });
      loadData(user.id);
    } catch (err) {
      console.error(err);
    }
  };

  const submittedCount = participants.filter(p => p.submission?.submittedAt).length;
  const readyCount = participants.filter(p => p.isReady).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-16">
      <Header currentUser={user} roomCode={roomCode} />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full space-y-6">
        {/* Thanh điều khiển phòng */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-600">
                Phòng thi: {roomCode}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                room?.status === 'running' ? 'bg-emerald-100 text-emerald-800' :
                room?.status === 'waiting' ? 'bg-amber-100 text-amber-800' :
                room?.status === 'paused' ? 'bg-rose-100 text-rose-800' :
                room?.status === 'published' ? 'bg-purple-100 text-purple-800' :
                'bg-slate-100 text-slate-800'
              }`}>
                {room?.status === 'waiting' && '🟢 Phòng chờ'}
                {room?.status === 'running' && '⚡ Đang làm bài'}
                {room?.status === 'paused' && '⏸️ Tạm dừng'}
                {room?.status === 'closed' && '🔒 Đã kết thúc'}
                {room?.status === 'published' && '🏆 Đã công bố điểm'}
              </span>
              {room?.isLocked && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  Đã khóa người mới
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              {room?.name}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Thời lượng quy định: {room?.timeLimitMinutes} phút • Sĩ số: <strong>{participants.length}</strong> học sinh ({readyCount} sẵn sàng, {submittedCount} đã nộp bài)
            </p>
          </div>

          {/* Các nút bấm quyền giáo viên */}
          <div className="flex flex-wrap items-center gap-2">
            {room?.status === 'waiting' && (
              <button
                onClick={() => handleControl('start')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                Bắt đầu làm bài
              </button>
            )}

            {room?.status === 'running' && (
              <>
                <button
                  onClick={() => handleControl('pause')}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Pause className="w-4 h-4" />
                  Tạm dừng
                </button>
                <button
                  onClick={() => handleControl('close')}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <StopCircle className="w-4 h-4" />
                  Kết thúc lượt làm
                </button>
              </>
            )}

            {room?.status === 'paused' && (
              <button
                onClick={() => handleControl('resume')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Play className="w-4 h-4" />
                Tiếp tục bài làm
              </button>
            )}

            {room?.status === 'closed' && (
              <button
                onClick={() => handleControl('publish')}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Award className="w-4 h-4" />
                Công bố đáp án & Điểm
              </button>
            )}

            {room?.status === 'published' && !room?.isRevisionOpen && (
              <button
                onClick={() => handleControl('open_revision')}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Mở 1 lượt sửa sai
              </button>
            )}

            <button
              onClick={() => handleControl('toggle_lock')}
              className={`p-2 rounded-xl border text-xs font-semibold cursor-pointer ${
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
              className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 flex items-center gap-1.5 cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-sky-600" />
              Mã QR
            </button>

            <button
              onClick={() => router.push(`/teacher/room/${roomCode}/projector`)}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Tv className="w-4 h-4 text-sky-400" />
              Chiếu Máy chiếu
            </button>

            <a
              href={`/api/rooms/${roomCode}/export-csv`}
              download
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs rounded-xl border border-emerald-200 flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              Xuất Excel (CSV)
            </a>
          </div>
        </div>

        {/* Giám sát trực tiếp từng cá nhân học sinh */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-600" />
              Giám sát từng học sinh ({participants.length} bạn có mặt)
            </h2>
            <span className="text-xs text-slate-500">
              Cập nhật thời gian thực (SSE) • Bằng điểm đồng hạng
            </span>
          </div>

          {participants.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
              Chưa có học sinh nào vào phòng. Hãy chia sẻ mã phòng hoặc chiếu QR để các em quét tham gia!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {participants.map((p) => {
                const av = getAvatarInfo(p.avatar);
                const sub: StudentSubmission = p.submission;
                const draft = p.draft;
                const isSubmitted = !!sub?.submittedAt;
                const score = sub?.score;

                return (
                  <div
                    key={p.id}
                    className={`bg-white rounded-2xl border p-4 shadow-xs transition-all flex flex-col justify-between ${
                      isSubmitted ? 'border-emerald-300 ring-1 ring-emerald-200 bg-emerald-50/20' : 'border-slate-200'
                    }`}
                  >
                    <div>
                      {/* Header học sinh */}
                      <div className="flex items-start justify-between pb-2.5 border-b border-slate-100 mb-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-3xl leading-none shrink-0">{av.emoji}</span>
                          <div className="min-w-0">
                            <h3 className="font-extrabold text-sm text-slate-800 truncate" title={p.nickname}>
                              {p.nickname}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {p.isReady ? (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                  <Check className="w-3 h-3" /> Sẵn sàng
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400">
                                  Chưa sẵn sàng
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Thao tác nhanh: Đổi tên / Loại */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => {
                              setEditingParticipant(p);
                              setNewParticipantName(p.nickname);
                            }}
                            className="p-1 text-slate-400 hover:text-sky-600 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Đổi tên"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Bạn có chắc muốn loại ${p.nickname} khỏi phòng?`)) {
                                handleManageParticipant(p.id, 'kick');
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Loại khỏi phòng"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Trạng thái làm bài */}
                      <div className="mb-2.5">
                        {isSubmitted ? (
                          <div className="flex items-center justify-between text-xs font-bold text-emerald-800 bg-emerald-100/60 px-2.5 py-1 rounded-lg">
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Đã nộp bài
                            </span>
                            <span className="text-[10px] text-emerald-600 font-normal">
                              {new Date(sub.submittedAt).toLocaleTimeString('vi-VN')}
                            </span>
                          </div>
                        ) : (
                          <div className="space-y-1 text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg">
                            <div className="flex justify-between">
                              <span>Trắc nghiệm:</span>
                              <strong>{Object.keys(draft?.mcqAnswers || {}).length} / 5 câu</strong>
                            </div>
                            <div className="flex justify-between">
                              <span>Chạy tay:</span>
                              <strong>{draft?.handTrace?.steps?.filter((s: any) => s.action).length || 0} / 3 bước</strong>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Điểm số và thông báo chờ duyệt */}
                      {score && (
                        <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200 text-xs space-y-1">
                          <div className="flex justify-between font-bold text-sky-950">
                            <span>Điểm Rubric:</span>
                            <span className="text-sm text-sky-800 font-black">{score.totalScore.toFixed(2)} / 10đ</span>
                          </div>
                          <div className="flex justify-between text-[11px] text-sky-700">
                            <span>TN: {score.mcqScore.toFixed(2)}đ</span>
                            <span>Chạy tay: {score.handScore.toFixed(2)}đ</span>
                          </div>
                          {score.pendingReviewScore > 0 && (
                            <div className="pt-1 border-t border-sky-200 text-[10px] text-amber-800 font-bold flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                              Có giải thích chờ duyệt (0.50đ)
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Nút xem chi tiết & duyệt */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100">
                      {isSubmitted ? (
                        <button
                          onClick={() => setSelectedStudentToReview(p)}
                          className="w-full py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Xem bài & Duyệt điểm
                        </button>
                      ) : (
                        <span className="w-full py-1.5 block text-center text-[11px] text-slate-400 italic">
                          Đang làm bài...
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bảng xếp hạng thi đua cá nhân */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                Bảng xếp hạng thi đua cá nhân
              </h2>
              <span className="text-xs text-slate-500">
                Xếp theo tổng điểm chính xác • Bằng điểm đồng hạng • Không phân bằng tốc độ
              </span>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
              {leaderboard.length} học sinh
            </span>
          </div>

          {leaderboard.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              Chưa có dữ liệu xếp hạng. Dữ liệu sẽ xuất hiện khi các em nộp bài!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b">
                  <tr>
                    <th className="py-2.5 px-3">Hạng</th>
                    <th className="py-2.5 px-3">Học sinh</th>
                    <th className="py-2.5 px-3">Trắc nghiệm (/5)</th>
                    <th className="py-2.5 px-3">Chạy tay (/5)</th>
                    <th className="py-2.5 px-3">Tổng điểm (/10)</th>
                    <th className="py-2.5 px-3">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leaderboard.map((item) => {
                    const av = getAvatarInfo(item.avatar);
                    return (
                      <tr key={item.participantId} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 font-black text-sm text-slate-800">
                          {item.rank === 1 ? '🥇 1' : item.rank === 2 ? '🥈 2' : item.rank === 3 ? '🥉 3' : item.rank}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-800 flex items-center gap-2">
                          <span className="text-xl leading-none">{av.emoji}</span>
                          <span>{item.nickname}</span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-700">
                          {item.mcqScore.toFixed(2)} đ
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-700">
                          {item.handScore.toFixed(2)} đ
                        </td>
                        <td className="py-2.5 px-3 font-black text-sm text-teal-700">
                          {item.totalScore.toFixed(2)} đ
                        </td>
                        <td className="py-2.5 px-3">
                          {item.isPendingReview ? (
                            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              Chờ duyệt giải thích
                            </span>
                          ) : item.isSubmitted ? (
                            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              Đã chấm xong
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">Chưa nộp</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modal QR Code */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-4">
            <QRCodeCard roomCode={roomCode} />
            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
            >
              Đóng cửa sổ QR
            </button>
          </div>
        </div>
      )}

      {/* Modal Xem chi tiết bài nộp & Duyệt điểm giải thích của học sinh */}
      {selectedStudentToReview && selectedStudentToReview.submission?.score && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{getAvatarInfo(selectedStudentToReview.avatar).emoji}</span>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Bài làm của {selectedStudentToReview.nickname}
                  </h3>
                  <span className="text-xs text-slate-500">
                    Nộp lúc: {new Date(selectedStudentToReview.submission.submittedAt).toLocaleTimeString('vi-VN')}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudentToReview(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Chi tiết rubric */}
            <RubricScoreBreakdown score={selectedStudentToReview.submission.score} />

            {/* Khung duyệt điểm giải thích của Giáo viên */}
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 space-y-3">
              <h4 className="font-bold text-amber-950 text-sm flex items-center gap-2">
                ✏️ Duyệt & Điều chỉnh điểm giải thích (Tối đa 0.50 đ)
              </h4>

              <div className="text-xs bg-white p-3 rounded-lg border border-amber-200">
                <span className="font-semibold text-slate-700 block mb-1">Học sinh đã viết:</span>
                <p className="italic text-slate-800 font-medium">
                  "{selectedStudentToReview.submission.handTrace?.eliminationExplanation || '(Không ghi giải thích)'}"
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
                    className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
                  >
                    {reviewing ? 'Đang lưu...' : 'Lưu điểm duyệt vào bài thi'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal đổi tên học sinh */}
      {editingParticipant && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Đổi tên / biệt danh học sinh</h3>
            <input
              type="text"
              value={newParticipantName}
              onChange={(e) => setNewParticipantName(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-xl"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditingParticipant(null)}
                className="px-3 py-1.5 text-xs text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  handleManageParticipant(editingParticipant.id, 'rename', { newName: newParticipantName });
                  setEditingParticipant(null);
                }}
                className="px-4 py-1.5 text-xs bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg cursor-pointer"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
