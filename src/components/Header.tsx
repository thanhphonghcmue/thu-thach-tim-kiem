'use client';

import React from 'react';
import Link from 'next/link';
import { User } from '@/types';
import { LogOut, GraduationCap, Users } from 'lucide-react';

interface HeaderProps {
  currentUser?: User | null;
  onLogout?: () => void;
  title?: string;
  roomCode?: string;
}

export default function Header({
  currentUser,
  onLogout,
  title = 'THỬ THÁCH TÌM KIẾM',
  roomCode,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-teal-500 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <span className="font-extrabold text-base sm:text-lg text-slate-800 tracking-tight block">
                {title}
              </span>
              <span className="text-[11px] font-medium text-sky-600 block leading-tight">
                Tin học 11 • Tìm kiếm tuần tự & nhị phân
              </span>
            </div>
          </Link>

          {roomCode && (
            <div className="hidden sm:flex items-center gap-1.5 ml-4 px-3 py-1 bg-sky-50 border border-sky-200 rounded-full">
              <span className="text-xs text-slate-500">Phòng:</span>
              <strong className="text-xs font-mono font-bold text-sky-800">{roomCode}</strong>
            </div>
          )}
        </div>

        {/* User Info & Actions */}
        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-2.5">
              <div className="text-right hidden sm:block">
                <span className="text-xs font-bold text-slate-800 block leading-tight">
                  {currentUser.name}
                </span>
                <span className="text-[11px] text-slate-500 flex items-center justify-end gap-1">
                  {currentUser.role === 'teacher' ? 'Giáo viên' : 'Học sinh'}
                  {currentUser.loginCode && ` • ${currentUser.loginCode}`}
                </span>
              </div>

              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
                {currentUser.role === 'teacher' ? (
                  <GraduationCap className="w-4 h-4 text-sky-600" />
                ) : (
                  <Users className="w-4 h-4 text-teal-600" />
                )}
              </div>

              {onLogout && (
                <button
                  onClick={onLogout}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Đăng xuất"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-3.5 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-50 rounded-lg transition-colors border border-sky-200"
              >
                Đăng nhập
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
