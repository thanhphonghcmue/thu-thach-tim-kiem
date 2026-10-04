import {
  HandTraceData,
  HandTraceStep,
  HandScoreBreakdown,
  StepScoreDetail,
  ConclusionScoreDetail,
  SubmissionScore,
} from '@/types';
import { STANDARD_HAND_TRACE, QUESTION_BANK } from '@/data/questions';
import { normalizeText } from './parser';

/**
 * Kiểm tra xem một giá trị số học sinh nhập có khớp với số mong đợi
 */
function matchNumber(val: string | number, expected: number): boolean {
  if (val === undefined || val === null || val === '') return false;
  const num = typeof val === 'number' ? val : parseInt(String(val).trim(), 10);
  return !isNaN(num) && num === expected;
}

/**
 * Kiểm tra so sánh có tương đương:
 * < tương đương nhỏ hơn, A[mid] < K, K > A[mid]
 * = tương đương bằng, A[mid] == K
 * > tương đương lớn hơn
 */
function matchComparison(val: string, expected: '<' | '=' | '>'): boolean {
  if (!val) return false;
  const v = normalizeText(val).toLowerCase();
  if (expected === '<') {
    return v === '<' || v.includes('nhỏ hơn') || v.includes('less');
  }
  if (expected === '=') {
    return v === '=' || v === '==' || v.includes('bằng') || v.includes('equal') || v.includes('tìm thấy');
  }
  if (expected === '>') {
    return v === '>' || v.includes('lớn hơn') || v.includes('greater');
  }
  return false;
}

/**
 * Kiểm tra hành động:
 * Chú ý phát hiện phủ định: "không giữ nửa phải" không phải là "giữ nửa phải"
 */
function matchAction(val: string, expected: 'keep_left' | 'keep_right' | 'found'): boolean {
  if (!val) return false;
  const v = normalizeText(val).toLowerCase();
  const hasNegation = /\b(không|khong|chẳng|chang)\b/.test(v);

  if (expected === 'keep_right') {
    if (hasNegation) return false;
    return (
      val === 'keep_right' ||
      v.includes('giữ nửa phải') ||
      v.includes('giu nua phai') ||
      v.includes('loại nửa trái') ||
      v.includes('bỏ nửa trái') ||
      v.includes('loai nua trai') ||
      v.includes('bo nua trai')
    );
  }

  if (expected === 'keep_left') {
    if (hasNegation) return false;
    return (
      val === 'keep_left' ||
      v.includes('giữ nửa trái') ||
      v.includes('giu nua trai') ||
      v.includes('loại nửa phải') ||
      v.includes('bỏ nửa phải') ||
      v.includes('loai nua phai') ||
      v.includes('bo nua phai')
    );
  }

  if (expected === 'found') {
    if (hasNegation) return false;
    return (
      val === 'found' ||
      v.includes('tìm thấy') ||
      v.includes('tim thay') ||
      v.includes('found') ||
      v.includes('trả về') ||
      v.includes('return')
    );
  }

  return false;
}

/**
 * Chấm một bước chạy tay theo thang điểm chuẩn mới:
 * Bước 1 — 2 điểm:
 * - Đúng left = 0 và right = 4: 0,5 điểm.
 * - Đúng mid = 2 và A[mid] = 8: 0,5 điểm.
 * - Đúng so sánh và chọn tìm bên phải: 0,5 điểm.
 * - Đúng cập nhật left = 3, right = 4: 0,5 điểm.
 *
 * Bước 2 — 2 điểm:
 * - Đúng left = 3 và right = 4: 0,5 điểm.
 * - Đúng mid = 3 và A[mid] = 12: 0,5 điểm.
 * - Đúng so sánh bằng K: 0,5 điểm.
 * - Chọn tìm thấy và dừng: 0,5 điểm.
 */
