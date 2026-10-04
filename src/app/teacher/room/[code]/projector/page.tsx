'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import QRCodeCard from '@/components/QRCodeCard';
import { Room, LeaderboardEntry, Participant } from '@/types';
import { getAvatarInfo } from '@/components/AvatarPicker';
import { Award, Tv, Users, ArrowLeft, Clock } from 'lucide-react';

export default function ProjectorView({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = use(params);
  const roomCode = resolvedParams.code.toUpperCase();
  const router = useRouter();

  const [room, setRoom] = useState<Room | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    loadData();

    // Cập nhật đồng hồ chiếu
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('vi-VN'));
    }, 1000);

    // Lắng nghe SSE
    const eventSource = new EventSource(`/api/rooms/${roomCode}/events`);
    eventSource.onmessage = () => {
      loadData();
    };

    const pollTimer = setInterval(loadData, 3000);

    return () => {
      eventSource.close();
      clearInterval(clockInterval);
      clearInterval(pollTimer);
    };
  }, [roomCode]);

  const loadData = async () => {
    try {
      const res = await fetch(`/api/rooms/${roomCode}`);
      const data = await res.json();
      if (data.room) {
        setRoom(data.room);
        setLeaderboard(data.leaderboard || []);
        setParticipants(data.participants || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col p-6 sm:p-8">
      {/* Header trình chiếu */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/teacher/room/${roomCode}`)}
            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl transition-colors"
            title="Quay lại Giám sát"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <span className="text-xs uppercase tracking-widest text-sky-400 font-bold block">
              MÀN HÌNH MÁY CHIẾU LỚP HỌC • TIN HỌC 11
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              THỬ THÁCH TÌM KIẾM
              <span className="text-xl font-mono px-3 py-0.5 rounded-lg bg-sky-900 text-sky-300 border border-sky-700">
                {roomCode}
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4 text-right">
          <div className="bg-slate-900 px-4 py-2 rounded-xl border border-slate-800 text-slate-300 font-mono text-sm">
            🕒 {currentTime}
          </div>
        </div>
      </div>

      {/* Main Grid: QR bên trái, Bảng xếp hạng bên phải */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Cột QR tham gia */}
        <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 flex flex-col items-center text-center shadow-2xl">
          <span className="text-sm uppercase tracking-wider text-sky-400 font-bold mb-1">
            QUÉT ĐỂ THAM GIA PHÒNG
          </span>
          <p className="text-xs text-slate-400 mb-4">
            Dành cho học sinh tham gia bằng điện thoại
          </p>

          <div className="w-full">
            <QRCodeCard roomCode={roomCode} />
          </div>

          <div className="mt-4 text-xs text-slate-400 w-full text-left bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-slate-300">
                👥 Đang có mặt: <strong className="text-teal-400">{participants.length}</strong> bạn
              </span>
              <span className="text-[11px] text-emerald-400 font-semibold">
                {participants.filter(p => p.isReady).length} đã sẵn sàng ✓
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
              {participants.map((p) => {
                const av = getAvatarInfo(p.avatar);
                return (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-200"
                  >
                    <span>{av.emoji}</span>
                    <span className="font-medium truncate max-w-[80px]">{p.nickname}</span>
                    {p.isReady && <span className="text-emerald-400 font-bold">✓</span>}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Cột Bảng xếp hạng & Kết quả cá nhân */}
        <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <Award className="w-6 h-6 text-amber-400" />
                BẢNG XẾP HẠNG THI ĐUA CÁ NHÂN
              </h2>
              <span className="text-xs text-slate-400">
                {room?.status === 'published' ? 'Đã công bố chính thức' : 'Cập nhật trực tiếp'}
              </span>
            </div>

            {leaderboard.length === 0 ? (
              <div className="text-center py-16 text-slate-500 text-base">
                Đang chờ các bạn học sinh nộp bài...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400 font-bold">
                      <th className="py-3 px-4">Hạng</th>
                      <th className="py-3 px-4">Học sinh</th>
                      <th className="py-3 px-4 text-center">Trắc nghiệm (/5)</th>
                      <th className="py-3 px-4 text-center">Chạy tay (/5)</th>
                      <th className="py-3 px-4 text-right">Tổng điểm (/10)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {leaderboard.map((item, idx) => {
                      const av = getAvatarInfo(item.avatar);
                      let rankBadge = (
                        <span className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 font-bold flex items-center justify-center text-sm">
                          {item.rank || idx + 1}
                        </span>
                      );

                      if (item.rank === 1) {
                        rankBadge = (
                          <span className="w-8 h-8 rounded-full bg-amber-500 text-black font-black flex items-center justify-center text-sm shadow-lg shadow-amber-500/30">
                            🥇 1
                          </span>
                        );
                      } else if (item.rank === 2) {
                        rankBadge = (
                          <span className="w-8 h-8 rounded-full bg-slate-300 text-black font-black flex items-center justify-center text-sm shadow-md">
                            🥈 2
                          </span>
                        );
                      } else if (item.rank === 3) {
                        rankBadge = (
                          <span className="w-8 h-8 rounded-full bg-amber-700 text-white font-black flex items-center justify-center text-sm shadow-md">
                            🥉 3
                          </span>
                        );
                      }

                      return (
                        <tr
                          key={item.participantId || idx}
                          className="hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-4 px-4">{rankBadge}</td>
                          <td className="py-4 px-4 font-bold text-base sm:text-lg text-white">
                            <div className="flex items-center gap-2.5">
                              <span className="text-2xl leading-none">{av.emoji}</span>
                              <span>{item.nickname}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center font-mono font-bold text-base text-sky-300">
                            {item.isSubmitted ? item.mcqScore.toFixed(2) : '-'}
                          </td>
                          <td className="py-4 px-4 text-center font-mono font-bold text-base text-teal-300">
                            {item.isSubmitted ? item.handScore.toFixed(2) : '-'}
                          </td>
                          <td className="py-4 px-4 text-right">
                            {item.isSubmitted ? (
                              <div className="flex flex-col items-end">
                                <span className="font-mono font-black text-2xl text-amber-400">
                                  {item.totalScore.toFixed(2)}
                                </span>
                                {item.isPendingReview && (
                                  <span className="text-[10px] text-amber-300 font-semibold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60">
                                    Chờ duyệt giải thích
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-500 italic">Đang làm...</span>
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

          <div className="mt-8 pt-4 border-t border-slate-800 text-xs text-slate-500 flex items-center justify-between">
            <span>*Quy tắc: Bằng điểm đồng hạng. Không xếp hạng bằng thời gian nộp bài.</span>
            <span>Ứng dụng Web Tin học 11</span>
          </div>
        </div>
      </div>
    </div>
  );
}
