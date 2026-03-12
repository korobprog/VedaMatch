type UserDisplaySource = {
    ID?: number | null;
    spiritualName?: string | null;
    karmicName?: string | null;
    nickname?: string | null;
    nicknameDisplay?: string | null;
    email?: string | null;
};

type UserDisplayOptions = {
    fallbackLabel?: string;
};

const clean = (value?: string | null): string => String(value || '').trim();

export const resolveUserDisplayName = (
    user?: UserDisplaySource | null,
    options: UserDisplayOptions = {},
): string => {
    if (!user) {
        return '';
    }

    const fallbackLabel = clean(options.fallbackLabel) || 'User';

    return clean(user.spiritualName)
        || clean(user.karmicName)
        || clean(user.nicknameDisplay)
        || clean(user.nickname)
        || clean(user.email)
        || (user.ID ? `${fallbackLabel} #${user.ID}` : fallbackLabel);
};

export const resolveUserDisplayInitial = (
    user?: UserDisplaySource | null,
    options: UserDisplayOptions = {},
): string => {
    const displayName = resolveUserDisplayName(user, options);
    const firstSymbol = Array.from(displayName)[0];
    if (!firstSymbol) {
        return '?';
    }
    return firstSymbol.toUpperCase();
};

export const resolveUserNicknameLabel = (user?: UserDisplaySource | null): string => {
    const nicknameDisplay = clean(user?.nicknameDisplay);
    if (nicknameDisplay) {
        return nicknameDisplay.startsWith('@') ? nicknameDisplay : `@${nicknameDisplay}`;
    }

    const nickname = clean(user?.nickname);
    if (!nickname) {
        return '';
    }

    return nickname.startsWith('@') ? nickname : `@${nickname}`;
};
