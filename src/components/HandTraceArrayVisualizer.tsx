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
  title = 'Dãy số A (tăng dần)',
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
    <div className="bg-white rounded-xl border border-sky-100 shadow-sm p-4 mb-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">{title}</span>
          <span className="text-xs bg-sky-50 text-sky-700 font-mono px-2 py-0.5 rounded border border-sky-200">
            K = <strong className="text-sky-900">{HAND_TRACE_TARGET}</strong>
          </span>
        </div>

        {hasRange && (
          <span className="text-xs text-sky-600 bg-sky-50 px-2 py-0.5 rounded font-mono">
            Phạm vi đang xét: [{l}, {r}]
          </span>
        )}

        {isOutOfBound && (
          <span className="text-xs text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 font-medium">
            ⚠️ Lưu ý: Chỉ số hợp lệ nằm trong đoạn [0, 7]
          </span>
        )}
      </div>

      {/* Grid 8 phần tử và chỉ số */}
      <div className="overflow-x-auto pb-2">
        <div className="grid grid-cols-8 gap-1.5 md:gap-3 min-w-[340px]">
          {HAND_TRACE_ARRAY.map((val, idx) => {
            const isMid = !isNaN(m) && m === idx;
            const inRange = hasRange ? idx >= l && idx <= r : true;
            const isEliminated = hasRange && !inRange;

            let cardStyle = 'border-slate-200 bg-slate-50 text-slate-800';
            if (isMid) {
              cardStyle = 'border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-400 font-bold shadow-md';
            } else if (inRange && hasRange) {
              cardStyle = 'border-sky-400 bg-sky-50/70 text-sky-900 font-semibold';
            } else if (isEliminated) {
              cardStyle = 'border-slate-100 bg-slate-100/50 text-slate-400 line-through opacity-60';
            }

            return (
              <div key={idx} className="flex flex-col items-center">
                {/* Ô giá trị A[i] */}
                <div
                  className={`w-full aspect-square flex items-center justify-center rounded-lg border-2 text-base md:text-xl transition-all duration-200 relative ${cardStyle}`}
                >
                  {val}
                  {isMid && (
                    <span className="absolute -top-2 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase shadow">
                      mid
                    </span>
                  )}
                </div>

                {/* Ô chỉ số i */}
                <div className="mt-1 flex flex-col items-center">
                  <span className="text-[11px] font-mono text-slate-500">[{idx}]</span>
                  <div className="flex gap-0.5 text-[9px] font-bold">
                    {idx === l && <span className="text-sky-600">L</span>}
                    {idx === r && <span className="text-sky-600">R</span>}
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
