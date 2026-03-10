import { getPortalIconChrome, getPortalLabelVisuals } from '../../../components/portal/portalIconShared';

describe('portalIconShared', () => {
  it('uses brand chrome for vedamatch icons', () => {
    const chrome = getPortalIconChrome({
      accentColor: '#3B82F6',
      portalIconStyle: 'vedamatch',
      portalBackgroundType: 'color',
      isDarkMode: false,
      reducedEffects: false,
    });

    expect(chrome.containerStyle.backgroundColor).toBe('#121212');
    expect(chrome.containerStyle.borderColor).toBe('#D4AF37');
    expect(chrome.glyphColor).toBe('#FFDF00');
    expect(chrome.shouldRenderVedaGlow).toBe(true);
  });

  it('keeps accent glyphs for minimal solid-color surfaces', () => {
    const chrome = getPortalIconChrome({
      accentColor: '#F97316',
      portalIconStyle: 'minimal',
      portalBackgroundType: 'color',
      isDarkMode: false,
      reducedEffects: false,
    });

    expect(chrome.glyphColor).toBe('#F97316');
    expect(chrome.containerStyle.backgroundColor).toBe('rgba(255,255,255,0.9)');
  });

  it('returns image label visuals with pill and white text', () => {
    const label = getPortalLabelVisuals('image', false, '#111111');

    expect(label.pillStyle?.backgroundColor).toBe('rgba(0,0,0,0.45)');
    expect(label.textStyle.color).toBe('#ffffff');
  });
});
