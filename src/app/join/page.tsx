'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import AvatarPicker, { AVATARS } from '@/components/AvatarPicker';
import { AvatarId, Room } from '@/types';
import { Sparkles, ArrowRight, AlertCircle, QrCode } from 'lucide-react';

function JoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRoom = (searchParams.get('room') || '').toUpperCase();

  const [roomCode, setRoomCode] = useState(initialRoom);
  const [room, setRoom] = useState<Room | null>(null);
  const [checkingRoom, setCheckingRoom] = useState(false);

  // Dữ liệu học sinh nhập
  const [nickname, setNickname] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarId>('cat');
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);

  // Tự động kiểm tra phòng khi có mã phòng
  useEffect(() => {
    if (roomCode.trim().length >= 4) {
      checkRoom(roomCode.trim().toUpperCase());
    }
  }, [roomCode]);

  // Khôi phục phiên cũ nếu có
  useEffect(() => {
    if (roomCode) {
      try {
        const saved = localStorage.getItem(`student_session_${roomCode.toUpperCase()}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.nickname) setNickname(parsed.nickname);
          if (parsed.avatar) setSelectedAvatar(parsed.avatar);
        }
      } catch (e) {}
    }
  }, [roomCode]);

  const checkRoom = async (code: string) => {
    try {
      setCheckingRoom(true);
      setError('');
      const res = await fetch(`/api/rooms/${code}`);
      const data = await res.json();
      if (res.ok && data.room) {
        setRoom(data.room);
      } else {
        setRoom(null);
        if (code.length === 6) {
          setError(data.error || 'Phòng thi không tồn tại hoặc đã đóng');
        }
      }
    } catch (err) {
      setRoom(null);
    } finally {
      setCheckingRoom(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = roomCode.trim().toUpperCase();
    const cleanName = nickname.trim();

    if (!cleanCode) {
      setError('Vui lòng nhập mã phòng');
      return;
    }
    if (!cleanName) {
      setError('Vui lòng nhập tên hoặc biệt danh của bạn');
      return;
    }

    setError('');
    setJoining(true);

    try {
      const res = await fetch(`/api/rooms/${cleanCode}/join-fast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname: cleanName,
          avatar: selectedAvatar,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Không thể vào phòng thi');
        setJoining(false);
        return;
      }

      // Lưu hồ sơ tham gia vào localStorage theo phòng
      const participant = data.participant;
      localStorage.setItem(`student_session_${cleanCode}`, JSON.stringify(participant));
      // Lưu tương thích cho các màn hình khác
      localStorage.setItem('app_user', JSON.stringify({
        id: participant.id,
        role: 'student',
        name: participant.nickname,
        username: participant.nickname,
        avatar: participant.avatar,
        classId: data.room?.classId,
      }));

      // Chuyển thẳng vào phòng chờ
      router.push(`/student/room/${cleanCode}/waiting`);
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-12">
      <Header />

      <main className="flex-1 max-w-xl mx-auto px-4 sm:px-6 py-6 w-full flex flex-col justify-center">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-6 sm:p-8 space-y-6">
          {/* Header thi đua */}
          <div className="text-center space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-100 text-teal-800 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              Thử thách Tìm kiếm • Tin học 11
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Tham gia Trò chơi
            </h1>
            <p className="text-xs text-slate-500">
              Không cần đăng ký phức tạp. Hãy chọn tên & avatar thật ngầu rồi vào phòng chờ nhé!
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleJoin} className="space-y-5">
            {/* 1. Mã phòng */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Mã phòng thi:
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="VD: TIMKIEM"
                  maxLength={8}
                  required
                  className="w-full text-center tracking-widest text-xl font-mono font-black uppercase px-4 py-3 border-2 border-slate-300 rounded-2xl focus:border-teal-500 focus:ring-4 focus:ring-teal-100 outline-none transition-all"
                />
                <QrCode className="w-5 h-5 text-slate-400 absolute right-3.5 top-3.5" />
              </div>

              {room && (
                <div className="mt-2 p-2.5 rounded-xl bg-teal-50 border border-teal-200 text-xs text-teal-900 flex items-center justify-between">
                  <span>Phòng: <strong>{room.name}</strong></span>
                  <span className="font-semibold text-teal-700 bg-white px-2 py-0.5 rounded-md border border-teal-200 text-[11px]">
                    {room.status === 'waiting' ? '🟢 Đang mở phòng chờ' : '🟡 ' + room.status}
                  </span>
                </div>
              )}
            </div>

            {/* 2. Biệt danh của học sinh */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Tên hoặc biệt danh của bạn:
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="VD: Minh Anh, Duy Long, Bé Thỏ..."
                maxLength={25}
                required
                className="w-full px-4 py-3 text-base font-semibold border-2 border-slate-300 rounded-2xl focus:border-teal-500 focus:ring-4 focus:ring-teal-100 outline-none transition-all"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                *Tên này sẽ hiển thị với Thầy/Cô và các bạn trên bảng xếp hạng.
              </p>
            </div>

            {/* 3. Chọn Avatar dễ thương */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Chọn Avatar yêu thích của bạn:
              </label>
              <AvatarPicker selected={selectedAvatar} onSelect={setSelectedAvatar} />
            </div>

            {/* Nút vào phòng chờ */}
            <button
              type="submit"
              disabled={joining || checkingRoom}
              className="w-full py-3.5 bg-gradient-to-r from-teal-600 to-sky-600 hover:from-teal-700 hover:to-sky-700 text-white font-black text-base rounded-2xl shadow-lg shadow-teal-600/25 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            >
              {joining ? 'Đang vào phòng...' : 'Vào phòng chờ ngay'}
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-slate-500">Đang tải...</div>}>
      <JoinContent />
    </Suspense>
  );
}
