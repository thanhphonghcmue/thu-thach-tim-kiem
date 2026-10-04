'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { User } from '@/types';
import {
  GraduationCap,
  Users,
  QrCode,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  BookOpen,
} from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [quickRoomCode, setQuickRoomCode] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('app_user');
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const handleQuickJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickRoomCode.trim()) {
      router.push(`/join?room=${encodeURIComponent(quickRoomCode.trim().toUpperCase())}`);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('app_user');
    setUser(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50/50 via-white to-slate-50 flex flex-col">
      <Header currentUser={user} onLogout={handleLogout} />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col justify-center">
        {/* Hero Section */}
        <div className="text-center space-y-4 mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-100 text-sky-800 text-xs font-bold tracking-wide uppercase shadow-xs">
            <Sparkles className="w-4 h-4 text-sky-600" />
            Tin học 11 • Kế hoạch bài dạy 2 tiết
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            THỬ THÁCH TÌM KIẾM
          </h1>
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Hệ thống luyện tập tương tác thời gian thực: So sánh và thực hành thuật toán{' '}
            <strong className="text-sky-700">Tìm kiếm tuần tự</strong> &{' '}
            <strong className="text-teal-700">Tìm kiếm nhị phân</strong> trên ngôn ngữ C++.
          </p>
        </div>

        {/* Quick Room Code Input Card */}
        <div className="max-w-md mx-auto w-full bg-white rounded-2xl border border-sky-100 shadow-xl p-6 sm:p-8 mb-10 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-sky-500 to-teal-500" />
          
          <h2 className="text-base font-bold text-slate-800 mb-2 flex items-center gap-2">
            <QrCode className="w-5 h-5 text-sky-600" />
            Vào phòng làm bài bằng mã
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Nhập mã phòng 6 ký tự được giáo viên chiếu trên bảng:
          </p>

          <form onSubmit={handleQuickJoin} className="space-y-3">
            <div className="relative">
              <input
                type="text"
                value={quickRoomCode}
                onChange={(e) => setQuickRoomCode(e.target.value.toUpperCase())}
                placeholder="VD: TIMKIEM"
                maxLength={8}
                className="w-full text-center tracking-widest text-xl font-mono font-black uppercase px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-sky-500 focus:ring-4 focus:ring-sky-100 outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-sky-600 to-teal-600 hover:from-sky-700 hover:to-teal-700 text-white font-bold text-sm rounded-xl shadow-md shadow-sky-600/20 flex items-center justify-center gap-2 transition-all"
            >
              Tham gia phòng ngay
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Portals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto w-full mb-12">
          {/* Cổng Học sinh */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-4">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">Dành cho Học sinh</h3>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Quét mã QR hoặc nhập mã phòng, chọn biệt danh yêu thích và avatar dễ thương để vào phòng chờ ngay mà không cần tạo tài khoản!
              </p>
            </div>
            <Link
              href="/join"
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
            >
              Vào phòng chờ ngay
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Cổng Giáo viên */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-4">
                <GraduationCap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">Dành cho Giáo viên</h3>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Tạo phòng, chiếu mã QR, giám sát trực tiếp tiến độ các nhóm, duyệt giải thích tự do và xuất bảng điểm Excel UTF-8.
              </p>
            </div>
            <Link
              href="/teacher"
              className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
            >
              Quản lý lớp & Bảng điều khiển
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="border-t border-slate-200 pt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="p-3">
            <span className="font-bold text-xs text-slate-800 block mb-1">⚡ Đồng bộ Real-time</span>
            <span className="text-[11px] text-slate-500">Người điều khiển thao tác, thành viên và giáo viên quan sát tức thì.</span>
          </div>
          <div className="p-3">
            <span className="font-bold text-xs text-slate-800 block mb-1">🎯 Chấm theo Rubric chi tiết</span>
            <span className="text-[11px] text-slate-500">Chấm độc lập từng tiêu chí (left, right, mid, so sánh, cập nhật, giải thích).</span>
          </div>
          <div className="p-3">
            <span className="font-bold text-xs text-slate-800 block mb-1">📱 Tối ưu điện thoại & Máy chiếu</span>
            <span className="text-[11px] text-slate-500">Mã QR truy cập qua mạng Wi-Fi trường học, màn hình máy chiếu riêng.</span>
          </div>
        </div>
      </main>
    </div>
  );
}
