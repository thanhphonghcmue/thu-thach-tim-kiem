import { store } from '@/lib/store';
import { subscribeToRoom } from '@/lib/events';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, props: { params: Promise<{ code: string }> }) {
  const params = await props.params;
  const { code } = params;

  const room = store.getRoomByCode(code);
  if (!room) {
    return new Response('Room not found', { status: 404 });
  }

  const encoder = new TextEncoder();
  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Gửi event kết nối ban đầu
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected', roomId: room.id })}\n\n`));

      cleanup = subscribeToRoom(room.id, (payload) => {
        try {
          const message = `data: ${JSON.stringify(payload)}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch (err) {
          console.error('Lỗi stream SSE:', err);
        }
      });
    },
    cancel() {
      if (cleanup) cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
