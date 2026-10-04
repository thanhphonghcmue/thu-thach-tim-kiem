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
 * Chấm một bước chạy tay theo thang điểm 1.25 điểm:
 * - left/right trước bước đúng: 0.25 đ
 * - mid đúng: 0.25 đ
 * - A[mid] đúng: 0.25 đ
 * - so sánh đúng: 0.25 đ
 * - hành động & cập nhật phạm vi (hoặc dừng nếu tìm thấy) đúng: 0.25 đ
 */
export function gradeSingleStep(step: HandTraceStep, expectedStep: typeof STANDARD_HAND_TRACE.steps[0]): StepScoreDetail {
  const feedback: string[] = [];
  
  // 1. left/right trước bước (0.25)
  const leftCorrect = matchNumber(step.left, expectedStep.left);
  const rightCorrect = matchNumber(step.right, expectedStep.right);
  const leftRightCorrect = leftCorrect && rightCorrect;
  const leftRightPts = leftRightCorrect ? 0.25 : 0;
  if (!leftRightCorrect) {
    feedback.push(`Phạm vi [left, right] ban đầu chưa đúng (chuẩn: [${expectedStep.left}, ${expectedStep.right}])`);
  }

  // 2. mid (0.25) & A[mid] (0.25)
  const midCorrect = matchNumber(step.mid, expectedStep.mid);
  const midPts = midCorrect ? 0.25 : 0;
  if (!midCorrect) {
    feedback.push(`Chỉ số mid chưa đúng (chuẩn: ${expectedStep.mid})`);
  }

  const aMidCorrect = matchNumber(step.aMid, expectedStep.aMid);
  const aMidPts = aMidCorrect ? 0.25 : 0;
  if (!aMidCorrect) {
    feedback.push(`Giá trị A[mid] chưa đúng (chuẩn: ${expectedStep.aMid})`);
  }

  // 3. So sánh (0.25)
  const comparisonCorrect = matchComparison(step.comparison, expectedStep.comparison as '<' | '=' | '>');
  const comparisonPts = comparisonCorrect ? 0.25 : 0;
  if (!comparisonCorrect) {
    feedback.push(`So sánh với K=38 chưa đúng`);
  }

  // 4. Hành động & Cập nhật mới (0.25)
  let actionCorrect = false;
  if (expectedStep.action === 'found') {
    // Bước tìm thấy: chỉ cần chọn 'found' hoặc 'tìm thấy', không bắt buộc nhập phạm vi mới
    actionCorrect = matchAction(step.action, 'found');
    if (!actionCorrect) {
      feedback.push(`Cần kết luận tìm thấy tại A[${expectedStep.mid}] và dừng`);
    }
  } else {
    // Bước chưa tìm thấy: hành động đúng VÀ cập nhật [newLeft, newRight] đúng
    const actMatch = matchAction(step.action, expectedStep.action as 'keep_left' | 'keep_right');
    const newLeftMatch = matchNumber(step.newLeft, expectedStep.newLeft);
    const newRightMatch = matchNumber(step.newRight, expectedStep.newRight);
    
    // Nếu chọn hành động đúng VÀ các giá trị cập nhật đúng
    actionCorrect = actMatch && newLeftMatch && newRightMatch;
    if (!actionCorrect) {
      if (!actMatch) feedback.push(`Hành động chưa đúng (cần giữ nửa phải / loại nửa trái)`);
      if (!newLeftMatch || !newRightMatch) {
        feedback.push(`Cập nhật phạm vi tiếp theo chưa chuẩn (chuẩn: left=${expectedStep.newLeft}, right=${expectedStep.newRight})`);
      }
    }
  }
  const actionPts = actionCorrect ? 0.25 : 0;

  const stepTotal = Number((leftRightPts + midPts + aMidPts + comparisonPts + actionPts).toFixed(2));

  return {
    stepNumber: expectedStep.stepNumber,
    leftRightCorrect,
    leftRightPts,
    midCorrect,
    midPts,
    aMidCorrect,
    aMidPts,
    comparisonCorrect,
    comparisonPts,
    actionCorrect,
    actionPts,
    stepTotal,
    feedback,
  };
}

