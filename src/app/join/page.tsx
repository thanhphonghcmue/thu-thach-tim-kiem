'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import { User } from '@/types';
import { QrCode, ArrowRight, AlertCircle, LogIn } from 'lucide-react';

function JoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRoom = searchParams.get('room') || '';

  const [roomCode, setRoomCode] = useState(initialRoom.toUpperCase());
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('app_user');
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = roomCode.trim().toUpperCase();
    if (!cleanCode) return;

    setError('');
    setLoading(true);

    try {
      // 1. Kiểm tra xem người dùng đã đăng nhập chưa
      if (!user) {
        // Chưa đăng nhập -> Chuyển sang login kèm returnUrl
        router.push(`/login?role=student&returnUrl=${encodeURIComponent(`/join?room=${cleanCode}`)}`);
        return;
      }

      // 2. Kiểm tra thông tin phòng
      const res = await fetch(`/api/rooms/${cleanCode}?studentId=${user.id}`);
      const data = await res.json();

      if (!res.ok || !data.room) {
        setError(data.error || 'Phòng thi không tồn tại hoặc đã bị đóng');
        setLoading(false);
        return;
      }

      const { room, groups } = data;

      // 3. Kiểm tra khóa người tham gia
      if (room.isLocked) {
        setError('Phòng thi đã bị giáo viên khóa tiếp nhận thành viên mới');
        setLoading(false);
        return;
      }

      // 4. Tìm nhóm của học sinh này trong phòng
      const myGroup = groups.find((g: any) => g.studentIds.includes(user.id));
      if (!myGroup && user.role === 'student') {
        setError('Em chưa được phân vào nhóm nào trong phòng này. Hãy báo với Giáo viên!');
        setLoading(false);
        return;
      }

      // 5. Điều hướng theo trạng thái phòng
      if (room.status === 'waiting') {
        router.push(`/student/room/${cleanCode}/waiting`);
      } else if (room.status === 'running' || room.status === 'paused') {
        router.push(`/student/room/${cleanCode}/play`);
      } else if (room.status === 'published' || room.status === 'closed') {
        router.push(`/student/room/${cleanCode}/result`);
      } else {
        router.push(`/student/room/${cleanCode}/waiting`);
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối phòng');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header currentUser={user} />

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto mb-3">
              <QrCode className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-black text-slate-800">Tham gia phòng học</h2>
            <p className="text-xs text-slate-500 mt-1">
              Nhập mã phòng để kết nối cùng các bạn trong nhóm
            </p>
          </div>

          {!user && (
            <div className="mb-5 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2.5">
              <LogIn className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <span className="font-bold block">Chưa đăng nhập tài khoản học sinh:</span>
                Sau khi nhấn Tham gia, em sẽ được chuyển tới trang đăng nhập và tự động quay lại phòng này.
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Mã phòng thi (6 ký tự):
              </label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="VD: TIMKIEM"
                required
                maxLength={8}
                autoFocus
                className="w-full text-center tracking-widest text-2xl font-mono font-black uppercase px-4 py-3 border-2 border-slate-300 rounded-xl focus:border-sky-500 focus:ring-4 focus:ring-sky-100 outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-700 hover:to-teal-700 text-white font-bold text-sm rounded-xl shadow-md shadow-sky-600/20 flex items-center justify-center gap-2 transition-all"
            >
              {loading ? 'Đang kiểm tra phòng...' : 'Vào phòng ngay'}
              <ArrowRight className="w-4 h-4" />
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
