'use client';

import React, { useState } from 'react';
import { HandTraceData, HandTraceStep } from '@/types';
import HandTraceArrayVisualizer from './HandTraceArrayVisualizer';
import { CheckCircle2, Info } from 'lucide-react';

interface HandTraceStepViewProps {
  data: HandTraceData;
  onChange: (newData: HandTraceData) => void;
  disabled?: boolean;
}

export default function HandTraceStepView({
  data,
  onChange,
  disabled = false,
}: HandTraceStepViewProps) {
  // Đảm bảo bài làm gồm đúng 2 bước
  const steps: HandTraceStep[] = [
    data.steps?.[0] || { stepNumber: 1, left: '', right: '', mid: '', aMid: '', comparison: '', action: '', newLeft: '', newRight: '' },
    data.steps?.[1] || { stepNumber: 2, left: '', right: '', mid: '', aMid: '', comparison: '', action: '', newLeft: '', newRight: '' },
  ];

  // Cho phép chọn xem minh họa bước 1 hoặc bước 2 trên thước đo mảng
  const [viewingStepIndex, setViewingStepIndex] = useState<number>(0);
  const activeStep = steps[viewingStepIndex] || steps[0];

  const handleStepChange = (index: number, field: keyof HandTraceStep, val: any) => {
    if (disabled) return;
    const newSteps: HandTraceStep[] = [...steps];
    newSteps[index] = {
      ...newSteps[index],
      [field]: val,
    };
    onChange({
      ...data,
      steps: newSteps,
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. Hiển thị 5 ô số lớn, chỉ số 0..4, K = 12 */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Mô phỏng trực quan trên mảng A
          </span>
          <div className="flex gap-1.5 bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setViewingStepIndex(0)}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                viewingStepIndex === 0
                  ? 'bg-white text-sky-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Xem Bước 1
            </button>
            <button
              type="button"
              onClick={() => setViewingStepIndex(1)}
              className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                viewingStepIndex === 1
                  ? 'bg-white text-sky-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Xem Bước 2
            </button>
          </div>
        </div>

        <HandTraceArrayVisualizer
          currentLeft={activeStep?.left}
          currentRight={activeStep?.right}
          currentMid={activeStep?.mid}
          title={`Mảng A • Đang quan sát Bước ${viewingStepIndex + 1}`}
        />
      </div>

      {/* 2. Hai bước chạy tay của học sinh */}
      <div className="space-y-5">
        {steps.map((step, idx) => {
          const isSearchingNext = step.action === 'keep_left' || step.action === 'keep_right';
          const isFound = step.action === 'found';

          // Hiển thị phạm vi mà học sinh đã nhập, không tự điền hoặc sửa đáp án hộ
          const hasLeft = step.left !== '' && step.left !== undefined;
          const hasRight = step.right !== '' && step.right !== undefined;

          return (
            <div
              key={idx}
              onClick={() => setViewingStepIndex(idx)}
              className={`bg-white rounded-2xl border transition-all p-4 sm:p-5 shadow-xs ${
                viewingStepIndex === idx
                  ? 'border-sky-400 ring-2 ring-sky-100'
                  : 'border-slate-200 hover:border-sky-200'
              }`}
            >
              {/* Tiêu đề bước và phạm vi học sinh đã nhập */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-sky-600 text-white font-extrabold flex items-center justify-center text-xs shadow-xs">
                    {step.stepNumber}
                  </span>
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-sm sm:text-base">
                      Bước {step.stepNumber}
                    </h3>
                  </div>
                </div>

                {/* Hiển thị phạm vi học sinh đã nhập */}
                <div className="text-xs bg-slate-50 border border-slate-200 px-3 py-1 rounded-lg">
                  <span className="text-slate-500">Phạm vi em đã nhập: </span>
                  <strong className="font-mono text-sky-700">
                    {hasLeft && hasRight
                      ? `[${step.left}, ${step.right}]`
                      : '(chưa nhập đủ left, right)'}
                  </strong>
                </div>
              </div>

              {/* Hàng 1: Điền left, right, mid và A[mid] */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    left (trước bước)
                  </label>
                  <input
                    type="number"
                    value={step.left}
                    disabled={disabled}
                    onChange={(e) => handleStepChange(idx, 'left', e.target.value)}
                    placeholder="VD: 0"
                    className="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 disabled:bg-slate-50 font-mono font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    right (trước bước)
                  </label>
                  <input
                    type="number"
                    value={step.right}
                    disabled={disabled}
                    onChange={(e) => handleStepChange(idx, 'right', e.target.value)}
                    placeholder="VD: 4"
                    className="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 disabled:bg-slate-50 font-mono font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    mid (chỉ số giữa)
                  </label>
                  <input
                    type="number"
                    value={step.mid}
                    disabled={disabled}
                    onChange={(e) => handleStepChange(idx, 'mid', e.target.value)}
                    placeholder="VD: 2"
                    className="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:bg-slate-50 font-mono font-black text-amber-700 bg-amber-50/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    A[mid] (giá trị)
                  </label>
                  <input
                    type="number"
                    value={step.aMid}
                    disabled={disabled}
                    onChange={(e) => handleStepChange(idx, 'aMid', e.target.value)}
                    placeholder="VD: 8"
                    className="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 disabled:bg-slate-50 font-mono font-black text-slate-900"
                  />
                </div>
              </div>

              {/* Hàng 2: Chọn kết quả so sánh và Chọn hành động */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kết quả so sánh A[mid] với K (12):
                  </label>
                  <select
                    value={step.comparison}
                    disabled={disabled}
                    onChange={(e) => handleStepChange(idx, 'comparison', e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 disabled:bg-slate-50 bg-white font-medium"
                  >
                    <option value="">-- Chọn kết quả so sánh --</option>
                    <option value="<">Nhỏ hơn K (A[mid] &lt; 12)</option>
                    <option value="=">Bằng K (A[mid] == 12)</option>
                    <option value=">">Lớn hơn K (A[mid] &gt; 12)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Hành động tiếp theo:
                  </label>
                  <select
                    value={step.action}
                    disabled={disabled}
                    onChange={(e) => handleStepChange(idx, 'action', e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 disabled:bg-slate-50 bg-white font-semibold text-slate-800"
                  >
                    <option value="">-- Chọn hành động --</option>
                    <option value="keep_right">Tìm tiếp bên phải (loại nửa trái và mid)</option>
                    <option value="keep_left">Tìm tiếp bên trái (loại nửa phải và mid)</option>
                    <option value="found">Tìm thấy (dừng thuật toán)</option>
                  </select>
                </div>
              </div>

              {/* Khi chọn tìm tiếp: Điền left mới và right mới */}
              {isSearchingNext && (
                <div className="bg-sky-50/70 p-3.5 rounded-xl border border-sky-200 mt-3">
                  <span className="block text-xs font-bold text-sky-900 mb-2">
                    Điền phạm vi mới để tìm tiếp [left, right]:
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        left mới
                      </label>
                      <input
                        type="number"
                        value={step.newLeft}
                        disabled={disabled}
                        onChange={(e) => handleStepChange(idx, 'newLeft', e.target.value)}
                        placeholder="VD: 3"
                        className="w-full px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-sky-500 bg-white disabled:bg-slate-100 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        right mới
                      </label>
                      <input
                        type="number"
                        value={step.newRight}
                        disabled={disabled}
                        onChange={(e) => handleStepChange(idx, 'newRight', e.target.value)}
                        placeholder="VD: 4"
                        className="w-full px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-sky-500 bg-white disabled:bg-slate-100 font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Khi chọn tìm thấy */}
              {isFound && (
                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center gap-2 mt-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Đã tìm thấy K = 12 tại chỉ số mid. Dừng thuật toán và chuyển sang kết luận!</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 3. Cuối bài: Điền chỉ số tìm thấy và số lần kiểm tra */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-300 rounded-2xl p-5 shadow-xs space-y-4">
        <div>
          <h4 className="font-extrabold text-amber-950 text-sm sm:text-base flex items-center gap-2">
            🎯 Kết luận bài toán (Thang điểm 1.0)
          </h4>
          <p className="text-xs text-amber-800 mt-0.5">
            Điền chỉ số tìm thấy và số lần kiểm tra phần tử giữa (không yêu cầu viết code hay đoạn giải thích dài).
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-2xs">
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Chỉ số tìm thấy (Index trong C++):
            </label>
            <input
              type="number"
              value={data.finalIndex}
              disabled={disabled}
              onChange={(e) => onChange({ ...data, finalIndex: e.target.value })}
              placeholder="Điền chỉ số (0 đến 4)"
              className="w-full px-3 py-2 text-sm border rounded-lg border-amber-300 focus:ring-2 focus:ring-amber-500 bg-white font-mono font-black text-amber-950 text-base"
            />
            <span className="text-[11px] text-slate-500 block mt-1">
              *Chỉ số mảng C++ bắt đầu từ 0 (từ 0 đến 4).
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-2xs">
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Số lần kiểm tra phần tử giữa:
            </label>
            <input
              type="number"
              value={data.checkCount}
              disabled={disabled}
              onChange={(e) => onChange({ ...data, checkCount: e.target.value })}
              placeholder="Điền số lần (VD: 2)"
              className="w-full px-3 py-2 text-sm border rounded-lg border-amber-300 focus:ring-2 focus:ring-amber-500 bg-white font-mono font-black text-amber-950 text-base"
            />
            <span className="text-[11px] text-slate-500 block mt-1">
              *Tổng số lần tính và so sánh giá trị A[mid].
            </span>
          </div>
        </div>

        {/* Hướng dẫn ngắn & phân biệt rõ ràng */}
        <div className="bg-white/90 border border-amber-200 p-3 rounded-xl flex items-start gap-2 text-xs text-amber-900">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>Ghi nhớ sư phạm:</strong> Phân biệt rõ: <strong>12</strong> là giá trị cần tìm; <strong>3</strong> là chỉ số tìm thấy trong mảng; <strong>2</strong> là số lần kiểm tra phần tử giữa.
          </div>
        </div>
      </div>
    </div>
  );
}
