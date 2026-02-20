import { supportAttributionService } from '../../services/supportAttributionService';

describe('supportAttributionService', () => {
  it('builds attribution payload with service + trigger', () => {
    const payload = supportAttributionService.build('rooms', 'support_prompt', { roomId: 12 });
    expect(payload.sourceService).toBe('rooms');
    expect(payload.sourceTrigger).toBe('support_prompt');
    expect(payload.sourceContext).toEqual({ roomId: 12 });
  });

  it('serializes context safely', () => {
    expect(supportAttributionService.serializeContext({ a: 1 })).toBe('{"a":1}');
    expect(supportAttributionService.serializeContext(undefined)).toBe('');
  });
});
