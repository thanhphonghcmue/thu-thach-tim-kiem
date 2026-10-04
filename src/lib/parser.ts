import { HandTraceStep, HandTraceData } from '@/types';

/**
 * Chuẩn hóa chuỗi văn bản:
 * - Thay thế dấu toán học đặc biệt: ≤ thành <=, ≥ thành >=, − thành -, v.v.
 * - Loại bỏ khoảng trắng thừa, chuẩn hóa chữ thường.
 */
export function normalizeText(input: string): string {
  if (!input) return '';
  return input
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2212]/g, '-') // Dấu trừ unicode
    .replace(/[\u2264]/g, '<=')
    .replace(/[\u2265]/g, '>=')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Phân tích dòng văn bản của một bước chạy tay
 * Ví dụ: "B1: l=0, r=7, m=3, A[m]=12; 12<38; l=4, r=7"
 * hoặc: "Bước 1: left=0, right=7, mid=3, A[mid]=12, 12 < 38, giữ nửa phải, left=4, right=7"
 */
export function parseStepLine(line: string, defaultStepNum: number): HandTraceStep | null {
  const norm = normalizeText(line);
  if (!norm) return null;

  // Lấy số bước nếu có: "B1:", "Bước 1:", "Step 1:"
  const stepMatch = norm.match(/(?:bước|buoc|step|b)\s*(\d+)/i);
  const stepNumber = stepMatch ? parseInt(stepMatch[1], 10) : defaultStepNum;

  // Trích xuất l, r, m, a_mid
  const lMatch = norm.match(/\b(?:left|l)\s*[:=]\s*(-?\d+)/i);
  const rMatch = norm.match(/\b(?:right|r)\s*[:=]\s*(-?\d+)/i);
  const mMatch = norm.match(/\b(?:mid|m)\s*[:=]\s*(-?\d+)/i);
  const aMatch = norm.match(/\b(?:a\[mid\]|a\[m\]|a_mid|amid|a\[\d+\])\s*[:=]\s*(-?\d+)/i);

  // Trích xuất cập nhật left/right mới
  // Ví dụ: "l=4, r=7" xuất hiện ở phần sau
  // Tìm tất cả các cặp left, right trong câu
  const allL = [...norm.matchAll(/\b(?:left|l)\s*[:=]\s*(-?\d+)/gi)];
  const allR = [...norm.matchAll(/\b(?:right|r)\s*[:=]\s*(-?\d+)/gi)];

  let left = lMatch ? lMatch[1] : '';
  let right = rMatch ? rMatch[1] : '';
  let newLeft = allL.length > 1 ? allL[allL.length - 1][1] : '';
  let newRight = allR.length > 1 ? allR[allR.length - 1][1] : '';

  // Trích xuất so sánh
  let comparison: '<' | '=' | '>' | '' = '';
  if (norm.includes('==') || norm.includes('=')) {
    // Kiểm tra xem có so sánh giá trị không
    if (/\b(?:12\s*==?\s*12|38\s*==?\s*38|a\[.*?\]\s*==?\s*(?:12|38|k)|tìm thấy|found)\b/i.test(norm)) {
      comparison = '=';
    }
  }
  if (/<|\bnhỏ hơn\b|\bless\b/i.test(norm)) {
    // Chú ý đảo ngược: nếu ghi K > A[mid] thì về mặt A[mid] với K là '<'
    if (/\b(?:k|12|38)\s*>\s*(?:a\[|2|5|8|12|16|23)/i.test(norm)) {
      comparison = '<';
    } else {
      comparison = '<';
    }
  } else if (/>|\blớn hơn\b|\bgreater\b/i.test(norm)) {
    if (/\b(?:k|12|38)\s*<\s*(?:a\[|2|5|8|12|16|23)/i.test(norm)) {
      comparison = '<';
    } else {
      comparison = '>';
    }
  }

  // Trích xuất hành động
  let action: 'keep_left' | 'keep_right' | 'found' | '' = '';
  const lowerNorm = norm.toLowerCase();
  
  // Kiểm tra phủ định trước: ví dụ "không giữ nửa phải", "không bỏ"
  const hasNegation = /\b(không|khong|chẳng|chang)\b/.test(lowerNorm);

  if (/\b(tìm thấy|tim thay|found|bằng k|bang k|tra ve|trả về|return)\b/.test(lowerNorm) && !hasNegation) {
    action = 'found';
  } else if (/\b(tìm tiếp bên phải|tim tiep ben phai|tìm bên phải|tim ben phai|bên phải|ben phai|giữ nửa phải|giu nua phai|nửa phải|nua phai|phía phải|loại nửa trái|loai nua trai|bỏ nửa trái|bo nua trai)\b/.test(lowerNorm) && !hasNegation) {
    action = 'keep_right';
  } else if (/\b(tìm tiếp bên trái|tim tiep ben trái|tìm bên trái|tim ben trai|bên trái|ben trai|giữ nửa trái|giu nua trai|nửa trái|nua trai|loại nửa phải|bỏ nửa phải)\b/.test(lowerNorm) && !hasNegation) {
    action = 'keep_left';
  }

  return {
    stepNumber,
    left,
    right,
    mid: mMatch ? mMatch[1] : '',
    aMid: aMatch ? aMatch[1] : '',
    comparison,
    action,
    newLeft,
    newRight,
  };
}

/**
 * Phân tích toàn bộ văn bản nhật kí thành HandTraceData
 */
export function parseHandTraceText(rawText: string): { data: HandTraceData; parseErrors: string[] } {
  const errors: string[] = [];
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  
  const steps: HandTraceStep[] = [];
  let finalIndex: string = '';
  let checkCount: string = '';
  let eliminationExplanation: string = '';

  let stepCounter = 1;
  for (const line of lines) {
    const norm = normalizeText(line);
    const lower = norm.toLowerCase();

    // Kiểm tra dòng kết luận hoặc giải thích
    if (lower.includes('chỉ số') || lower.includes('chi so') || lower.includes('index') || lower.includes('kết quả') || lower.includes('ket qua') || lower.includes('trả về')) {
      const idxMatch = norm.match(/(?:chỉ số|chi so|index|trả về|tra ve|vị trí|vi tri)\s*(?:là|:|=)?\s*(\d+)/i);
      if (idxMatch) {
        finalIndex = idxMatch[1];
      }
    }

    if (lower.includes('kiểm tra') || lower.includes('kiem tra') || lower.includes('lượt') || lower.includes('luot') || lower.includes('lần') || lower.includes('lan')) {
      const cntMatch = norm.match(/(\d+)\s*(?:lần|lan|lượt|luot)/i);
      if (cntMatch) {
        checkCount = cntMatch[1];
      }
    }

    if (lower.includes('giải thích') || lower.includes('giai thich') || lower.includes('vì') || lower.includes('do') || lower.includes('loại')) {
      const expMatch = norm.match(/(?:giải thích|giai thich)\s*[:=]\s*(.*)/i);
      if (expMatch) {
        eliminationExplanation = expMatch[1].trim();
      } else if (!eliminationExplanation && (lower.includes('tăng dần') || lower.includes('nhỏ hơn'))) {
        eliminationExplanation = norm;
      }
    }

    // Nếu là bước
    if (/^(?:bước|buoc|step|b\d+|b:)/i.test(norm) || (norm.includes('left') && norm.includes('mid')) || (norm.includes('l=') && norm.includes('m='))) {
      const step = parseStepLine(norm, stepCounter);
      if (step) {
        steps.push(step);
        stepCounter++;
      }
    }
  }

  return {
    data: {
      steps: steps.length > 0 ? steps : [
        { stepNumber: 1, left: '', right: '', mid: '', aMid: '', comparison: '', action: '', newLeft: '', newRight: '' },
        { stepNumber: 2, left: '', right: '', mid: '', aMid: '', comparison: '', action: '', newLeft: '', newRight: '' },
      ],
      finalIndex,
      checkCount,
      eliminationExplanation,
    },
    parseErrors: errors,
  };
}

/**
 * Chuyển HandTraceData thành văn bản để hiển thị ở chế độ B
 */
export function formatHandTraceToText(data: HandTraceData): string {
  const lines: string[] = [];
  data.steps.forEach((s) => {
    let actText = '';
    if (s.action === 'keep_right') actText = 'giữ nửa phải';
    else if (s.action === 'keep_left') actText = 'giữ nửa trái';
    else if (s.action === 'found') actText = 'tìm thấy';

    let line = `B${s.stepNumber}: l=${s.left}, r=${s.right}, m=${s.mid}, A[m]=${s.aMid}; A[m] ${s.comparison || '?'} K; ${actText}`;
    if (s.action !== 'found' && (s.newLeft !== '' || s.newRight !== '')) {
      line += `; l=${s.newLeft}, r=${s.newRight}`;
    }
    lines.push(line);
  });

  if (data.finalIndex !== '' || data.checkCount !== '') {
    lines.push(`Kết quả: Chỉ số = ${data.finalIndex || '?'}, Số lần kiểm tra = ${data.checkCount || '?'}`);
  }
  if (data.eliminationExplanation) {
    lines.push(`Giải thích: ${data.eliminationExplanation}`);
  }

  return lines.join('\n');
}
