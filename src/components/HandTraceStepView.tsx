'use client';

import React from 'react';
import { HandTraceData, HandTraceStep } from '@/types';
import HandTraceArrayVisualizer from './HandTraceArrayVisualizer';
import { Plus, Trash2 } from 'lucide-react';

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
  const steps: HandTraceStep[] = data.steps && data.steps.length > 0 ? data.steps : [
    { stepNumber: 1, left: '', right: '', mid: '', aMid: '', comparison: '', action: '', newLeft: '', newRight: '' },
  ];

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

  const handleAddStep = () => {
    if (disabled) return;
    const nextNum = steps.length + 1;
    const newStep: HandTraceStep = {
      stepNumber: nextNum,
      left: '',
      right: '',
      mid: '',
      aMid: '',
      comparison: '',
      action: '',
      newLeft: '',
      newRight: '',
    };
    onChange({
      ...data,
      steps: [...steps, newStep],
    });
  };

  const handleRemoveStep = (index: number) => {
    if (disabled || steps.length <= 1) return;
    const newSteps = steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, stepNumber: i + 1 }));
    onChange({
      ...data,
      steps: newSteps,
    });
  };

  // Lấy bước cuối cùng đang nhập để highlight lên thước đo mảng
  const activeStep = steps[steps.length - 1];

  return (
    <div className="space-y-6">
      {/* Hiển thị trực quan mảng theo bước hiện tại */}
      <HandTraceArrayVisualizer
        currentLeft={activeStep?.left}
        currentRight={activeStep?.right}
        currentMid={activeStep?.mid}
        title={`Dãy số A (Đang quan sát Bước ${activeStep?.stepNumber || 1})`}
      />

      <div className="space-y-4">
        {steps.map((step, idx) => {
          const isFound = step.action === 'found';

          return (
            <div
              key={idx}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:border-sky-300 transition-colors"
            >
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                <span className="font-bold text-sky-800 text-sm flex items-center gap-1.5">
                  <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-xs">
                    {step.stepNumber}
                  </span>
                  Bước {step.stepNumber}
                </span>

                {steps.length > 1 && !disabled && (
                  <button
                    type="button"
                    onClick={() => handleRemoveStep(idx)}
                    className="text-slate-400 hover:text-rose-500 p-1 text-xs flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Xóa bước
                  </button>
                )}
              </div>

              {/* Hàng 1: left, right, mid, A[mid] */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    left (trước bước)
                  </label>
                  <input
                    type="number"
                    value={step.left}
                    disabled={disabled}
                    onChange={(e) => handleStepChange(idx, 'left', e.target.value)}
                    placeholder="VD: 0"
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 disabled:bg-slate-50 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    right (trước bước)
                  </label>
                  <input
                    type="number"
                    value={step.right}
                    disabled={disabled}
                    onChange={(e) => handleStepChange(idx, 'right', e.target.value)}
                    placeholder="VD: 7"
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 disabled:bg-slate-50 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    mid (chỉ số giữa)
                  </label>
                  <input
                    type="number"
                    value={step.mid}
                    disabled={disabled}
                    onChange={(e) => handleStepChange(idx, 'mid', e.target.value)}
                    placeholder="VD: 3"
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 disabled:bg-slate-50 font-mono font-bold text-amber-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    A[mid] (giá trị)
                  </label>
                  <input
                    type="number"
                    value={step.aMid}
                    disabled={disabled}
                    onChange={(e) => handleStepChange(idx, 'aMid', e.target.value)}
                    placeholder="VD: 12"
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 disabled:bg-slate-50 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Hàng 2: So sánh và Hành động */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    So sánh A[mid] với K (38)
                  </label>
                  <select
                    value={step.comparison}
                    disabled={disabled}
                    onChange={(e) => handleStepChange(idx, 'comparison', e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 disabled:bg-slate-50 bg-white"
                  >
                    <option value="">-- Chọn so sánh --</option>
                    <option value="<">A[mid] &lt; K (Nhỏ hơn)</option>
                    <option value="=">A[mid] == K (Bằng nhau)</option>
                    <option value=">">A[mid] &gt; K (Lớn hơn)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Quyết định hành động
                  </label>
                  <select
                    value={step.action}
                    disabled={disabled}
                    onChange={(e) => handleStepChange(idx, 'action', e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 disabled:bg-slate-50 bg-white font-medium"
                  >
                    <option value="">-- Chọn hành động --</option>
                    <option value="keep_right">Giữ nửa phải (loại nửa trái và mid)</option>
                    <option value="keep_left">Giữ nửa trái (loại nửa phải và mid)</option>
                    <option value="found">Tìm thấy (dừng thuật toán)</option>
                  </select>
                </div>
              </div>

              {/* Hàng 3: Cập nhật phạm vi mới (Nếu chưa tìm thấy) */}
              {!isFound && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="block text-xs font-semibold text-slate-600 mb-2">
                    Cập nhật phạm vi tiếp theo [left, right]:
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">left mới</label>
                      <input
                        type="number"
                        value={step.newLeft}
                        disabled={disabled}
                        onChange={(e) => handleStepChange(idx, 'newLeft', e.target.value)}
                        placeholder="VD: 4"
                        className="w-full px-3 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-sky-500 disabled:bg-slate-100 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">right mới</label>
                      <input
                        type="number"
                        value={step.newRight}
                        disabled={disabled}
                        onChange={(e) => handleStepChange(idx, 'newRight', e.target.value)}
                        placeholder="VD: 7"
                        className="w-full px-3 py-1.5 text-sm border rounded-md focus:ring-2 focus:ring-sky-500 disabled:bg-slate-100 font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {!disabled && (
          <button
            type="button"
            onClick={handleAddStep}
            className="w-full py-2.5 border-2 border-dashed border-sky-300 hover:border-sky-500 hover:bg-sky-50/50 text-sky-700 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Thêm bước chạy tay tiếp theo
          </button>
        )}
      </div>

      {/* Phần Kết luận và Giải thích (1.25 điểm) */}
      <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 shadow-sm space-y-4">
        <h4 className="font-bold text-amber-900 text-sm flex items-center gap-2">
          🎯 Kết luận và Giải thích loại phạm vi
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-amber-950 mb-1">
              Chỉ số tìm thấy (Index trả về trong C++):
            </label>
            <input
              type="number"
              value={data.finalIndex}
              disabled={disabled}
              onChange={(e) => onChange({ ...data, finalIndex: e.target.value })}
              placeholder="Nhập chỉ số (từ 0 đến 7)"
              className="w-full px-3 py-2 text-sm border rounded-lg border-amber-300 focus:ring-2 focus:ring-amber-500 bg-white font-mono font-bold"
            />
            <p className="text-[11px] text-amber-700 mt-1">
              *Lưu ý: Nhập chỉ số mảng C++ (bắt đầu từ 0), không nhầm lẫn với vị trí thứ tự hay giá trị.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-amber-950 mb-1">
              Tổng số lần kiểm tra (số lần tính mid):
            </label>
            <input
              type="number"
              value={data.checkCount}
              disabled={disabled}
              onChange={(e) => onChange({ ...data, checkCount: e.target.value })}
              placeholder="VD: 3"
              className="w-full px-3 py-2 text-sm border rounded-lg border-amber-300 focus:ring-2 focus:ring-amber-500 bg-white font-mono font-bold"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-amber-950 mb-1">
            Giải thích ngắn: Vì sao khi A[mid] &lt; K, ta có thể loại bỏ được nửa bên trái (từ left đến mid)?
          </label>
          <textarea
            value={data.eliminationExplanation}
            disabled={disabled}
            onChange={(e) => onChange({ ...data, eliminationExplanation: e.target.value })}
            rows={3}
            placeholder="Ghi giải thích của nhóm: Dựa vào tính chất sắp xếp của dãy số..."
            className="w-full px-3 py-2 text-sm border rounded-lg border-amber-300 focus:ring-2 focus:ring-amber-500 bg-white resize-none leading-relaxed"
          />
        </div>
      </div>
    </div>
  );
}
