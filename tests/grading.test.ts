import test from 'node:test';
import assert from 'node:assert/strict';
import { gradeSubmission, gradeHandTrace, evaluateExplanation } from '../src/lib/grading';
import { parseHandTraceText } from '../src/lib/parser';
import { STANDARD_HAND_TRACE } from '../src/data/questions';
import { HandTraceData } from '../src/types';

test('1. Đáp án hoàn toàn đúng đạt 10/10 điểm', () => {
  const perfectMcq = {
    'mcq-1': 'opt-1-a',
    'mcq-2': 'opt-2-c',
    'mcq-3': 'opt-3-b',
    'mcq-4': 'opt-4-b',
    'mcq-5': 'opt-5-a',
  };

  const perfectHand: HandTraceData = {
    steps: [
      {
        stepNumber: 1,
        left: 0,
        right: 7,
        mid: 3,
        aMid: 12,
        comparison: '<',
        action: 'keep_right',
        newLeft: 4,
        newRight: 7,
      },
      {
        stepNumber: 2,
        left: 4,
        right: 7,
        mid: 5,
        aMid: 23,
        comparison: '<',
        action: 'keep_right',
        newLeft: 6,
        newRight: 7,
      },
      {
        stepNumber: 3,
        left: 6,
        right: 7,
        mid: 6,
        aMid: 38,
        comparison: '=',
        action: 'found',
        newLeft: '',
        newRight: '',
      },
    ],
    finalIndex: 6,
    checkCount: 3,
    eliminationExplanation: 'Dãy tăng dần nên các phần tử từ 0 đến mid đều nhỏ hơn hoặc bằng A[mid] < K, loại nửa trái.',
  };

  const selectedQuestions = ['mcq-1', 'mcq-2', 'mcq-3', 'mcq-4', 'mcq-5'];
  const score = gradeSubmission(perfectMcq, perfectHand, selectedQuestions);

  assert.equal(score.mcqScore, 5.0, 'MCQ phải đạt 5.0');
  assert.equal(score.handScore, 5.0, 'Chạy tay phải đạt 5.0');
  assert.equal(score.totalScore, 10.0, 'Tổng điểm phải đạt 10.0');
  assert.equal(score.pendingReviewScore, 0.0, 'Không còn điểm chờ duyệt');
});

test('2. Sai một trường chỉ mất điểm của đúng tiêu chí đó (không mất toàn bộ)', () => {
  // Sai mid ở bước 1 (nhập mid=2 thay vì 3), các phần khác đúng
  const handWithWrongMid: HandTraceData = {
    steps: [
      {
        stepNumber: 1,
        left: 0,
        right: 7,
        mid: 2, // SAI: -0.25đ
        aMid: 12,
        comparison: '<',
        action: 'keep_right',
        newLeft: 4,
        newRight: 7,
      },
      {
        stepNumber: 2,
        left: 4,
        right: 7,
        mid: 5,
        aMid: 23,
        comparison: '<',
        action: 'keep_right',
        newLeft: 6,
        newRight: 7,
      },
      {
        stepNumber: 3,
        left: 6,
        right: 7,
        mid: 6,
        aMid: 38,
        comparison: '=',
        action: 'found',
        newLeft: '',
        newRight: '',
      },
    ],
    finalIndex: 6,
    checkCount: 3,
    eliminationExplanation: 'Dãy tăng dần nên phần tử bên trái nhỏ hơn K.',
  };

  const breakdown = gradeHandTrace(handWithWrongMid);
  const step1 = breakdown.steps[0];

  assert.equal(step1.midCorrect, false, 'mid phải bị đánh dấu sai');
  assert.equal(step1.midPts, 0, 'mid sai nhận 0đ');
  assert.equal(step1.leftRightCorrect, true, 'left/right vẫn được điểm');
  assert.equal(step1.leftRightPts, 0.25, 'left/right được 0.25');
  assert.equal(step1.aMidCorrect, true, 'aMid được 0.25');
  assert.equal(step1.stepTotal, 1.0, 'Bước 1 đạt 1.00 / 1.25');
  assert.equal(breakdown.handTotal, 4.75, 'Tổng bài chạy tay đạt 4.75 / 5.00');
});

test('3. Sai bước 1, bước 2 đúng vẫn được trọn điểm bước 2', () => {
  const hand: HandTraceData = {
    steps: [
      {
        stepNumber: 1,
        left: 1, // Sai
        right: 5, // Sai
        mid: 2, // Sai
        aMid: 8, // Sai
        comparison: '>', // Sai
        action: 'keep_left', // Sai
        newLeft: 1,
        newRight: 2,
      },
      {
        stepNumber: 2,
        left: 4,
        right: 7,
        mid: 5,
        aMid: 23,
        comparison: '<',
        action: 'keep_right',
        newLeft: 6,
        newRight: 7,
      },
      {
        stepNumber: 3,
        left: 6,
        right: 7,
        mid: 6,
        aMid: 38,
        comparison: '=',
        action: 'found',
        newLeft: '',
        newRight: '',
      },
    ],
    finalIndex: 6,
    checkCount: 3,
    eliminationExplanation: 'Dãy tăng dần nên bên trái nhỏ hơn K.',
  };

  const breakdown = gradeHandTrace(hand);
  assert.equal(breakdown.steps[0].stepTotal, 0, 'Bước 1 sai hết nhận 0đ');
  assert.equal(breakdown.steps[1].stepTotal, 1.25, 'Bước 2 chuẩn đáp án nhận đủ 1.25đ');
});

