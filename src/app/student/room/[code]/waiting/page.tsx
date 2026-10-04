'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { getAvatarInfo } from '@/components/AvatarPicker';
import { Room, Group, Participant } from '@/types';
import { Clock, Users, CheckCircle2, Sparkles, BookOpen, Check } from 'lucide-react';

export default function StudentWaitingRoom({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = use(params);
  const roomCode = resolvedParams.code.toUpperCase();
  const router = useRouter();

  const [currentParticipant, setCurrentParticipant] = useState<Participant | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [myGroup, setMyGroup] = useState<Group | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [togglingReady, setTogglingReady] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Kiểm tra session học sinh
    const saved = localStorage.getItem(`student_session_${roomCode}`);
    if (!saved) {
      router.push(`/join?room=${roomCode}`);
      return;
    }

    try {
      const p = JSON.parse(saved);
      setCurrentParticipant(p);
      setIsReady(p.isReady || false);
      loadRoom(p.id);
    } catch (e) {
      router.push(`/join?room=${roomCode}`);
    }

    // 2. Kết nối Realtime SSE
    const eventSource = new EventSource(`/api/rooms/${roomCode}/events`);
    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'room_updated' && payload.data?.status === 'running') {
          router.push(`/student/room/${roomCode}/play`);
        } else {
          const pSaved = localStorage.getItem(`student_session_${roomCode}`);
          if (pSaved) {
            loadRoom(JSON.parse(pSaved).id);
          }
        }
      } catch (e) {}
    };

    const interval = setInterval(() => {
      const pSaved = localStorage.getItem(`student_session_${roomCode}`);
      if (pSaved) {
        loadRoom(JSON.parse(pSaved).id);
      }
    }, 2500);

    return () => {
      eventSource.close();
      clearInterval(interval);
    };
  }, [roomCode]);

  const loadRoom = async (participantId: string) => {
    try {
      const res = await fetch(`/api/rooms/${roomCode}?studentId=${participantId}`);
      const data = await res.json();
      if (!res.ok) return;

      if (data.room) {
        setRoom(data.room);
        if (data.room.status === 'running') {
          router.push(`/student/room/${roomCode}/play`);
          return;
        }

        const parts: Participant[] = data.participants || [];
        setParticipants(parts);

        // Cập nhật lại bản thân nếu giáo viên đổi tên hoặc chuyển nhóm
        const myLatest = parts.find(p => p.id === participantId);
        if (myLatest) {
          setCurrentParticipant(myLatest);
          setIsReady(myLatest.isReady);
          localStorage.setItem(`student_session_${roomCode}`, JSON.stringify(myLatest));
        }

        const grp = data.groups?.find((g: any) => g.id === myLatest?.groupId || g.studentIds?.includes(participantId));
        setMyGroup(grp || null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleReady = async () => {
    if (!currentParticipant || togglingReady) return;
    const nextState = !isReady;
    setIsReady(nextState);
    setTogglingReady(true);

    try {
      const res = await fetch(`/api/rooms/${roomCode}/ready`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantId: currentParticipant.id,
          isReady: nextState,
        }),
      });

      if (res.ok) {
        const updated = { ...currentParticipant, isReady: nextState };
        setCurrentParticipant(updated);
        localStorage.setItem(`student_session_${roomCode}`, JSON.stringify(updated));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTogglingReady(false);
    }
  };

  const myAvatarInfo = getAvatarInfo(currentParticipant?.avatar);
  const readyCount = participants.filter(p => p.isReady).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-16">
      <Header roomCode={roomCode} />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-6 w-full space-y-6">
        {/* Banner Chào mừng cá nhân của học sinh */}
        <div className="bg-gradient-to-r from-teal-600 to-sky-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl text-center space-y-4 relative overflow-hidden">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            {room?.name || 'Thử thách Tìm kiếm - Tin học 11'}
          </div>

          <div className="flex flex-col items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur border-4 border-white flex items-center justify-center text-5xl shadow-lg mb-2 relative">
              {myAvatarInfo.emoji}
              {isReady && (
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white shadow">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Chào {currentParticipant?.nickname || 'bạn'}!
            </h1>
            <p className="text-xs sm:text-sm text-teal-100 mt-1">
              Nhóm: <strong>{myGroup?.name || 'Đang xếp nhóm'}</strong> • Bạn đã vào phòng! Chờ giáo viên bắt đầu nhé.
            </p>
          </div>

          {/* Nút bấm Sẵn sàng to rõ cho điện thoại */}
          <div className="pt-2 flex justify-center">
            <button
              onClick={handleToggleReady}
              disabled={togglingReady}
              className={`px-8 py-3 rounded-2xl font-black text-sm flex items-center gap-2 transition-all shadow-lg cursor-pointer transform active:scale-95 ${
                isReady
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/30 ring-4 ring-emerald-300/40'
                  : 'bg-white hover:bg-slate-100 text-teal-900 shadow-black/10'
              }`}
            >
              {isReady ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-white" />
                  Đã sẵn sàng! (Bấm để hủy)
                </>
              ) : (
                <>
                  <span>👉 Bấm nút "Sẵn sàng"</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Danh sách người tham gia thời gian thực */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-teal-600" />
                Người chơi đang có mặt ({participants.length} bạn)
              </h2>
              <span className="text-xs text-slate-500">
                {readyCount} bạn đã nhấn Sẵn sàng
              </span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">
              <Clock className="w-3.5 h-3.5 text-amber-500 animate-spin" />
              Chờ giáo viên bấm Bắt đầu
            </div>
          </div>

          {participants.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              Đang chờ các bạn khác vào phòng...
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {participants.map((p) => {
                const av = getAvatarInfo(p.avatar);
                const isMe = p.id === currentParticipant?.id;
                const pGroup = room ? myGroup : null;

                return (
                  <div
                    key={p.id}
                    className={`p-3 rounded-2xl border-2 flex items-center gap-2.5 transition-all ${
                      isMe
                        ? 'border-teal-400 bg-teal-50/60 ring-2 ring-teal-200'
                        : 'border-slate-200 bg-white hover:bg-slate-50/80'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <span className="text-3xl block leading-none">{av.emoji}</span>
                      {p.isReady && (
                        <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border border-white flex items-center justify-center text-white text-[9px] font-black">
                          ✓
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-xs text-slate-800 truncate block">
                        {p.nickname} {isMe && <span className="text-[10px] text-teal-700">(Em)</span>}
                      </span>
                      <span className="text-[10px] text-slate-400 block truncate">
                        {p.isReady ? '🟢 Sẵn sàng' : '⚪ Đang chuẩn bị'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Hướng dẫn ngắn */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 text-xs text-slate-600 space-y-2">
          <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-sky-600" />
            Lưu ý khi tham gia:
          </h3>
          <p>• Khi Thầy/Cô bấm <strong>"Bắt đầu làm bài"</strong> trên máy chủ, màn hình điện thoại của em sẽ tự động chuyển sang câu hỏi trắc nghiệm và bài chạy tay.</p>
          <p>• Nếu vô tình bị tải lại trang hoặc mất mạng trong tích tắc, đừng lo: thiết bị sẽ tự động giữ nguyên bài làm và đưa em trở lại phòng!</p>
        </div>
      </main>
    </div>
  );
}
