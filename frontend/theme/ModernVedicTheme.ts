export const ModernVedicTheme = {
    colors: {
        background: '#FFF8F0', // Soft Cream
        backgroundSecondary: '#FFFDF9',
        primary: '#D67D3E', // Saffron Deep
        secondary: '#FFB142', // Marigold Gold
        accent: '#9A2A2A', // Sanguine
        text: '#2A2A2A', // Dark Grey (Primary)
        textSecondary: '#6B5B53', // Brownish Grey
        textLight: '#FFFFFF',
        glass: 'rgba(255, 255, 255, 0.7)',
        glassBorder: 'rgba(255, 255, 255, 0.9)',
        shadow: '#D67D3E',
        gradientStart: '#D67D3E',
        gradientEnd: '#FFB142',
        aiButtonStart: '#9A2A2A',
        aiButtonEnd: '#D67D3E',
    },
    typography: {
        header: {
            fontFamily: 'Playfair Display', // Will fallback to system serif if not linked
            fontSize: 28,
            fontWeight: '700',
            letterSpacing: 0.5,
        },
        subHeader: {
            fontFamily: 'Cinzel', // Fallback serif
            fontSize: 18,
            fontWeight: '500',
            letterSpacing: 2,
        },
        body: {
            fontFamily: 'Nunito', // Fallback sans-serif
            fontSize: 16,
        },
        caption: {
            fontFamily: 'Nunito',
            fontSize: 12,
        }
    },
    shadows: {
        soft: {
            shadowColor: "#D67D3E",
            shadowOffset: {
                width: 0,
                height: 4,
            },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 5,
        },
        medium: {
            shadowColor: "#000",
            shadowOffset: {
                width: 0,
                height: 4,
            },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 8,
        },
        glow: {
            shadowColor: "#D67D3E",
            shadowOffset: {
                width: 0,
                height: 0,
            },
            shadowOpacity: 0.5,
            shadowRadius: 20,
            elevation: 10,
        }
    },
    layout: {
        borderRadius: {
            sm: 8,
            md: 16,
            lg: 24,
            xl: 32,
        },
        spacing: {
            xs: 4,
            sm: 8,
            md: 16,
            lg: 24,
            xl: 32,
        }
    }
};