export function gradeSingleStep(step: HandTraceStep, expectedStep: typeof STANDARD_HAND_TRACE.steps[0]): StepScoreDetail {
  const feedback: string[] = [];
  const isStep1 = expectedStep.stepNumber === 1;

  // 1. left/right ban đầu (0.50 đ)
  const leftCorrect = matchNumber(step.left, expectedStep.left);
  const rightCorrect = matchNumber(step.right, expectedStep.right);
  const leftRightCorrect = leftCorrect && rightCorrect;
  const leftRightPts = leftRightCorrect ? 0.5 : (leftCorrect || rightCorrect ? 0.25 : 0);
  if (!leftRightCorrect) {
    feedback.push(`Phạm vi [left, right] ban đầu chưa đúng (chuẩn: [${expectedStep.left}, ${expectedStep.right}])`);
  }

  // 2. mid & A[mid] (0.50 đ: 0.25 + 0.25)
  const midCorrect = matchNumber(step.mid, expectedStep.mid);
  const aMidCorrect = matchNumber(step.aMid, expectedStep.aMid);
  const midValCorrect = midCorrect && aMidCorrect;
  const midPts = midCorrect ? 0.25 : 0;
  const aMidPts = aMidCorrect ? 0.25 : 0;
  const midValPts = Number((midPts + aMidPts).toFixed(2));
  if (!midCorrect) {
    feedback.push(`Chỉ số mid chưa đúng (chuẩn: ${expectedStep.mid})`);
  }
  if (!aMidCorrect) {
    feedback.push(`Giá trị A[mid] chưa đúng (chuẩn: ${expectedStep.aMid})`);
  }

  // 3 & 4: So sánh và Hành động / Cập nhật phạm vi
  let comparisonCorrect = false;
  let comparisonPts = 0;
  let actionCorrect = false;
  let actionPts = 0;

  if (isStep1) {
    // Bước 1:
    // Tiêu chí 3: Đúng so sánh (<) và chọn tìm bên phải (0.5 đ)
    const compMatch = matchComparison(step.comparison, '<');
    const actMatch = matchAction(step.action, 'keep_right');
    comparisonCorrect = compMatch && actMatch;
    comparisonPts = comparisonCorrect ? 0.5 : (compMatch ? 0.25 : (actMatch ? 0.25 : 0));
    if (!comparisonCorrect) {
      if (!compMatch) feedback.push('So sánh với K=12 chưa đúng (A[2] = 8 < 12)');
      if (!actMatch) feedback.push('Hành động chưa đúng (vì 8 < 12 nên cần tìm tiếp bên phải)');
    }

    // Tiêu chí 4: Đúng cập nhật left = 3, right = 4 (0.5 đ)
    const newLeftMatch = matchNumber(step.newLeft, expectedStep.newLeft);
    const newRightMatch = matchNumber(step.newRight, expectedStep.newRight);
    actionCorrect = newLeftMatch && newRightMatch;
    actionPts = actionCorrect ? 0.5 : (newLeftMatch || newRightMatch ? 0.25 : 0);
    if (!actionCorrect) {
      feedback.push(`Cập nhật phạm vi tiếp theo chưa đúng (chuẩn: left=${expectedStep.newLeft}, right=${expectedStep.newRight})`);
    }
  } else {
    // Bước 2:
    // Tiêu chí 3: Đúng so sánh bằng K (0.5 đ)
    comparisonCorrect = matchComparison(step.comparison, '=');
    comparisonPts = comparisonCorrect ? 0.5 : 0;
    if (!comparisonCorrect) {
      feedback.push('So sánh chưa đúng (A[3] = 12 = K, cần chọn bằng K)');
    }

    // Tiêu chí 4: Chọn tìm thấy và dừng (0.5 đ)
    actionCorrect = matchAction(step.action, 'found');
    actionPts = actionCorrect ? 0.5 : 0;
    if (!actionCorrect) {
      feedback.push(`Cần chọn tìm thấy tại A[${expectedStep.mid}] và dừng thuật toán`);
    }
  }

  const stepTotal = Number((leftRightPts + midValPts + comparisonPts + actionPts).toFixed(2));

  return {
    stepNumber: expectedStep.stepNumber,
    leftRightCorrect,
    leftRightPts,
    midCorrect,
    midPts,
    aMidCorrect,
    aMidPts,
    midValCorrect,
    midValPts,
    comparisonCorrect,
    comparisonPts,
    actionCorrect,
    actionPts,
    stepTotal,
    feedback,
  };
}

/**
 * Đánh giá giải thích loại bỏ nửa trái (ghi nhận sư phạm)
 */
export function evaluateExplanation(explanation: string): {
  status: 'accepted' | 'pending_teacher_review' | 'rejected';
  pts: number;
  feedback: string;
} {
  if (!explanation || explanation.trim() === '') {
    return {
      status: 'rejected',
      pts: 0,
      feedback: 'Chưa có ghi chú giải thích thêm.',
    };
  }

  const norm = normalizeText(explanation).toLowerCase();

  // Phát hiện phủ định vô căn cứ
  if (norm.includes('không loại') || norm.includes('sai đề')) {
    return {
      status: 'rejected',
      pts: 0,
      feedback: 'Giải thích không phù hợp với quy tắc thuật toán.',
    };
  }

  const hasAscending = norm.includes('tăng dần') || norm.includes('tang dan') || norm.includes('sắp xếp') || norm.includes('sap xep') || norm.includes('đã sắp');
  const hasSmaller = norm.includes('nhỏ hơn') || norm.includes('nho hon') || norm.includes('<') || norm.includes('bé hơn') || norm.includes('be hon');
  const hasLeftMid = norm.includes('nửa trái') || norm.includes('bên trái') || norm.includes('left') || norm.includes('từ 0') || norm.includes('đến mid') || norm.includes('trước mid');

  if ((hasAscending && hasSmaller) || (hasSmaller && hasLeftMid)) {
    return {
      status: 'accepted',
      pts: 0,
      feedback: 'Giải thích chính xác: dựa vào dãy tăng dần và giá trị nhỏ hơn K để loại nửa trái.',
    };
  }

  if (norm.length > 5 && (hasSmaller || hasAscending || norm.includes('loại') || norm.includes('12') || norm.includes('38'))) {
    return {
      status: 'pending_teacher_review',
      pts: 0,
      feedback: 'Diễn đạt tự do có liên quan, đánh dấu để Giáo viên theo dõi.',
    };
  }

  return {
    status: 'rejected',
    pts: 0,
    feedback: 'Giải thích chưa nêu rõ cơ sở dãy tăng dần hoặc so sánh giá trị.',
  };
}

