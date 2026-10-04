import { store } from '@/lib/store';

export async function GET(request: Request, props: { params: Promise<{ code: string }> }) {
  const params = await props.params;
  const { code } = params;

  const room = store.getRoomByCode(code);
  if (!room) {
    return new Response('Không tìm thấy phòng', { status: 404 });
  }

  const leaderboard = store.getLeaderboard(room.id);
  const groups = store.getGroupsByRoom(room.id);

  // Xây dựng nội dung CSV
  const headers = [
    'Hạng',
    'Tên nhóm',
    'Thành viên',
    'Trạng thái nộp',
    'Điểm Trắc nghiệm (/5)',
    'Điểm Chạy tay (/5)',
    'Tổng điểm (/10)',
    'Chờ duyệt',
    'Thời điểm nộp',
  ];

  const rows = leaderboard.map(item => {
    return [
      item.rank ? String(item.rank) : 'Chưa xếp',
      `"${item.groupName.replace(/"/g, '""')}"`,
      `"${item.members.join(', ').replace(/"/g, '""')}"`,
      item.isSubmitted ? 'Đã nộp' : 'Chưa nộp',
      item.mcqScore.toFixed(2),
      item.handScore.toFixed(2),
      item.totalScore.toFixed(2),
      item.isPendingReview ? 'Có (Tạm tính)' : 'Không',
      item.submittedAt ? new Date(item.submittedAt).toLocaleTimeString('vi-VN') : '',
    ].join(',');
  });

  // UTF-8 BOM: \uFEFF giúp Excel hiển thị tiếng Việt có dấu chuẩn 100%
  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');

  return new Response(csvContent, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="Ket_Qua_${room.code}_${Date.now()}.csv"`,
      'Cache-Control': 'no-cache',
    },
  });
}
