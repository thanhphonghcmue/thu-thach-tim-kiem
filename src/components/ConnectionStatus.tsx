'use client';

import React from 'react';
import { Check, CloudOff, RefreshCw } from 'lucide-react';

export type SyncState = 'saved' | 'saving' | 'offline';

interface ConnectionStatusProps {
  status: SyncState;
  lastSyncedAt?: string;
}

export default function ConnectionStatus({ status, lastSyncedAt }: ConnectionStatusProps) {
  if (status === 'saving') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
        <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
        Đang lưu bài...
      </span>
    );
  }

  if (status === 'offline') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-300">
        <CloudOff className="w-3.5 h-3.5 text-rose-600" />
        Mất kết nối (Đã giữ bản nháp trên máy)
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
      <Check className="w-3.5 h-3.5 text-emerald-600" />
      Đã lưu an toàn
      {lastSyncedAt && (
        <span className="text-[10px] text-emerald-600/70 ml-0.5">
          ({new Date(lastSyncedAt).toLocaleTimeString('vi-VN')})
        </span>
      )}
    </span>
  );
}
