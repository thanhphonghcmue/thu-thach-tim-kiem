'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import { GraduationCap, Users, ArrowRight, KeyRound, AlertCircle } from 'lucide-react';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = searchParams.get('role') === 'teacher' ? 'teacher' : 'student';
  const returnUrl = searchParams.get('returnUrl') || '';

  const [role, setRole] = useState<'student' | 'teacher'>(initialRole);
  const [loginCode, setLoginCode] = useState('');
  const [teacherUsername, setTeacherUsername] = useState('giaovien');
  const [teacherPassword, setTeacherPassword] = useState('123456');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get('role') === 'teacher') {
      setRole('teacher');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload =
        role === 'student'
          ? { role: 'student', loginCode: loginCode.trim() }
          : { role: 'teacher', username: teacherUsername.trim(), password: teacherPassword };

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Đăng nhập không thành công');
        return;
      }

      // Lưu phiên vào localStorage
      localStorage.setItem('app_user', JSON.stringify(data.user));

      // Điều hướng
      if (returnUrl) {
        router.push(returnUrl);
      } else if (role === 'teacher') {
        router.push('/teacher');
      } else {
        router.push('/join');
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
          {/* Header tabs */}
          <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-100/70 p-1">
            <button
              type="button"
              onClick={() => { setRole('student'); setError(''); }}
              className={`py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${
                role === 'student'
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Users className="w-4 h-4" />
              Học sinh
            </button>
            <button
              type="button"
              onClick={() => { setRole('teacher'); setError(''); }}
              className={`py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${
                role === 'teacher'
                  ? 'bg-white text-sky-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              Giáo viên
            </button>
          </div>

          <div className="p-6 sm:p-8">
            <div className="mb-6 text-center">
              <h2 className="text-xl font-black text-slate-800">
                {role === 'student' ? 'Đăng nhập Học sinh' : 'Đăng nhập Giáo viên'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {role === 'student'
                  ? 'Nhập mã đăng nhập cá nhân (VD: HS001, HS002...)'
                  : 'Sử dụng tài khoản quản lý phòng học'}
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {role === 'student' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Mã đăng nhập của em:
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={loginCode}
                      onChange={(e) => setLoginCode(e.target.value.toUpperCase())}
                      placeholder="VD: HS001"
                      required
                      autoFocus
                      className="w-full px-4 py-3 text-lg font-mono font-bold tracking-wider uppercase border border-slate-300 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-100 outline-none transition-all"
                    />
                    <KeyRound className="w-5 h-5 text-slate-400 absolute right-3.5 top-3.5" />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    *Mã được giáo viên cấp trong danh sách lớp (gợi ý thử nghiệm: <strong>HS001</strong> đến <strong>HS012</strong>).
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Tên đăng nhập:
                    </label>
                    <input
                      type="text"
                      value={teacherUsername}
                      onChange={(e) => setTeacherUsername(e.target.value)}
                      placeholder="VD: giaovien"
                      required
                      className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:border-sky-500 focus:ring-4 focus:ring-sky-100 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Mật khẩu:
                    </label>
                    <input
                      type="password"
                      value={teacherPassword}
                      onChange={(e) => setTeacherPassword(e.target.value)}
                      placeholder="••••••"
                      required
                      className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:border-sky-500 focus:ring-4 focus:ring-sky-100 outline-none transition-all"
                    />
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      *Mặc định thử nghiệm: <code>giaovien</code> / <code>123456</code>
                    </p>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-all ${
                  role === 'student'
                    ? 'bg-teal-600 hover:bg-teal-700 shadow-teal-600/20'
                    : 'bg-sky-600 hover:bg-sky-700 shadow-sky-600/20'
                }`}
              >
                {loading ? 'Đang xác thực...' : 'Đăng nhập vào hệ thống'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-slate-500">Đang tải trang đăng nhập...</div>}>
      <LoginContent />
    </Suspense>
  );
}
