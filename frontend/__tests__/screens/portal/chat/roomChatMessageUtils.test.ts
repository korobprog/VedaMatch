import { appendLiveMessage, prependHistoryPage } from '../../../../screens/portal/chat/roomChatMessageUtils';

describe('roomChatMessageUtils', () => {
  it('dedupes overlap between older page and current messages', () => {
    const current = [
      { id: '2', content: 'two' },
      { id: '3', content: 'three' },
    ];
    const older = [
      { id: '1', content: 'one' },
      { id: '2', content: 'two duplicate' },
    ];

    const merged = prependHistoryPage(current, older);
    expect(merged.map(m => m.id)).toEqual(['1', '2', '3']);
  });

  it('ignores websocket message duplicate from already loaded history', () => {
    const current = [
      { id: '10', content: 'hello' },
      { id: '11', content: 'world' },
    ];

    const withDuplicate = appendLiveMessage(current, { id: '11', content: 'world again' });
    expect(withDuplicate.map(m => m.id)).toEqual(['10', '11']);
  });
});
