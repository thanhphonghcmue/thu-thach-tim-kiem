'use client';

import React from 'react';
import { SubmissionScore } from '@/types';
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

interface RubricScoreBreakdownProps {
  score: SubmissionScore;
  showTeacherTools?: boolean;
  onApproveExplanation?: (pts: number, reason: string) => void;
}

export default function RubricScoreBreakdown({
  score,
  showTeacherTools = false,
  onApproveExplanation,
}: RubricScoreBreakdownProps) {
  const { mcqScore, handScore, totalScore, pendingReviewScore, mcqBreakdown, handBreakdown } = score;
  const conc = handBreakdown.conclusion;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-6 p-6">
      {/* Khung tổng điểm */}
      <div className="bg-gradient-to-r from-sky-600 to-teal-600 rounded-xl p-5 text-white flex flex-wrap items-center justify-between gap-4 shadow-md">
        <div>
          <span className="text-xs uppercase tracking-wider text-sky-100 font-semibold block">
            Kết quả đánh giá theo tiêu chí Rubric
          </span>
          <div className="text-3xl font-extrabold flex items-baseline gap-2 mt-1">
            <span>{totalScore.toFixed(2)}</span>
            <span className="text-lg font-normal text-sky-200">/ 10.00 điểm</span>
          </div>
          {pendingReviewScore > 0 && (
            <div className="mt-2 text-xs font-medium text-amber-200 bg-amber-900/30 px-2.5 py-1 rounded inline-flex items-center gap-1.5 border border-amber-300/30">
              <Clock className="w-3.5 h-3.5" />
              Điểm hiện tại: {totalScore.toFixed(2)}/10; còn {pendingReviewScore.toFixed(2)} điểm giải thích chờ giáo viên duyệt.
            </div>
          )}
        </div>

        <div className="flex gap-4">
          <div className="text-center bg-white/10 backdrop-blur px-4 py-2.5 rounded-lg border border-white/20">
            <span className="text-xs text-sky-100 block">Trắc nghiệm</span>
            <strong className="text-xl font-bold">{mcqScore.toFixed(2)} / 5</strong>
          </div>
          <div className="text-center bg-white/10 backdrop-blur px-4 py-2.5 rounded-lg border border-white/20">
            <span className="text-xs text-sky-100 block">Chạy tay</span>
            <strong className="text-xl font-bold">{handScore.toFixed(2)} / 5</strong>
          </div>
        </div>
      </div>

      {/* Chi tiết phần 1: Trắc nghiệm (5 điểm) */}
      <div className="space-y-3">
        <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b pb-2">
          📝 Phần 1: Trắc nghiệm kiến thức (5.00 điểm)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(mcqBreakdown).map(([qId, item], idx) => (
            <div
              key={qId}
              className={`p-3.5 rounded-xl border text-xs flex flex-col justify-between ${
                item.isCorrect
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50/70 border-rose-200 text-rose-900'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <span className="font-bold">Câu {idx + 1}</span>
                <span className="flex items-center gap-1 font-semibold">
                  {item.isCorrect ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      +1.00 đ
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-rose-600" />
                      0.00 đ
                    </>
                  )}
                </span>
              </div>
              {item.explanation && (
                <p className="text-[11px] text-slate-600 mt-1 italic bg-white/80 p-2 rounded border border-slate-100">
                  💡 {item.explanation}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Chi tiết phần 2: Bài chạy tay (5 điểm) */}
      <div className="space-y-4">
        <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b pb-2">
          🔍 Phần 2: Chạy tay thuật toán Nhị phân (5.00 điểm)
        </h4>

        {/* 3 Bước chạy tay (1.25 đ mỗi bước) */}
        <div className="space-y-3">
          {handBreakdown.steps.map((st) => (
            <div key={st.stepNumber} className="border border-slate-200 rounded-xl p-4 bg-slate-50/60">
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-200">
                <span className="font-bold text-slate-700 text-xs">
                  Bước {st.stepNumber} (Tối đa 1.25 đ)
                </span>
                <span className="font-bold text-xs text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded border border-sky-200">
                  {st.stepTotal.toFixed(2)} / 1.25 đ
                </span>
              </div>

              {/* Từng tiêu chí nhỏ */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className={`p-2 rounded border ${st.leftRightCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                  <span className="text-[11px] text-slate-500 block">left, right ban đầu (0.25đ)</span>
                  <strong className={st.leftRightCorrect ? 'text-emerald-700' : 'text-rose-700'}>
                    {st.leftRightPts.toFixed(2)} đ
                  </strong>
                </div>

                <div className={`p-2 rounded border ${st.midCorrect && st.aMidCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                  <span className="text-[11px] text-slate-500 block">mid & A[mid] (0.50đ)</span>
                  <strong className={st.midCorrect && st.aMidCorrect ? 'text-emerald-700' : 'text-rose-700'}>
                    {(st.midPts + st.aMidPts).toFixed(2)} đ
                  </strong>
                </div>

                <div className={`p-2 rounded border ${st.comparisonCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                  <span className="text-[11px] text-slate-500 block">So sánh với K (0.25đ)</span>
                  <strong className={st.comparisonCorrect ? 'text-emerald-700' : 'text-rose-700'}>
                    {st.comparisonPts.toFixed(2)} đ
                  </strong>
                </div>

                <div className={`p-2 rounded border ${st.actionCorrect ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                  <span className="text-[11px] text-slate-500 block">Hành động / Dừng (0.25đ)</span>
                  <strong className={st.actionCorrect ? 'text-emerald-700' : 'text-rose-700'}>
                    {st.actionPts.toFixed(2)} đ
                  </strong>
                </div>
              </div>

              {st.feedback.length > 0 && (
                <div className="mt-2 text-[11px] text-rose-600 bg-rose-50 p-2 rounded">
                  {st.feedback.map((fb, fIdx) => (
                    <p key={fIdx}>• {fb}</p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Kết luận & Giải thích (1.25 đ) */}
        <div className="border border-amber-200 bg-amber-50/40 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-amber-200">
            <span className="font-bold text-amber-950 text-xs">
              Kết luận & Giải thích loại phạm vi (Tối đa 1.25 đ)
            </span>
            <span className="font-bold text-xs text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded border border-amber-300">
              {(conc.indexPts + conc.countPts + conc.explanationPts).toFixed(2)} / 1.25 đ
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div className={`p-2.5 rounded border bg-white ${conc.indexCorrect ? 'border-emerald-300 text-emerald-800' : 'border-rose-300 text-rose-800'}`}>
              <span className="text-[11px] text-slate-500 block">Chỉ số 6 (0.50đ)</span>
              <strong>{conc.indexPts.toFixed(2)} đ</strong>
            </div>

            <div className={`p-2.5 rounded border bg-white ${conc.countCorrect ? 'border-emerald-300 text-emerald-800' : 'border-rose-300 text-rose-800'}`}>
              <span className="text-[11px] text-slate-500 block">Số lần 3 (0.25đ)</span>
              <strong>{conc.countPts.toFixed(2)} đ</strong>
            </div>

            <div className={`p-2.5 rounded border bg-white ${
              conc.explanationStatus === 'accepted'
                ? 'border-emerald-300 text-emerald-800'
                : conc.explanationStatus === 'pending_teacher_review'
                ? 'border-amber-400 text-amber-900 bg-amber-50'
                : 'border-rose-300 text-rose-800'
            }`}>
              <span className="text-[11px] text-slate-500 block">Giải thích (0.50đ)</span>
              <strong>
                {conc.explanationStatus === 'pending_teacher_review'
                  ? 'Chờ duyệt (+0.50 đ)'
                  : `${conc.explanationPts.toFixed(2)} đ`}
              </strong>
            </div>
          </div>

          <div className="text-xs bg-white p-3 rounded-lg border border-amber-200 text-slate-700">
            <span className="font-semibold block text-slate-800 mb-1">Nhận xét hệ thống:</span>
            <p>{conc.explanationFeedback}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
