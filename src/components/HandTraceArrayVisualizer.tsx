'use client';

import React from 'react';
import { HAND_TRACE_ARRAY, HAND_TRACE_TARGET } from '@/data/questions';

interface HandTraceArrayVisualizerProps {
  currentLeft?: number | string;
  currentRight?: number | string;
  currentMid?: number | string;
  title?: string;
}

export default function HandTraceArrayVisualizer({
  currentLeft,
  currentRight,
  currentMid,
  title = 'Mảng A (đã sắp xếp tăng dần)',
}: HandTraceArrayVisualizerProps) {
  const l = typeof currentLeft === 'number' ? currentLeft : parseInt(String(currentLeft || ''), 10);
  const r = typeof currentRight === 'number' ? currentRight : parseInt(String(currentRight || ''), 10);
  const m = typeof currentMid === 'number' ? currentMid : parseInt(String(currentMid || ''), 10);

  const hasRange = !isNaN(l) && !isNaN(r) && l >= 0 && r < HAND_TRACE_ARRAY.length && l <= r;
  const isOutOfBound =
    (!isNaN(l) && (l < 0 || l >= HAND_TRACE_ARRAY.length)) ||
    (!isNaN(r) && (r < 0 || r >= HAND_TRACE_ARRAY.length)) ||
    (!isNaN(m) && (m < 0 || m >= HAND_TRACE_ARRAY.length));

  return (
    <div className="bg-white rounded-2xl border border-sky-200 shadow-sm p-4 sm:p-5 mb-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-slate-800">{title}</span>
          <span className="text-xs bg-sky-100 text-sky-800 font-bold px-2.5 py-1 rounded-lg border border-sky-300">
            Giá trị cần tìm: <strong className="text-sky-950 font-extrabold">K = {HAND_TRACE_TARGET}</strong>
          </span>
        </div>

        {hasRange && (
          <span className="text-xs text-sky-700 bg-sky-50 px-2.5 py-1 rounded-md font-mono font-bold border border-sky-200">
            Phạm vi đang xét: [{l}, {r}]
          </span>
        )}

        {isOutOfBound && (
          <span className="text-xs text-rose-600 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200 font-semibold">
            ⚠️ Lưu ý: Chỉ số hợp lệ nằm trong đoạn [0, 4]
          </span>
        )}
      </div>

      <div className="text-[11px] text-slate-500 mb-3 flex items-center gap-1.5 font-mono">
        <span>Quy tắc C++:</span>
        <code className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-bold">
          mid = left + (right - left) / 2;
        </code>
        <span className="text-slate-400 italic">(phép chia số nguyên lấy phần nguyên)</span>
      </div>

      {/* Grid 5 ô số lớn và chỉ số 0..4 */}
      <div className="overflow-x-auto pb-2">
        <div className="grid grid-cols-5 gap-2 sm:gap-4 max-w-lg mx-auto">
          {HAND_TRACE_ARRAY.map((val, idx) => {
            const isMid = !isNaN(m) && m === idx;
            const inRange = hasRange ? idx >= l && idx <= r : true;
            const isEliminated = hasRange && !inRange;

            let cardStyle = 'border-slate-200 bg-slate-50 text-slate-800';
            if (isMid) {
              cardStyle = 'border-amber-500 bg-amber-50 text-amber-950 ring-4 ring-amber-400/50 font-black shadow-lg scale-105';
            } else if (inRange && hasRange) {
              cardStyle = 'border-sky-400 bg-sky-50 text-sky-950 font-bold shadow-xs';
            } else if (isEliminated) {
              cardStyle = 'border-slate-200 bg-slate-100/60 text-slate-400 line-through opacity-50';
            }

            return (
              <div key={idx} className="flex flex-col items-center">
                {/* 5 ô số lớn */}
                <div
                  className={`w-full aspect-square flex items-center justify-center rounded-2xl border-2 text-2xl sm:text-3xl font-black transition-all duration-200 relative ${cardStyle}`}
                >
                  {val}
                  {isMid && (
                    <span className="absolute -top-2.5 bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase shadow tracking-wider">
                      mid
                    </span>
                  )}
                </div>

                {/* Bên dưới ghi rõ chỉ số 0, 1, 2, 3, 4 */}
                <div className="mt-1.5 flex flex-col items-center">
                  <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                    chỉ số {idx}
                  </span>
                  <div className="flex gap-1 text-[11px] font-black mt-0.5">
                    {idx === l && <span className="text-sky-600 bg-sky-100 px-1 rounded">L</span>}
                    {idx === r && <span className="text-sky-600 bg-sky-100 px-1 rounded">R</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