/**
 * Chấm toàn bộ bài chạy tay (Tổng 5.0 điểm):
 * - Bước 1: 2.0 điểm
 * - Bước 2: 2.0 điểm
 * - Kết luận: 1.0 điểm (Chỉ số 3: 0.5 đ; Số lần kiểm tra 2: 0.5 đ)
 * Chấm độc lập từng tiêu chí; sai bước 1 vẫn chấm bước 2 bình thường.
 */
export function gradeHandTrace(handData: HandTraceData): HandScoreBreakdown {
  const stepsBreakdown: StepScoreDetail[] = [];
  const standardSteps = STANDARD_HAND_TRACE.steps;

  // Chấm độc lập từng bước so với đáp án chuẩn tương ứng
  for (let i = 0; i < standardSteps.length; i++) {
    const stdStep = standardSteps[i];
    let studentStep = handData.steps.find(s => s.stepNumber === stdStep.stepNumber);
    if (!studentStep) {
      const hasExplicitNumbers = handData.steps.some(s => s.stepNumber === 1 || s.stepNumber === 2);
      if (!hasExplicitNumbers && handData.steps[i]) {
        studentStep = handData.steps[i];
      }
    }

    if (studentStep) {
      stepsBreakdown.push(gradeSingleStep(studentStep, stdStep));
    } else {
      stepsBreakdown.push({
        stepNumber: stdStep.stepNumber,
        leftRightCorrect: false,
        leftRightPts: 0,
        midCorrect: false,
        midPts: 0,
        aMidCorrect: false,
        aMidPts: 0,
        midValCorrect: false,
        midValPts: 0,
        comparisonCorrect: false,
        comparisonPts: 0,
        actionCorrect: false,
        actionPts: 0,
        stepTotal: 0,
        feedback: [`Chưa có dữ liệu cho bước ${stdStep.stepNumber}`],
      });
    }
  }

  // Kết luận — 1 điểm:
  // 1. Đúng chỉ số 3: 0,5 điểm
  const rawIdx = String(handData.finalIndex || '').trim();
  const isIndex3 = matchNumber(rawIdx, STANDARD_HAND_TRACE.conclusion.finalIndex);
  const indexPts = isIndex3 ? 0.5 : 0;

  // 2. Đúng 2 lần kiểm tra: 0,5 điểm
  const isCount2 = matchNumber(handData.checkCount, STANDARD_HAND_TRACE.conclusion.checkCount);
  const countPts = isCount2 ? 0.5 : 0;

  const expResult = evaluateExplanation(handData.eliminationExplanation);

  const conclusionDetail: ConclusionScoreDetail = {
    indexCorrect: isIndex3,
    indexPts,
    countCorrect: isCount2,
    countPts,
    explanationStatus: expResult.status,
    explanationPts: 0,
    explanationFeedback: expResult.feedback,
  };

  const stepsTotal = stepsBreakdown.reduce((sum, s) => sum + s.stepTotal, 0);
  const conclusionTotal = Number((indexPts + countPts).toFixed(2));
  const handTotal = Number(Math.min(5.0, stepsTotal + conclusionTotal).toFixed(2));

  return {
    steps: stepsBreakdown,
    conclusion: conclusionDetail,
    handTotal,
    pendingReviewScore: 0,
  };
}

/**
 * Chấm trọn gói cả bài nộp (MCQ 5 đ + Chạy tay 5 đ = Tổng 10 đ)
 */
export function gradeSubmission(
  mcqAnswers: Record<string, string>,
  handData: HandTraceData,
  selectedQuestionIds: string[]
): SubmissionScore {
  let mcqScore = 0;
  const mcqBreakdown: SubmissionScore['mcqBreakdown'] = {};

  // Chấm từng câu MCQ đã chọn
  for (const qId of selectedQuestionIds) {
    const question = QUESTION_BANK.find(q => q.id === qId);
    if (!question) continue;

    const studentChoice = mcqAnswers[qId];
    const isCorrect = studentChoice === question.correctOptionId;
    const points = isCorrect ? 1.0 : 0.0;
    mcqScore += points;

    mcqBreakdown[qId] = {
      isCorrect,
      points,
      selectedOptionId: studentChoice || '',
      correctOptionId: question.correctOptionId,
      explanation: question.explanation,
    };
  }

  mcqScore = Number(Math.min(5.0, mcqScore).toFixed(2));

  // Chấm bài chạy tay
  const handBreakdown = gradeHandTrace(handData);
  const handScore = handBreakdown.handTotal;

  // Tổng điểm
  const totalScore = Number(Math.min(10.0, mcqScore + handScore).toFixed(2));
  const pendingReviewScore = handBreakdown.pendingReviewScore;

  return {
    mcqScore,
    handScore,
    totalScore,
    pendingReviewScore,
    mcqBreakdown,
    handBreakdown,
  };
}