test('4. Phân biệt "giữ nửa phải" và "bỏ nửa phải" hoặc phủ định', () => {
  const stepKeepRight: any = {
    stepNumber: 1,
    left: 0,
    right: 7,
    mid: 3,
    aMid: 12,
    comparison: '<',
    action: 'keep_right', // Đúng
    newLeft: 4,
    newRight: 7,
  };
  const stepDiscardRight: any = {
    stepNumber: 1,
    left: 0,
    right: 7,
    mid: 3,
    aMid: 12,
    comparison: '<',
    action: 'keep_left', // SAI (bỏ nửa phải = giữ nửa trái)
    newLeft: 4,
    newRight: 7,
  };

  const b1 = gradeHandTrace({ steps: [stepKeepRight], finalIndex: '', checkCount: '', eliminationExplanation: '' });
  const b2 = gradeHandTrace({ steps: [stepDiscardRight], finalIndex: '', checkCount: '', eliminationExplanation: '' });

  assert.equal(b1.steps[0].actionCorrect, true, 'Giữ nửa phải là đúng');
  assert.equal(b2.steps[0].actionCorrect, false, 'Bỏ nửa phải / giữ nửa trái là sai');
});

test('5. Không nhầm chỉ số 6 với giá trị 38 hoặc số lần 3', () => {
  const handWrongIndex: HandTraceData = {
    steps: [],
    finalIndex: 38, // Nhầm giá trị với chỉ số
    checkCount: 6,  // Nhầm chỉ số với số lần kiểm tra
    eliminationExplanation: '',
  };

  const breakdown = gradeHandTrace(handWrongIndex);
  assert.equal(breakdown.conclusion.indexCorrect, false, 'finalIndex 38 không được chấm đúng');
  assert.equal(breakdown.conclusion.indexPts, 0);
  assert.equal(breakdown.conclusion.countCorrect, false, 'checkCount 6 không được chấm đúng');
  assert.equal(breakdown.conclusion.countPts, 0);
});

test('6. Bước tìm thấy không bắt buộc nhập phạm vi mới', () => {
  const step3: any = {
    stepNumber: 3,
    left: 6,
    right: 7,
    mid: 6,
    aMid: 38,
    comparison: '=',
    action: 'found',
    newLeft: '', // Không nhập newLeft/newRight vì đã tìm thấy
    newRight: '',
  };

  const breakdown = gradeHandTrace({ steps: [step3], finalIndex: 6, checkCount: 3, eliminationExplanation: '' });
  assert.equal(breakdown.steps[2].actionCorrect, true, 'Bước tìm thấy không yêu cầu newLeft/newRight');
  assert.equal(breakdown.steps[2].actionPts, 0.25);
});

test('7. Diễn đạt tự do chưa chắc chắn được đánh dấu Cần giáo viên duyệt', () => {
  const res = evaluateExplanation('Em thấy 12 nhỏ hơn 38 nên bỏ các số phía trước');
  assert.equal(res.status, 'pending_teacher_review', 'Phải chuyển sang pending_teacher_review');
  assert.equal(res.pts, 0, 'Chưa cộng điểm tự động');

  const emptyRes = evaluateExplanation('');
  assert.equal(emptyRes.status, 'rejected', 'Bỏ trống bị từ chối');
});

test('8. Parser phân tích chuỗi văn bản nhận diện l, r, m, a_mid và các dấu', () => {
  const text = `
    B1: l=0, r=7, m=3, A[m]=12; 12<38; giữ nửa phải; l=4, r=7
    B2: l=4, r=7, m=5, A[m]=23; 23 < 38; giữ nửa phải; l=6, r=7
    B3: l=6, r=7, m=6, A[m]=38; 38=38; tìm thấy
    Kết quả: chỉ số 6, kiểm tra 3 lần
    Giải thích: vì dãy tăng dần nên mọi phần tử bên trái đều nhỏ hơn 38
  `;

  const { data } = parseHandTraceText(text);
  assert.equal(data.steps.length, 3, 'Phải parse được 3 bước');
  assert.equal(data.steps[0].left, '0');
  assert.equal(data.steps[0].mid, '3');
  assert.equal(data.steps[0].aMid, '12');
  assert.equal(data.steps[0].action, 'keep_right');
  assert.equal(data.finalIndex, '6');
  assert.equal(data.checkCount, '3');
});
