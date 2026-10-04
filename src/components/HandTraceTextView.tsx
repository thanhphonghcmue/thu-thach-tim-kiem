'use client';

import React, { useState, useEffect } from 'react';
import { HandTraceData } from '@/types';
import { formatHandTraceToText, parseHandTraceText } from '@/lib/parser';
import { FileText, RefreshCw, CheckCircle2 } from 'lucide-react';

interface HandTraceTextViewProps {
  data: HandTraceData;
  onApplyParsed: (newData: HandTraceData) => void;
  disabled?: boolean;
}

export default function HandTraceTextView({
  data,
  onApplyParsed,
  disabled = false,
}: HandTraceTextViewProps) {
  const [rawText, setRawText] = useState('');
  const [previewData, setPreviewData] = useState<HandTraceData>(data);
  const [syncNotice, setSyncNotice] = useState('');

  // Tự động đồng bộ văn bản từ dữ liệu bài làm khi mở chế độ B
  useEffect(() => {
    const formatted = formatHandTraceToText(data);
    setRawText(formatted);
    setPreviewData(data);
  }, [data]);

  const handleTextChange = (text: string) => {
    setRawText(text);
    const { data: parsed } = parseHandTraceText(text);
    setPreviewData(parsed);
  };

  const handleApply = () => {
    onApplyParsed(previewData);
    setSyncNotice('Đã đồng bộ sang chế độ nhập theo bước!');
    setTimeout(() => setSyncNotice(''), 3000);
  };

  return (
    <div className="space-y-4">
      <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 text-xs text-sky-900 leading-relaxed">
        <span className="font-bold flex items-center gap-1.5 text-sky-950 mb-1">
          <FileText className="w-4 h-4 text-sky-600" />
          Quy cách viết nhật kí văn bản:
        </span>
        <p>• Dòng bước: <code>B1: l=0, r=7, m=3, A[m]=12; 12&lt;38; giữ nửa phải; l=4, r=7</code></p>
        <p>• Bước tìm thấy: <code>B3: l=6, r=7, m=6, A[m]=38; 38=38; tìm thấy</code></p>
        <p>• Dòng kết luận: <code>Kết quả: chỉ số 6, kiểm tra 3 lần</code></p>
        <p>• Dòng giải thích: <code>Giải thích: vì dãy tăng dần nên loại nửa trái...</code></p>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-700">
          Nhập hoặc dán nhật kí chạy tay:
        </label>
        <textarea
          value={rawText}
          disabled={disabled}
          onChange={(e) => handleTextChange(e.target.value)}
          rows={8}
          placeholder="Nhập nhật kí chạy tay tại đây..."
          className="w-full p-3.5 text-sm font-mono border rounded-xl border-slate-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white leading-relaxed resize-y"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleApply}
          disabled={disabled}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Phân tích & Đồng bộ vào bài làm
        </button>

        {syncNotice && (
          <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {syncNotice}
          </span>
        )}
      </div>

      {/* Xem trước kết quả phân tích */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <span className="text-xs font-bold text-slate-700 block mb-2">
          Kết quả hệ thống nhận diện từ nhật kí:
        </span>
        <div className="text-xs font-mono space-y-1.5 text-slate-600">
          <p>• Số bước phân tích: <strong>{previewData.steps.length} bước</strong></p>
          <p>• Chỉ số tìm thấy: <strong>{previewData.finalIndex || '(chưa nhận diện)'}</strong></p>
          <p>• Số lần kiểm tra: <strong>{previewData.checkCount || '(chưa nhận diện)'}</strong></p>
          <p>• Giải thích: <em>{previewData.eliminationExplanation || '(chưa có)'}</em></p>
        </div>
      </div>
    </div>
  );
}
