export const VedicLightTheme = {
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
        surface: '#FFFFFF',
        divider: '#E0E0E0',
    },
    typography: {
        header: {
            fontFamily: 'Playfair Display',
            fontSize: 28,
            fontWeight: '700',
            letterSpacing: 0.5,
        },
        subHeader: {
            fontFamily: 'Cinzel',
            fontSize: 18,
            fontWeight: '500',
            letterSpacing: 2,
        },
        body: {
            fontFamily: 'Nunito',
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
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 5,
        },
        medium: {
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 8,
        },
        glow: {
            shadowColor: "#D67D3E",
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.5,
            shadowRadius: 20,
            elevation: 10,
        }
    },
    layout: {
        borderRadius: { sm: 8, md: 16, lg: 24, xl: 32 },
        spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 }
    }
};

export const VedicDarkTheme = {
    colors: {
        background: '#121212', // Near black
        backgroundSecondary: '#1E1E1E', // Dark stone
        primary: '#D67D3E', // Keep brand Saffron
        secondary: '#E6914E', // Slightly muted gold
        accent: '#D32F2F', // Brighter red for visibility on dark
        text: '#E0E0E0', // Light grey
        textSecondary: '#9E9E9E',
        textLight: '#FFFFFF',
        glass: 'rgba(30, 30, 30, 0.75)',
        glassBorder: 'rgba(60, 60, 60, 0.5)',
        shadow: '#000000',
        gradientStart: '#D67D3E',
        gradientEnd: '#E6914E',
        aiButtonStart: '#B71C1C',
        aiButtonEnd: '#D67D3E',
        surface: '#1E1E1E',
        divider: '#333333',
    },
    typography: VedicLightTheme.typography,
    shadows: {
        soft: {
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 5,
        },
        medium: {
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.4,
            shadowRadius: 12,
            elevation: 8,
        },
        glow: {
            shadowColor: "#D67D3E",
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.3,
            shadowRadius: 15,
            elevation: 10,
        }
    },
    layout: VedicLightTheme.layout
};

// Default export for backward compatibility during transition
export const ModernVedicTheme = VedicLightTheme;
