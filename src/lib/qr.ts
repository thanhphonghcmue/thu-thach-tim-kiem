import os from 'os';
import QRCode from 'qrcode';

/**
 * Lấy địa chỉ IP mạng nội bộ (LAN) để các thiết bị khác (điện thoại) quét QR truy cập được
 */
export function getLocalIpAddress(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
  }

  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const netList = interfaces[name];
    if (!netList) continue;
    for (const net of netList) {
      // Bỏ qua IPv6 và internal loopback (127.0.0.1)
      if (net.family === 'IPv4' && !net.internal) {
        return `http://${net.address}:3000`;
      }
    }
  }

  return 'http://localhost:3000';
}

/**
 * Tạo URL tham gia phòng thi với mã phòng đã điền sẵn
 */
export function getRoomJoinUrl(roomCode: string, baseUrl?: string): string {
  const base = baseUrl || getLocalIpAddress();
  return `${base}/join?room=${encodeURIComponent(roomCode)}`;
}

/**
 * Tạo mã QR dưới dạng Data URL (PNG Base64) để hiển thị và tải về
 */
export async function generateQrDataUrl(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: 400,
      margin: 2,
      color: {
        dark: '#0369a1', // Màu xanh dương chuẩn thương hiệu
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });
  } catch (err) {
    console.error('Lỗi sinh mã QR:', err);
    return '';
  }
}
