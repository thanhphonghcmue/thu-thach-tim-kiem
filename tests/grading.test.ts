import test from 'node:test';
import assert from 'node:assert/strict';
import { gradeSubmission, gradeHandTrace, evaluateExplanation } from '../src/lib/grading';
import { parseHandTraceText } from '../src/lib/parser';
import { STANDARD_HAND_TRACE } from '../src/data/questions';
import { HandTraceData } from '../src/types';

test('1. Đáp án hoàn toàn đúng bài mới (A=[2,5,8,12,16], K=12) đạt 10/10 điểm', () => {
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
        right: 4,
        mid: 2,
        aMid: 8,
        comparison: '<',
        action: 'keep_right',
        newLeft: 3,
        newRight: 4,
      },
      {
        stepNumber: 2,
        left: 3,
        right: 4,
        mid: 3,
        aMid: 12,
        comparison: '=',
        action: 'found',
        newLeft: '',
        newRight: '',
      },
    ],
    finalIndex: 3,
    checkCount: 2,
    eliminationExplanation: 'Dãy tăng dần nên các phần tử từ 0 đến mid đều nhỏ hơn hoặc bằng 8 < 12, loại nửa trái.',
  };

  const selectedQuestions = ['mcq-1', 'mcq-2', 'mcq-3', 'mcq-4', 'mcq-5'];
  const score = gradeSubmission(perfectMcq, perfectHand, selectedQuestions);

  assert.equal(score.mcqScore, 5.0, 'MCQ phải đạt 5.0');
  assert.equal(score.handScore, 5.0, 'Chạy tay phải đạt 5.0');
  assert.equal(score.totalScore, 10.0, 'Tổng điểm phải đạt 10.0');
  assert.equal(score.handBreakdown.steps[0].stepTotal, 2.0, 'Bước 1 đạt 2.0/2.0');
  assert.equal(score.handBreakdown.steps[1].stepTotal, 2.0, 'Bước 2 đạt 2.0/2.0');
  assert.equal(score.handBreakdown.conclusion.indexPts + score.handBreakdown.conclusion.countPts, 1.0, 'Kết luận đạt 1.0/1.0');
});

test('2. Thang điểm chi tiết Bước 1 (Tổng 2.0 điểm: 4 tiêu chí x 0.5 điểm)', () => {
  // Đúng left=0, right=4 (0.5đ); sai mid (nhập mid=1 thay vì 2); đúng so sánh/chọn bên phải (0.5đ); đúng cập nhật (0.5đ)
  const hand: HandTraceData = {
    steps: [
      {
        stepNumber: 1,
        left: 0,
        right: 4,
        mid: 1, // SAI
        aMid: 8, // ĐÚNG (0.25đ)
        comparison: '<',
        action: 'keep_right', // Cả hai đúng: 0.5đ
        newLeft: 3,
        newRight: 4, // Cả hai đúng: 0.5đ
      },
      {
        stepNumber: 2,
        left: 3,
        right: 4,
        mid: 3,
        aMid: 12,
        comparison: '=',
        action: 'found',
        newLeft: '',
        newRight: '',
      },
    ],
    finalIndex: 3,
    checkCount: 2,
    eliminationExplanation: '',
  };

  const breakdown = gradeHandTrace(hand);
  const step1 = breakdown.steps[0];

  assert.equal(step1.leftRightCorrect, true);
  assert.equal(step1.leftRightPts, 0.5);
  assert.equal(step1.midCorrect, false);
  assert.equal(step1.midPts, 0);
  assert.equal(step1.aMidCorrect, true);
  assert.equal(step1.aMidPts, 0.25);
  assert.equal(step1.comparisonCorrect, true);
  assert.equal(step1.comparisonPts, 0.5);
  assert.equal(step1.actionCorrect, true);
  assert.equal(step1.actionPts, 0.5);
  assert.equal(step1.stepTotal, 1.75, 'Bước 1 đạt 1.75 / 2.0');
});

