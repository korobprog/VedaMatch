export type PortalRole = 'user' | 'in_goodness' | 'yogi' | 'devotee' | 'admin' | 'superadmin';

export interface ServiceHint {
  serviceId: string;
  title: string;
  filters?: string[];
}

export interface MathFilter {
  mathId: string;
  mathName: string;
  filters: string[];
}

export interface PortalBlueprint {
  role: PortalRole | string;
  title: string;
  description: string;
  highlightColor: string;
  quickAccess: string[];
  heroServices: string[];
  servicesHint: ServiceHint[];
  mathFilters?: MathFilter[];
}
