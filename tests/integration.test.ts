import test from 'node:test';
import assert from 'node:assert/strict';
import { store } from '../src/lib/store';
import { Room, Group } from '../src/types';

let testRoom: Room;
let testGroups: Group[];

test('Setup: Tạo phòng kiểm thử riêng biệt', () => {
  const teacher = store.getUserByUsername('giaovien')!;
  assert.ok(teacher);
  const classes = store.getClassesByTeacher(teacher.id);
  assert.ok(classes.length > 0);

  const selectedQuestions = ['mcq-1', 'mcq-2', 'mcq-3', 'mcq-4', 'mcq-5'];
  const res = store.createRoom(
    teacher.id,
    classes[0].id,
    `Phòng Test Tự Động ${Date.now()}`,
    selectedQuestions,
    9,
    3
  );

  testRoom = res.room;
  testGroups = res.groups;

  assert.ok(testRoom);
  assert.equal(testGroups.length, 3);
});

test('Integration Test 1: Trạng thái ban đầu và cấu trúc nhóm', () => {
  assert.equal(testRoom.status, 'waiting');
  assert.equal(testGroups[0].studentIds.length > 0, true);
  assert.ok(testGroups[0].driverStudentId);
});

test('Integration Test 2: Bảo vệ quyền - Chỉ Người điều khiển (Driver) mới được sửa bản nháp', () => {
  // Mở phòng sang running
  store.updateRoom(testRoom.id, { status: 'running' });

  const group1 = testGroups[0];
  const driverId = group1.driverStudentId;
  const nonDriverId = group1.studentIds.find(id => id !== driverId);
  assert.ok(nonDriverId);

  // Non-driver cố lưu nháp
  const invalidSave = store.saveDraft(
    group1.id,
    { mcqAnswers: { 'mcq-1': 'opt-1-a' } },
    nonDriverId
  );
  assert.equal(invalidSave.success, false);
  assert.match(invalidSave.error || '', /Chỉ Người điều khiển/);

  // Driver lưu nháp
  const validSave = store.saveDraft(
    group1.id,
    { mcqAnswers: { 'mcq-1': 'opt-1-a' } },
    driverId
  );
  assert.equal(validSave.success, true);
});

test('Integration Test 3: Đổi người điều khiển hoạt động chính xác', () => {
  const group1 = testGroups[0];
  const oldDriver = group1.driverStudentId;
  const newDriver = group1.studentIds.find(id => id !== oldDriver)!;

  const updatedGroup = store.setGroupDriver(group1.id, newDriver);
  assert.equal(updatedGroup?.driverStudentId, newDriver);

  // Khôi phục driver cũ
  store.setGroupDriver(group1.id, oldDriver);
});

test('Integration Test 4: Chống nộp bài lần 2 và chống sửa khi đã nộp', () => {
  const group2 = testGroups[1];
  const driver = group2.driverStudentId;

  // Nộp lần 1: câu giải thích diễn đạt tự do (cần duyệt, pts: 0)
  const sub1 = store.submitGroup(
    group2.id,
    driver,
    { 'mcq-1': 'opt-1-a' },
    {
      steps: [{ stepNumber: 1, left: 0, right: 7, mid: 3, aMid: 12, comparison: '<', action: 'keep_right', newLeft: 4, newRight: 7 }],
      finalIndex: 6,
      checkCount: 3,
      eliminationExplanation: 'Em thấy 12 bé hơn 38 nên bỏ nửa trước',
    }
  );
  assert.equal(sub1.success, true, 'Nộp lần 1 thành công');
  assert.equal(sub1.submission?.score?.handBreakdown.conclusion.explanationStatus, 'pending_teacher_review');

  // Cố nộp lần 2
  const sub2 = store.submitGroup(
    group2.id,
    driver,
    { 'mcq-1': 'opt-1-b' },
    { steps: [], finalIndex: '', checkCount: '', eliminationExplanation: '' }
  );
  assert.equal(sub2.success, false, 'Không được phép nộp lần 2 khi chưa mở lượt sửa');

  // Cố sửa nháp sau khi đã nộp
  const editAfterSubmit = store.saveDraft(
    group2.id,
    { mcqAnswers: { 'mcq-1': 'opt-1-b' } },
    driver
  );
  assert.equal(editAfterSubmit.success, false, 'Không được sửa nháp sau khi nộp');
});

test('Integration Test 5: Bằng điểm đồng hạng và hiển thị Tạm tính', () => {
  const leaderboard = store.getLeaderboard(testRoom.id);
  assert.ok(Array.isArray(leaderboard));

  for (let i = 1; i < leaderboard.length; i++) {
    if (leaderboard[i].totalScore === leaderboard[i - 1].totalScore) {
      assert.equal(
        leaderboard[i].rank,
        leaderboard[i - 1].rank,
        `Bằng điểm phải đồng hạng`
      );
    }
  }
});

test('Integration Test 6: Giáo viên duyệt giải thích, cộng điểm và ghi lý do', () => {
  const group2 = testGroups[1];
  const sub = store.getSubmission(group2.id);
  assert.ok(sub && sub.score);

  const oldTotal = sub.score.totalScore;
  assert.equal(sub.score.handBreakdown.conclusion.explanationPts, 0);

  // Giáo viên duyệt giải thích +0.50đ kèm lý do
  const reviewResult = store.adjustScore(group2.id, {
    criterion: 'explanation',
    originalPts: 0,
    adjustedPts: 0.5,
    reason: 'Giải thích đúng bản chất dãy tăng dần',
    adjustedAt: new Date().toISOString(),
  });

  assert.equal(reviewResult.success, true);
  const updatedSub = store.getSubmission(group2.id)!;
  assert.equal(updatedSub.score?.handBreakdown.conclusion.explanationPts, 0.5);
  assert.equal(updatedSub.score?.totalScore, Number((oldTotal + 0.5).toFixed(2)));
  assert.ok(updatedSub.score?.teacherAdjustments?.length! > 0, 'Phải ghi lại lý do điều chỉnh');
});
