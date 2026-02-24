import { createDefaultLayout, PortalWidget } from '../../types/portal';
import {
  addWidgetToCanvas,
  normalizeWidgetCanvasLayout,
  reorderWidgetCanvas,
} from '../widgetCanvasLayout';

const makeWidget = (
  id: string,
  type: PortalWidget['type'],
  size: PortalWidget['size'],
  position: number,
): PortalWidget => ({ id, type, size, position });

describe('portal widgetCanvas normalization and constraints', () => {
  it('migrates legacy pages[].widgets into widgetCanvas and clears legacy buckets', () => {
    const base = createDefaultLayout();
    const legacyLayout = {
      ...base,
      widgetCanvas: undefined,
      pages: [
        {
          ...base.pages[0],
          widgets: [
            makeWidget('legacy-clock', 'clock', '2x1', 10),
            makeWidget('legacy-calendar', 'calendar', '2x2', 20),
          ],
        },
      ],
    } as any;

    const { layout, changed } = normalizeWidgetCanvasLayout(legacyLayout);

    expect(changed).toBe(true);
    expect(layout.widgetCanvas.widgets.map((w) => w.id)).toEqual(['legacy-clock', 'legacy-calendar']);
    expect(layout.widgetCanvas.widgets.map((w) => w.position)).toEqual([0, 1]);
    expect(layout.pages[0].widgets).toEqual([]);
  });

  it('deduplicates widgets by type:size and keeps first instance', () => {
    const base = createDefaultLayout();
    const withDuplicates = {
      ...base,
      widgetCanvas: {
        widgets: [
          makeWidget('first-clock', 'clock', '2x1', 4),
          makeWidget('dup-clock', 'clock', '2x1', 5),
          makeWidget('calendar', 'calendar', '2x2', 2),
        ],
        lastModified: 0,
      },
    };

    const { layout, changed } = normalizeWidgetCanvasLayout(withDuplicates);

    expect(changed).toBe(true);
    expect(layout.widgetCanvas.widgets.map((w) => w.id)).toEqual(['first-clock', 'calendar']);
    expect(layout.widgetCanvas.widgets.map((w) => w.position)).toEqual([0, 1]);
  });

  it('blocks duplicate add by type:size and returns reason', () => {
    const existing = [makeWidget('clock', 'clock', '2x1', 0)];

    const duplicateAdd = addWidgetToCanvas(existing, { type: 'clock', size: '2x1' }, () => 'new-id');
    expect(duplicateAdd.result).toEqual({ ok: false, reason: 'duplicate' });
    expect(duplicateAdd.widgets.map((w) => w.id)).toEqual(['clock']);

    const uniqueAdd = addWidgetToCanvas(existing, { type: 'calendar', size: '2x2' }, () => 'calendar-1');
    expect(uniqueAdd.result).toEqual({ ok: true });
    expect(uniqueAdd.widgets.map((w) => w.id)).toEqual(['clock', 'calendar-1']);
    expect(uniqueAdd.widgets.map((w) => w.position)).toEqual([0, 1]);
  });

  it('reorders widgets and recalculates positions', () => {
    const widgets = [
      makeWidget('w1', 'clock', '2x1', 5),
      makeWidget('w2', 'calendar', '2x2', 6),
      makeWidget('w3', 'circles_quick', '1x1', 7),
    ];

    const reordered = reorderWidgetCanvas(widgets, 0, 2);

    expect(reordered.map((w) => w.id)).toEqual(['w2', 'w3', 'w1']);
    expect(reordered.map((w) => w.position)).toEqual([0, 1, 2]);
  });
});
