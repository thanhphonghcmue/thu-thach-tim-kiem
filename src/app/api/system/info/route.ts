import { NextResponse } from 'next/server';
import { getLocalIpAddress, getRoomJoinUrl, generateQrDataUrl } from '@/lib/qr';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const roomCode = searchParams.get('roomCode') || '';
  const customHost = searchParams.get('customHost') || '';

  let baseUrl = customHost ? customHost.replace(/\/$/, '') : '';
  if (!baseUrl) {
    const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host');
    const forwardedProto = request.headers.get('x-forwarded-proto') || (request.url.startsWith('https') ? 'https' : 'http');
    
    // Nếu có host từ proxy công khai (không phải localhost hoặc IP loopback)
    if (forwardedHost && !forwardedHost.includes('localhost') && !forwardedHost.includes('127.0.0.1')) {
      baseUrl = `${forwardedProto}://${forwardedHost}`;
    } else {
      baseUrl = getLocalIpAddress();
    }
  }

  const joinUrl = roomCode ? getRoomJoinUrl(roomCode, baseUrl) : `${baseUrl}/join`;

  let qrDataUrl = '';
  if (roomCode) {
    qrDataUrl = await generateQrDataUrl(joinUrl);
  }

  return NextResponse.json({
    localIpUrl: getLocalIpAddress(),
    baseUrl,
    joinUrl,
    qrDataUrl,
  });
}
