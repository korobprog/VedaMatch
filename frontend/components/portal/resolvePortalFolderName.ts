import { TFunction } from 'i18next';
import { DEFAULT_PORTAL_FOLDER_DEFINITIONS, PortalFolder } from '../../types/portal';

const DEFAULT_FOLDER_NAME_BY_ID = new Map(
    DEFAULT_PORTAL_FOLDER_DEFINITIONS.map((folder) => [folder.id, folder.name]),
);
DEFAULT_FOLDER_NAME_BY_ID.set('folder-seeker-locked', 'Откроется после профиля');

const FOLDER_TRANSLATION_KEY_BY_ID: Record<string, string> = {
    'folder-communication': 'portal.folderLabels.communication',
    'folder-calendar': 'portal.folderLabels.calendar',
    'folder-practice': 'portal.folderLabels.practice',
    'folder-content': 'portal.folderLabels.content',
    'folder-services': 'portal.folderLabels.services',
    'folder-travel': 'portal.folderLabels.travel',
    'folder-profile': 'portal.folderLabels.profile',
    'folder-seeker-locked': 'portal.folderLabels.lockedAfterProfile',
};

export const resolvePortalFolderName = (folder: PortalFolder, t: TFunction): string => {
    const translationKey = FOLDER_TRANSLATION_KEY_BY_ID[folder.id];
    if (!translationKey) {
        return folder.name;
    }

    const localizedName = t(translationKey);
    const defaultName = DEFAULT_FOLDER_NAME_BY_ID.get(folder.id);

    if (folder.name === localizedName || folder.name === defaultName) {
        return localizedName;
    }

    return folder.name;
};
