import { resolvePortalFolderName } from '../../../components/portal/resolvePortalFolderName';
import { PortalFolder } from '../../../types/portal';

describe('resolvePortalFolderName', () => {
    const makeFolder = (overrides: Partial<PortalFolder>): PortalFolder => ({
        id: 'folder-communication',
        name: 'Общение',
        type: 'folder',
        color: '#22C55E',
        items: [],
        position: 0,
        ...overrides,
    });

    it('localizes default system folder names by folder id', () => {
        const folder = makeFolder({});
        const t = ((key: string) => {
            if (key === 'portal.folderLabels.communication') {
                return 'Communication';
            }
            return key;
        }) as any;

        expect(resolvePortalFolderName(folder, t)).toBe('Communication');
    });

    it('localizes locked folder name by folder id', () => {
        const folder = makeFolder({
            id: 'folder-seeker-locked',
            name: 'Откроется после профиля',
        });
        const t = ((key: string) => {
            if (key === 'portal.folderLabels.lockedAfterProfile') {
                return 'Unlocks after profile';
            }
            return key;
        }) as any;

        expect(resolvePortalFolderName(folder, t)).toBe('Unlocks after profile');
    });

    it('localizes games folder name by folder id', () => {
        const folder = makeFolder({
            id: 'folder-games',
            name: 'Игры',
        });
        const t = ((key: string) => {
            if (key === 'portal.folderLabels.games') {
                return 'Games';
            }
            return key;
        }) as any;

        expect(resolvePortalFolderName(folder, t)).toBe('Games');
    });

    it('preserves user-renamed folder names', () => {
        const folder = makeFolder({ name: 'My Circle' });
        const t = ((key: string) => {
            if (key === 'portal.folderLabels.communication') {
                return 'Communication';
            }
            return key;
        }) as any;

        expect(resolvePortalFolderName(folder, t)).toBe('My Circle');
    });
});