/**
 * Đánh giá giải thích loại bỏ nửa trái (0.50 đ)
 * Quy tắc:
 * 1. Phải đề cập tính chất tăng dần của dãy, HOẶC
 * 2. Giải thích vì A[mid] < K nên các phần tử từ left đến mid đều nhỏ hơn K, không thể chứa K.
 * 3. Nếu học sinh viết có liên quan nhưng không đủ chắc chắn -> 'pending_teacher_review'
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
      feedback: 'Chưa có giải thích vì sao loại được nửa trái.',
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

  // Nhóm từ khóa chuẩn mực:
  // - Có ý về "tăng dần" / "sắp xếp"
  // - VÀ có ý về "nhỏ hơn K" / "nhỏ hơn hoặc bằng" / "<= 38"
  const hasAscending = norm.includes('tăng dần') || norm.includes('tang dan') || norm.includes('sắp xếp') || norm.includes('sap xep') || norm.includes('đã sắp');
  const hasSmaller = norm.includes('nhỏ hơn') || norm.includes('nho hon') || norm.includes('<') || norm.includes('bé hơn') || norm.includes('be hon');
  const hasLeftMid = norm.includes('nửa trái') || norm.includes('bên trái') || norm.includes('left') || norm.includes('từ 0') || norm.includes('đến mid') || norm.includes('trước mid');

  if ((hasAscending && hasSmaller) || (hasSmaller && hasLeftMid)) {
    return {
      status: 'accepted',
      pts: 0.5,
      feedback: 'Giải thích chính xác: dựa vào dãy tăng dần và giá trị nhỏ hơn K để loại nửa trái.',
    };
  }

  // Nếu có nhắc đến A[mid] < K hoặc phần tử bé hơn nhưng diễn đạt tự do
  if (norm.length > 5 && (hasSmaller || hasAscending || norm.includes('loại') || norm.includes('38'))) {
    return {
      status: 'pending_teacher_review',
      pts: 0, // Tạm tính 0, đợi giáo viên duyệt để cộng tối đa 0.50 đ
      feedback: 'Diễn đạt tự do có liên quan, đánh dấu chờ Giáo viên duyệt điểm.',
    };
  }

  return {
    status: 'rejected',
    pts: 0,
    feedback: 'Giải thích chưa nêu rõ cơ sở dãy tăng dần hoặc so sánh giá trị.',
  };
}

/**
 * Chấm toàn bộ bài chạy tay (5 điểm)
 */
export function gradeHandTrace(handData: HandTraceData): HandScoreBreakdown {
  const stepsBreakdown: StepScoreDetail[] = [];
  const standardSteps = STANDARD_HAND_TRACE.steps;

  // Chấm độc lập từng bước so với đáp án chuẩn tương ứng
  // Học sinh có thể nhập nhiều bước, nhưng ta so khớp độc lập 3 bước chuẩn
  for (let i = 0; i < standardSteps.length; i++) {
    const stdStep = standardSteps[i];
    // Tìm bước của học sinh có stepNumber = stdStep.stepNumber
    let studentStep = handData.steps.find(s => s.stepNumber === stdStep.stepNumber);
    if (!studentStep) {
      // Nếu học sinh không đánh số bước (hoặc tất cả stepNumber đều 0/trống), lấy theo index
      const hasExplicitNumbers = handData.steps.some(s => s.stepNumber === 1 || s.stepNumber === 2 || s.stepNumber === 3);
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
        comparisonCorrect: false,
        comparisonPts: 0,
        actionCorrect: false,
        actionPts: 0,
        stepTotal: 0,
        feedback: [`Chưa có dữ liệu cho bước ${stdStep.stepNumber}`],
      });
    }
  }

  // Chấm kết luận (1.25 đ)
  // 1. Chỉ số trả về 6 (0.50 đ)
  // Xử lý trường hợp học sinh ghi "vị trí thứ 7" -> quy định: chỉ số 6 mới là đúng theo C++ 0-indexed
  const rawIdx = String(handData.finalIndex || '').trim();
  const isIndex6 = matchNumber(rawIdx, STANDARD_HAND_TRACE.conclusion.finalIndex);
  const indexPts = isIndex6 ? 0.5 : 0;

  // 2. Số lần kiểm tra 3 (0.25 đ)
  const isCount3 = matchNumber(handData.checkCount, STANDARD_HAND_TRACE.conclusion.checkCount);
  const countPts = isCount3 ? 0.25 : 0;

  // 3. Giải thích (0.50 đ)
  const expResult = evaluateExplanation(handData.eliminationExplanation);

  const conclusionDetail: ConclusionScoreDetail = {
    indexCorrect: isIndex6,
    indexPts,
    countCorrect: isCount3,
    countPts,
    explanationStatus: expResult.status,
    explanationPts: expResult.pts,
    explanationFeedback: expResult.feedback,
  };

  const stepsTotal = stepsBreakdown.reduce((sum, s) => sum + s.stepTotal, 0);
  const conclusionTotal = indexPts + countPts + expResult.pts;
  const handTotal = Number(Math.min(5.0, stepsTotal + conclusionTotal).toFixed(2));

  // Điểm chờ duyệt: nếu explanation là pending_teacher_review thì còn 0.50 đ chờ duyệt
  const pendingReviewScore = expResult.status === 'pending_teacher_review' ? 0.5 : 0;

  return {
    steps: stepsBreakdown,
    conclusion: conclusionDetail,
    handTotal,
    pendingReviewScore,
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
