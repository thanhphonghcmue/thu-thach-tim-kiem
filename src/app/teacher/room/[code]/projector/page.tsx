'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import QRCodeCard from '@/components/QRCodeCard';
import { Room, LeaderboardEntry } from '@/types';
import { Award, Tv, Users, ArrowLeft, Clock } from 'lucide-react';

export default function ProjectorView({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = use(params);
  const roomCode = resolvedParams.code.toUpperCase();
  const router = useRouter();

  const [room, setRoom] = useState<Room | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
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

          <div className="mt-4 text-xs text-slate-400">
            Trạng thái phòng: <strong className="text-emerald-400 uppercase">{room?.status}</strong>
          </div>
        </div>

        {/* Cột Bảng xếp hạng & Kết quả các nhóm */}
        <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <Award className="w-6 h-6 text-amber-400" />
                BẢNG XẾP HẠNG THI ĐUA CÁC NHÓM
              </h2>
              <span className="text-xs text-slate-400">
                {room?.status === 'published' ? 'Đã công bố chính thức' : 'Cập nhật trực tiếp'}
              </span>
            </div>

            {leaderboard.length === 0 ? (
              <div className="text-center py-16 text-slate-500 text-base">
                Đang chờ các nhóm nộp bài...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400 font-bold">
                      <th className="py-3 px-4">Hạng</th>
                      <th className="py-3 px-4">Nhóm</th>
                      <th className="py-3 px-4 text-center">Trắc nghiệm (/5)</th>
                      <th className="py-3 px-4 text-center">Chạy tay (/5)</th>
                      <th className="py-3 px-4 text-right">Tổng điểm (/10)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {leaderboard.map((item, idx) => {
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
                          key={item.groupId}
                          className="hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-4 px-4">{rankBadge}</td>
                          <td className="py-4 px-4 font-bold text-base sm:text-lg text-white">
                            {item.groupName}
                            <span className="block text-xs font-normal text-slate-400">
                              {item.members.join(', ')}
                            </span>
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
                                    Tạm tính (Chờ duyệt)
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
