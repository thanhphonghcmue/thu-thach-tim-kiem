import { NextResponse } from 'next/server';
import { getLocalIpAddress, getRoomJoinUrl, generateQrDataUrl } from '@/lib/qr';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const roomCode = searchParams.get('roomCode') || '';
  const customHost = searchParams.get('customHost') || '';

  const baseUrl = customHost ? customHost.replace(/\/$/, '') : getLocalIpAddress();
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
