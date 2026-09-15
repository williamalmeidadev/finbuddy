import { RateLimitGuard } from './rate-limit.guard';

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;

  beforeEach(() => {
    // ThrottlerGuard constructor accepts options, storageService, reflector
    guard = new RateLimitGuard({} as any, {} as any, {} as any);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('getTracker', () => {
    it('should return req.ip when available for unauthenticated request', async () => {
      const req = {
        ip: '192.168.1.1',
      };
      const tracker = await (guard as any).getTracker(req);
      expect(tracker).toBe('192.168.1.1');
    });

    it('should extract first IP from req.ips when req.ip is absent', async () => {
      const req = {
        ips: ['203.0.113.195', '70.41.3.18'],
      };
      const tracker = await (guard as any).getTracker(req);
      expect(tracker).toBe('203.0.113.195');
    });

    it('should fallback to socket.remoteAddress if req.ip and X-Forwarded-For are absent', async () => {
      const req = {
        socket: {
          remoteAddress: '10.0.0.5',
        },
      };
      const tracker = await (guard as any).getTracker(req);
      expect(tracker).toBe('10.0.0.5');
    });

    it('should fallback to 127.0.0.1 if no IP properties exist', async () => {
      const req = {};
      const tracker = await (guard as any).getTracker(req);
      expect(tracker).toBe('127.0.0.1');
    });

    it('should key by userId:IP when user is authenticated', async () => {
      const req = {
        ip: '192.168.1.1',
        user: { id: 'user-uuid-123' },
      };
      const tracker = await (guard as any).getTracker(req);
      expect(tracker).toBe('user-uuid-123:192.168.1.1');
    });

    it('should key by sub:IP when user has sub property instead of id', async () => {
      const req = {
        ip: '192.168.1.1',
        user: { sub: 'user-sub-456' },
      };
      const tracker = await (guard as any).getTracker(req);
      expect(tracker).toBe('user-sub-456:192.168.1.1');
    });
  });
});
