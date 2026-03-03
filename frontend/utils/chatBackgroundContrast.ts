const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

type RGB = { r: number; g: number; b: number };

const parseHexColor = (color: string): RGB | null => {
    const raw = color.trim().replace(/^#/, '');
    if (![3, 6].includes(raw.length)) {
        return null;
    }

    const normalized = raw.length === 3
        ? raw.split('').map((ch) => `${ch}${ch}`).join('')
        : raw;

    const r = Number.parseInt(normalized.slice(0, 2), 16);
    const g = Number.parseInt(normalized.slice(2, 4), 16);
    const b = Number.parseInt(normalized.slice(4, 6), 16);
    if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) {
        return null;
    }

    return { r, g, b };
};

const toLinear = (channel: number): number => {
    const normalized = clamp(channel / 255, 0, 1);
    if (normalized <= 0.03928) {
        return normalized / 12.92;
    }
    return Math.pow((normalized + 0.055) / 1.055, 2.4);
};

const relativeLuminance = ({ r, g, b }: RGB): number => (
    0.2126 * toLinear(r) +
    0.7152 * toLinear(g) +
    0.0722 * toLinear(b)
);

export const isColorLight = (color?: string | null, threshold = 0.72): boolean => {
    if (!color || typeof color !== 'string') {
        return false;
    }

    const parsed = parseHexColor(color);
    if (!parsed) {
        return false;
    }

    return relativeLuminance(parsed) >= threshold;
};

export const isGradientLight = (gradient?: string | null, threshold = 0.72): boolean => {
    if (!gradient || typeof gradient !== 'string') {
        return false;
    }

    const colors = gradient
        .split('|')
        .map((part) => part.trim())
        .filter(Boolean);

    if (colors.length === 0) {
        return false;
    }

    const lightCount = colors.reduce((acc, color) => acc + (isColorLight(color, threshold) ? 1 : 0), 0);
    return lightCount / colors.length >= 0.5;
};
