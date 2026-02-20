export type SupportSourceService = 'rooms' | 'seva' | 'travel' | 'multimedia' | 'other';
export type SupportSourceTrigger = 'support_prompt' | 'donate_modal' | 'campaign_banner' | 'manual';

export interface SupportAttribution {
  sourceService: SupportSourceService;
  sourceTrigger: SupportSourceTrigger;
  sourceRoomId?: number;
  sourceContext?: Record<string, unknown>;
  platformContributionEnabled?: boolean;
  platformContributionPercent?: number;
}

export const supportAttributionService = {
  build(service: SupportSourceService, trigger: SupportSourceTrigger, context?: Record<string, unknown>): SupportAttribution {
    return {
      sourceService: service,
      sourceTrigger: trigger,
      sourceContext: context,
    };
  },

  serializeContext(context?: Record<string, unknown>): string {
    if (!context || Object.keys(context).length === 0) {
      return '';
    }
    try {
      return JSON.stringify(context);
    } catch {
      return '';
    }
  },
};
