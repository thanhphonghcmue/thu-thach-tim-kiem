import { McqQuestion } from '@/types';

export const OFFICIAL_CPP_CODE = `// Thuật toán Tìm kiếm nhị phân (Binary Search) trên dãy tăng dần
int BinarySearch(const int A[], int n, int K) {
    int left = 0, right = n - 1;

    while (left <= right) {
        int mid = left + (right - left) / 2;

        if (A[mid] == K) {
            return mid; // Tìm thấy: trả chỉ số
        }

        if (A[mid] < K) {
            left = mid + 1; // Loại nửa trái và cả mid
        } else {
            right = mid - 1; // Loại nửa phải và cả mid
        }
    }

    return -1; // Phạm vi rỗng, không tìm thấy
}`;

export const LINEAR_CPP_CODE = `// Thuật toán Tìm kiếm tuần tự (Linear Search)
int LinearSearch(const int A[], int n, int K) {
    for (int i = 0; i < n; i++) {
        if (A[i] == K) {
            return i; // Trả về chỉ số đầu tiên tìm thấy
        }
    }
    return -1; // Không tìm thấy
}`;

export const HAND_TRACE_ARRAY = [2, 5, 8, 12, 16];
export const HAND_TRACE_TARGET = 12;

export const STANDARD_HAND_TRACE = {
  array: HAND_TRACE_ARRAY,
  target: HAND_TRACE_TARGET,
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
      newLeft: 3,
      newRight: 4,
    },
  ],
  conclusion: {
    finalIndex: 3,
    checkCount: 2,
    explanation: 'Giá trị 12 tìm thấy tại chỉ số 3 sau 2 lần kiểm tra phần tử giữa. Phân biệt: 12 là giá trị, 3 là chỉ số, 2 là số lần kiểm tra.',
  },
};

export const QUESTION_BANK: McqQuestion[] = [
  {
    id: 'mcq-1',
    title: 'Câu 1: Điều kiện áp dụng',
    content: 'Điều kiện bắt buộc để áp dụng tìm kiếm nhị phân theo mã C++ tăng dần trong bài học là gì?',
    options: [
      { id: 'opt-1-a', text: 'Dãy được sắp xếp tăng dần.' },
      { id: 'opt-1-b', text: 'Dãy có đúng 8 phần tử.' },
      { id: 'opt-1-c', text: 'Giá trị cần tìm có ở đầu dãy.' },
      { id: 'opt-1-d', text: 'Mọi phần tử giống nhau.' },
    ],
    correctOptionId: 'opt-1-a',
    explanation: 'Thứ tự tăng dần cho phép xác định phía có thể chứa K. Dãy giảm dần cần thay đổi quy tắc so sánh; mã của bài này dùng dãy tăng dần.',
    isBackup: false,
  },
  {
    id: 'mcq-2',
    title: 'Câu 2: Phân biệt giá trị và chỉ số',
    content: 'Hàm LinearSearch duyệt từ đầu, trả chỉ số đầu tiên tìm thấy, nhận:\nA = [1, 4, 7, 8, 3, 9, 10], K = 9.\nChỉ số bắt đầu từ 0. Hàm trả về gì?',
    options: [
      { id: 'opt-2-a', text: '9.' },
      { id: 'opt-2-b', text: '6.' },
      { id: 'opt-2-c', text: '5.' },
      { id: 'opt-2-d', text: '−1.' },
    ],
    correctOptionId: 'opt-2-c',
    explanation: '9 là giá trị cần tìm, 5 là chỉ số (index), 6 là số lần kiểm tra từ đầu.',
    isBackup: false,
  },
  {
    id: 'mcq-3',
    title: 'Câu 3: Cập nhật phạm vi tìm kiếm',
    content: 'Khi left <= right và A[mid] < K trên dãy tăng dần, cập nhật nào đúng?',
    options: [
      { id: 'opt-3-a', text: 'right = mid − 1.' },
      { id: 'opt-3-b', text: 'left = mid + 1.' },
      { id: 'opt-3-c', text: 'Trả về −1 ngay.' },
      { id: 'opt-3-d', text: 'Giữ nguyên left và right.' },
    ],
    correctOptionId: 'opt-3-b',
    explanation: 'Các phần tử từ left đến mid không thể bằng K; loại cả mid và tiếp tục tìm ở phía bên phải.',
    isBackup: false,
  },
  {
    id: 'mcq-4',
    title: 'Câu 4: Điều kiện dừng khi không tìm thấy',
    content: 'Trong tìm kiếm nhị phân với phạm vi đóng [left, right], khi nào kết luận không tìm thấy?',
    options: [
      { id: 'opt-4-a', text: 'Ngay khi A[mid] khác K lần đầu.' },
      { id: 'opt-4-b', text: 'Khi left > right.' },
      { id: 'opt-4-c', text: 'Khi left = right.' },
      { id: 'opt-4-d', text: 'Khi mid = 0.' },
    ],
    correctOptionId: 'opt-4-b',
    explanation: 'left > right nghĩa là phạm vi rỗng. Khi left = right vẫn còn một phần tử cần kiểm tra.',
    isBackup: false,
  },
  {
    id: 'mcq-5',
    title: 'Câu 5: So sánh số lần kiểm tra',
    content: 'Dãy tăng:\nA = [2, 5, 8, 12, 16, 23, 38, 56].\nTìm K = 2. Với mid = left + (right − left) / 2 bằng phép chia nguyên trong C++, nhận xét nào đúng?',
    options: [
      { id: 'opt-5-a', text: 'Tuần tự kiểm tra 1 lần; nhị phân kiểm tra 3 lần.' },
      { id: 'opt-5-b', text: 'Tuần tự kiểm tra 3 lần; nhị phân kiểm tra 1 lần.' },
      { id: 'opt-5-c', text: 'Cả hai kiểm tra 1 lần.' },
      { id: 'opt-5-d', text: 'Nhị phân luôn kiểm tra ít hơn tuần tự.' },
    ],
    correctOptionId: 'opt-5-a',
    explanation: 'Tuần tự gặp 2 ngay ở đầu (1 lần). Nhị phân xét 12 -> 5 -> 2 (3 lần). Không khẳng định nhị phân luôn ít lượt hơn trong mọi lần tìm.',
    isBackup: false,
  },
  {
    id: 'mcq-6',
    title: 'Câu 6: Phép tính chỉ số mid (Dự phòng)',
    content: 'Trong phạm vi left = 4, right = 7, công thức:\nmid = left + (right − left) / 2\nvới phép chia nguyên trong C++, cho mid bằng bao nhiêu?',
    options: [
      { id: 'opt-6-a', text: '4.' },
      { id: 'opt-6-b', text: '5.' },
      { id: 'opt-6-c', text: '6.' },
      { id: 'opt-6-d', text: '7.' },
    ],
    correctOptionId: 'opt-6-b',
    explanation: 'mid = 4 + 3 / 2 = 4 + 1 = 5.',
    isBackup: true,
  },
];
