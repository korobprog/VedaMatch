"use client";

import FilerobotImageEditor, { TABS, TOOLS } from "react-filerobot-image-editor";

type SavedImageData = {
  name: string;
  extension: string;
  mimeType: string;
  imageBase64?: string;
  imageCanvas?: HTMLCanvasElement;
};

type DatingPhotoEditorProps = {
  source: string;
  onCancel: () => void;
  onSave: (image: SavedImageData) => void | Promise<void>;
};

export function DatingPhotoEditor({ source, onCancel, onSave }: DatingPhotoEditorProps) {
  return (
    <FilerobotImageEditor
      Crop={{
        ratio: 1,
        minWidth: 320,
        minHeight: 320,
        noPresets: false,
      }}
      annotationsCommon={{
        fill: "#ff8a2a",
        stroke: "#ffffff",
      }}
      closeAfterSave
      defaultSavedImageName="union-profile-photo"
      defaultSavedImageQuality={0.92}
      defaultSavedImageType="webp"
      defaultTabId={TABS.ADJUST}
      defaultToolId={TOOLS.CROP}
      onClose={onCancel}
      onSave={(savedImageData) => void onSave(savedImageData)}
      previewPixelRatio={1}
      savingPixelRatio={1}
      source={source}
      tabsIds={[TABS.ADJUST, TABS.FINETUNE, TABS.FILTERS]}
      useBackendTranslations={false}
    />
  );
}
