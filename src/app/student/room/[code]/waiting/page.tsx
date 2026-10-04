'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import RoleBadge, { ROLE_INFO } from '@/components/RoleBadge';
import { Room, Group, User, SuggestedRole } from '@/types';
import { Clock, Users, ShieldCheck, BookOpen, AlertCircle, Sparkles } from 'lucide-react';

export default function StudentWaitingRoom({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = use(params);
  const roomCode = resolvedParams.code.toUpperCase();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [myGroup, setMyGroup] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('app_user');
    if (!saved) {
      router.push(`/login?role=student&returnUrl=${encodeURIComponent(`/student/room/${roomCode}/waiting`)}`);
      return;
    }
    const u = JSON.parse(saved);
    setUser(u);
    loadRoom(u.id);

    // Lắng nghe SSE
    const eventSource = new EventSource(`/api/rooms/${roomCode}/events`);
    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'room_updated' && payload.data.status === 'running') {
          router.push(`/student/room/${roomCode}/play`);
        } else {
          loadRoom(u.id);
        }
      } catch (e) {}
    };

    const interval = setInterval(() => {
      loadRoom(u.id);
    }, 2500);

    return () => {
      eventSource.close();
      clearInterval(interval);
    };
  }, [roomCode]);

  const loadRoom = async (studentId: string) => {
    try {
      const res = await fetch(`/api/rooms/${roomCode}?studentId=${studentId}`);
      const data = await res.json();
      if (data.room) {
        setRoom(data.room);
        if (data.room.status === 'running') {
          router.push(`/student/room/${roomCode}/play`);
          return;
        }

        const group = data.groups?.find((g: any) => g.studentIds.includes(studentId));
        setMyGroup(group || null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isDriver = myGroup && user && myGroup.driverStudentId === user.id;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header currentUser={user} roomCode={roomCode} />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-8 w-full space-y-6">
        {/* Banner phòng chờ */}
        <div className="bg-gradient-to-r from-sky-600 to-teal-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl text-center space-y-3 relative overflow-hidden">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5 animate-spin" />
            Phòng chờ hoạt động luyện tập
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            {room?.name || 'Thử thách Tìm kiếm - Tin học 11'}
          </h1>

          <p className="text-xs sm:text-sm text-sky-100 max-w-xl mx-auto leading-relaxed">
            Em đã vào phòng thành công. Hãy cùng trao đổi với các bạn trong nhóm và chờ Thầy/Cô bấm bắt đầu làm bài!
          </p>

          <div className="pt-2">
            <span className="inline-block px-4 py-1.5 rounded-xl bg-amber-400 text-slate-900 font-bold text-xs uppercase tracking-wider animate-pulse">
              ⏳ Chờ giáo viên bắt đầu
            </span>
          </div>
        </div>

        {/* Thông tin nhóm và vai trò thành viên */}
        {myGroup && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs uppercase font-bold text-teal-600 block">Nhóm của em</span>
                <h2 className="text-xl font-black text-slate-800">{myGroup.name}</h2>
              </div>

              {isDriver ? (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <span>Em đang là <strong>Người điều khiển</strong> (thao tác lưu bài làm)</span>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs">
                  <span>Thành viên quan sát & hỗ trợ tính toán</span>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                Thành viên trong nhóm ({myGroup.members?.length || 0} bạn):
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {myGroup.members?.map((m: any) => {
                  const isCurrentDriver = m.id === myGroup.driverStudentId;
                  const role: SuggestedRole = myGroup.memberRoles?.[m.id] || 'verifier';

                  return (
                    <div
                      key={m.id}
                      className={`p-3.5 rounded-xl border flex items-center justify-between transition-colors ${
                        m.id === user?.id
                          ? 'bg-teal-50/70 border-teal-300 ring-1 ring-teal-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div>
                        <span className="font-bold text-sm text-slate-800 block">
                          {m.name} {m.id === user?.id && <span className="text-xs text-teal-700">(Em)</span>}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          Mã: {m.loginCode || m.username}
                        </span>
                      </div>

                      <RoleBadge role={role} isDriver={isCurrentDriver} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Luật chơi và lưu ý sư phạm */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-sky-600" />
            Luật chơi và cấu trúc bài làm (10 điểm):
          </h3>
          <ul className="text-xs text-slate-600 space-y-2 leading-relaxed">
            <li>
              • <strong>Chặng 1: Mở khóa kiến thức</strong> (5 điểm) — 5 câu trắc nghiệm so sánh tìm kiếm tuần tự và nhị phân.
            </li>
            <li>
              • <strong>Chặng 2: Thu hẹp vùng tìm</strong> (5 điểm) — Mô phỏng chạy tay thuật toán nhị phân trên dãy 8 phần tử với K = 38.
            </li>
            <li>
              • <strong>Phối hợp nhóm</strong>: Mỗi nhóm chỉ có một bài nộp chính thức. Sau phần trắc nghiệm, nhóm hãy đổi người điều khiển để bạn khác cùng thao tác máy!
            </li>
            <li>
              • <strong>Chấm theo từng tiêu chí</strong>: Không mất toàn bộ điểm nếu sai một bước. Các bước đúng theo đáp án chuẩn vẫn được ghi nhận điểm.
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