test('3. Sai bước 1 vẫn chấm bước 2 bình thường và đạt trọn 2.0 điểm', () => {
  const hand: HandTraceData = {
    steps: [
      {
        stepNumber: 1,
        left: 99, // Sai toàn bộ
        right: 99,
        mid: 99,
        aMid: 99,
        comparison: '>',
        action: 'keep_left',
        newLeft: 99,
        newRight: 99,
      },
      {
        stepNumber: 2,
        left: 3, // Đúng
        right: 4, // Đúng
        mid: 3, // Đúng
        aMid: 12, // Đúng
        comparison: '=', // Đúng
        action: 'found', // Đúng
        newLeft: '',
        newRight: '',
      },
    ],
    finalIndex: 3,
    checkCount: 2,
    eliminationExplanation: '',
  };

  const breakdown = gradeHandTrace(hand);
  assert.equal(breakdown.steps[0].stepTotal, 0, 'Bước 1 sai hết nhận 0đ');
  assert.equal(breakdown.steps[1].stepTotal, 2.0, 'Bước 2 đúng toàn bộ nhận đủ 2.0đ');
  assert.equal(breakdown.steps[1].leftRightPts, 0.5);
  assert.equal(breakdown.steps[1].midValPts, 0.5);
  assert.equal(breakdown.steps[1].comparisonPts, 0.5);
  assert.equal(breakdown.steps[1].actionPts, 0.5);
});

test('4. Phân biệt rõ: 12 là giá trị, 3 là chỉ số, 2 là số lần kiểm tra', () => {
  // Học sinh nhầm lẫn nhập 12 vào chỉ số
  const handConfused: HandTraceData = {
    steps: [],
    finalIndex: 12, // Nhầm giá trị K=12 với chỉ số (chuẩn là 3)
    checkCount: 3,  // Nhầm chỉ số 3 với số lần kiểm tra (chuẩn là 2)
    eliminationExplanation: '',
  };

  const breakdown = gradeHandTrace(handConfused);
  assert.equal(breakdown.conclusion.indexCorrect, false, 'Chỉ số 12 phải bị chấm sai');
  assert.equal(breakdown.conclusion.indexPts, 0);
  assert.equal(breakdown.conclusion.countCorrect, false, 'Số lần 3 phải bị chấm sai (chuẩn là 2)');
  assert.equal(breakdown.conclusion.countPts, 0);
});

test('5. Kết luận đúng chỉ số 3 (0.5đ) và số lần 2 (0.5đ) nhận đủ 1.0 điểm', () => {
  const handCorrect: HandTraceData = {
    steps: [],
    finalIndex: 3,
    checkCount: 2,
    eliminationExplanation: '',
  };

  const breakdown = gradeHandTrace(handCorrect);
  assert.equal(breakdown.conclusion.indexCorrect, true);
  assert.equal(breakdown.conclusion.indexPts, 0.5);
  assert.equal(breakdown.conclusion.countCorrect, true);
  assert.equal(breakdown.conclusion.countPts, 0.5);
});

test('6. Bước 2 tìm thấy và dừng không bắt buộc nhập phạm vi mới', () => {
  const step2: any = {
    stepNumber: 2,
    left: 3,
    right: 4,
    mid: 3,
    aMid: 12,
    comparison: '=',
    action: 'found',
    newLeft: '',
    newRight: '',
  };

  const breakdown = gradeHandTrace({ steps: [step2], finalIndex: 3, checkCount: 2, eliminationExplanation: '' });
  assert.equal(breakdown.steps[1].actionCorrect, true, 'Bước tìm thấy nhận đủ điểm dừng');
  assert.equal(breakdown.steps[1].actionPts, 0.5);
});

test('7. Parser nhận diện nhật kí văn bản đề mới (2 bước, K=12, chỉ số 3, kiểm tra 2 lần)', () => {
  const text = `
    B1: l=0, r=4, m=2, A[m]=8; 8<12; tìm tiếp bên phải; l=3, r=4
    B2: l=3, r=4, m=3, A[m]=12; 12=12; tìm thấy
    Kết quả: chỉ số 3, kiểm tra 2 lần
    Giải thích: vì dãy tăng dần nên mọi phần tử bên trái đều nhỏ hơn 12
  `;

  const { data } = parseHandTraceText(text);
  assert.equal(data.steps.length, 2, 'Phải parse được 2 bước');
  assert.equal(data.steps[0].left, '0');
  assert.equal(data.steps[0].right, '4');
  assert.equal(data.steps[0].mid, '2');
  assert.equal(data.steps[0].aMid, '8');
  assert.equal(data.steps[0].action, 'keep_right');
  assert.equal(data.steps[1].left, '3');
  assert.equal(data.steps[1].right, '4');
  assert.equal(data.steps[1].mid, '3');
  assert.equal(data.steps[1].aMid, '12');
  assert.equal(data.steps[1].action, 'found');
  assert.equal(data.finalIndex, '3');
  assert.equal(data.checkCount, '2');
});
