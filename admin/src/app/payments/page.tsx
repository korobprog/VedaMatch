'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle,
    CheckCircle2,
    Clock3,
    Loader2,
    RefreshCw,
    Save,
    ShieldCheck,
    Wallet,
    XCircle,
} from 'lucide-react';
import api from '@/lib/api';

type LKMRegion = 'cis' | 'non_cis';
type LKMRiskAction = 'auto' | 'enhanced' | 'manual';

interface Gateway {
    id?: number;
    code: string;
    name: string;
    isEnabled: boolean;
}

interface RegionConfig {
    id?: number;
    region: LKMRegion;
    customMinLkm: number;
    customMaxLkm: number;
    customStepLkm: number;
}

interface PackageConfig {
    id?: number;
    region: LKMRegion;
    lkmAmount: number;
    sortOrder: number;
    isActive: boolean;
}

interface ProcessingCost {
    id?: number;
    gatewayCode: string;
    paymentMethod: string;
    region: LKMRegion;
    percent: number;
    fixedRub: number;
    isEnabled: boolean;
}

interface FXRate {
    id?: number;
    currency: string;
    rubPerUnit: number;
    isActive: boolean;
}

interface RiskTier {
    id?: number;
    name: string;
    action: LKMRiskAction;
    minLkm: number;
    maxLkm: number;
    sortOrder: number;
    isEnabled: boolean;
}

interface LKMAdminConfig {
    globalConfig: {
        nominalRubPerLkm: number;
    };
    gateways: Gateway[];
    regionConfigs: RegionConfig[];
    packages: PackageConfig[];
    processingCosts: ProcessingCost[];
    fxRates: FXRate[];
    riskTiers: RiskTier[];
}

interface PreviewPackage {
    lkmAmount: number;
    receiveLkm: number;
    totalPayAmount: number;
    payCurrency: string;
    fxRate: number;
    nominalRub: number;
    processingCostRub: number;
    totalRub: number;
}

interface PreviewResponse {
    region: string;
    currency: string;
    gatewayCode: string;
    paymentMethod: string;
    nominalRubPerLkm: number;
    customMinLkm: number;
    customMaxLkm: number;
    customStepLkm: number;
    packages: PreviewPackage[];
    disclaimer: string;
}

interface TopupItem {
    topupId: string;
    userId: number;
    receiveLkm: number;
    totalPayAmount: number;
    payCurrency: string;
    gatewayCode: string;
    paymentMethod: string;
    status: string;
    riskAction: string;
    riskReason: string;
    createdAt: string;
}

const defaultConfig: LKMAdminConfig = {
    globalConfig: {
        nominalRubPerLkm: 1,
    },
    gateways: [],
    regionConfigs: [],
    packages: [],
    processingCosts: [],
    fxRates: [],
    riskTiers: [],
};

const defaultRegionConfigs: RegionConfig[] = [
    { region: 'cis', customMinLkm: 199, customMaxLkm: 450000, customStepLkm: 50 },
    { region: 'non_cis', customMinLkm: 499, customMaxLkm: 450000, customStepLkm: 50 },
];

function listToString(values: number[]): string {
    return values.join(', ');
}

function parseNumberList(raw: string): number[] {
    const chunks = raw
        .split(',')
        .map((item) => Number(item.trim()))
        .filter((value) => Number.isFinite(value) && value > 0);
    const uniq = Array.from(new Set(chunks));
    uniq.sort((a, b) => a - b);
    return uniq;
}

function normalizeRegionConfigs(input: RegionConfig[]): RegionConfig[] {
    const map = new Map<LKMRegion, RegionConfig>();
    defaultRegionConfigs.forEach((base) => {
        map.set(base.region, { ...base });
    });
    input.forEach((cfg) => {
        const region = cfg.region;
        map.set(region, {
            ...map.get(region),
            ...cfg,
            region,
        } as RegionConfig);
    });
    return Array.from(map.values());
}

export default function PaymentsPage() {
    const [config, setConfig] = useState<LKMAdminConfig>(defaultConfig);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [cisPackagesText, setCisPackagesText] = useState('199, 499, 999, 1999, 3999');
    const [nonCisPackagesText, setNonCisPackagesText] = useState('499, 999, 1999, 3999');

    const [previewRegion, setPreviewRegion] = useState<LKMRegion>('cis');
    const [previewCurrency, setPreviewCurrency] = useState('RUB');
    const [previewGateway, setPreviewGateway] = useState('yookassa');
    const [previewMethod, setPreviewMethod] = useState('default');
    const [previewLoading, setPreviewLoading] = useState(false);
    const [preview, setPreview] = useState<PreviewResponse | null>(null);

    const [manualQueueLoading, setManualQueueLoading] = useState(false);
    const [manualQueue, setManualQueue] = useState<TopupItem[]>([]);

    const regionConfigs = useMemo(
        () => normalizeRegionConfigs(config.regionConfigs || []),
        [config.regionConfigs],
    );

    useEffect(() => {
        loadConfig();
        loadManualQueue();
    }, []);

    const loadConfig = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get<LKMAdminConfig>('/admin/lkm/config');
            const data = response.data;
            setConfig({
                ...defaultConfig,
                ...data,
                globalConfig: {
                    nominalRubPerLkm: data.globalConfig?.nominalRubPerLkm ?? 1,
                },
                regionConfigs: normalizeRegionConfigs(data.regionConfigs || []),
            });

            const cisPackages = (data.packages || [])
                .filter((pkg) => pkg.region === 'cis' && pkg.isActive)
                .sort((a, b) => a.sortOrder - b.sortOrder || a.lkmAmount - b.lkmAmount)
                .map((pkg) => pkg.lkmAmount);
            const nonCisPackages = (data.packages || [])
                .filter((pkg) => pkg.region === 'non_cis' && pkg.isActive)
                .sort((a, b) => a.sortOrder - b.sortOrder || a.lkmAmount - b.lkmAmount)
                .map((pkg) => pkg.lkmAmount);

            if (cisPackages.length > 0) {
                setCisPackagesText(listToString(cisPackages));
            }
            if (nonCisPackages.length > 0) {
                setNonCisPackagesText(listToString(nonCisPackages));
            }
        } catch (loadErr) {
            console.error(loadErr);
            setError('Не удалось загрузить LKM payment config');
        } finally {
            setLoading(false);
        }
    };

    const loadManualQueue = async () => {
        setManualQueueLoading(true);
        try {
            const response = await api.get<{ items: TopupItem[] }>('/admin/lkm/topups', {
                params: { status: 'manual_review', limit: 100 },
            });
            setManualQueue(response.data.items || []);
        } catch (queueErr) {
            console.error(queueErr);
        } finally {
            setManualQueueLoading(false);
        }
    };

    const setRegionValue = (region: LKMRegion, field: keyof RegionConfig, value: number) => {
        setConfig((prev) => ({
            ...prev,
            regionConfigs: normalizeRegionConfigs(prev.regionConfigs).map((cfg) =>
                cfg.region === region ? { ...cfg, [field]: value } : cfg,
            ),
        }));
    };

    const saveConfig = async () => {
        setSaving(true);
        setSaveSuccess(false);
        setError(null);

        try {
            const cisPackages = parseNumberList(cisPackagesText);
            const nonCisPackages = parseNumberList(nonCisPackagesText);
            const normalizedRegionConfigs = normalizeRegionConfigs(config.regionConfigs);

            const packages: PackageConfig[] = [
                ...cisPackages.map((lkmAmount, index) => ({
                    region: 'cis' as LKMRegion,
                    lkmAmount,
                    sortOrder: index + 1,
                    isActive: true,
                })),
                ...nonCisPackages.map((lkmAmount, index) => ({
                    region: 'non_cis' as LKMRegion,
                    lkmAmount,
                    sortOrder: index + 1,
                    isActive: true,
                })),
            ];

            const payload: LKMAdminConfig = {
                globalConfig: {
                    nominalRubPerLkm: Number(config.globalConfig.nominalRubPerLkm) > 0
                        ? Number(config.globalConfig.nominalRubPerLkm)
                        : 1,
                },
                gateways: config.gateways.map((item) => ({
                    ...item,
                    code: item.code.trim().toLowerCase(),
                    name: item.name.trim(),
                })),
                regionConfigs: normalizedRegionConfigs,
                packages,
                processingCosts: config.processingCosts.map((cost) => ({
                    ...cost,
                    gatewayCode: cost.gatewayCode.trim().toLowerCase(),
                    paymentMethod: cost.paymentMethod.trim().toLowerCase() || 'default',
                })),
                fxRates: config.fxRates.map((fx) => ({
                    ...fx,
                    currency: fx.currency.trim().toUpperCase(),
                })),
                riskTiers: config.riskTiers.map((tier) => ({
                    ...tier,
                    name: tier.name.trim(),
                })),
            };

            await api.put('/admin/lkm/config', payload);
            setSaveSuccess(true);
            await loadConfig();
            await loadManualQueue();
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (saveErr) {
            console.error(saveErr);
            setError('Не удалось сохранить конфигурацию');
        } finally {
            setSaving(false);
        }
    };

    const refreshPreview = async () => {
        setPreviewLoading(true);
        try {
            const response = await api.get<PreviewResponse>('/admin/lkm/preview', {
                params: {
                    region: previewRegion,
                    currency: previewCurrency,
                    gatewayCode: previewGateway,
                    paymentMethod: previewMethod,
                },
            });
            setPreview(response.data);
        } catch (previewErr) {
            console.error(previewErr);
            setPreview(null);
        } finally {
            setPreviewLoading(false);
        }
    };

    const approveTopup = async (topupId: string) => {
        try {
            await api.post(`/admin/lkm/topups/${topupId}/approve`, { note: 'manual approved in admin' });
            await loadManualQueue();
        } catch (approveErr) {
            console.error(approveErr);
        }
    };

    const rejectTopup = async (topupId: string) => {
        try {
            await api.post(`/admin/lkm/topups/${topupId}/reject`, { note: 'manual rejected in admin' });
            await loadManualQueue();
        } catch (rejectErr) {
            console.error(rejectErr);
        }
    };

    const markTopupPaid = async (topupId: string) => {
        try {
            await api.post(`/admin/lkm/topups/${topupId}/mark-paid`, {});
            await loadManualQueue();
        } catch (markErr) {
            console.error(markErr);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[50vh] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-10">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">LKM Payments</h1>
                    <p className="text-[var(--muted-foreground)] mt-2">
                        Управление пакетами пополнения, processing costs, manual FX, риск-порогами и manual review.
                    </p>
                </div>
                <button
                    onClick={saveConfig}
                    disabled={saving}
                    className="inline-flex items-center gap-2 bg-[var(--primary)] text-white px-5 py-3 rounded-xl font-semibold disabled:opacity-60"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Сохранить
                </button>
            </div>

            {error && (
                <div className="p-4 rounded-xl border border-red-400/40 bg-red-500/10 text-red-500 text-sm">
                    {error}
                </div>
            )}
            {saveSuccess && (
                <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Конфигурация сохранена
                </div>
            )}

            <section className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-5">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-[var(--primary)]" />
                    Номинальный курс LKM
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-end">
                    <label className="text-sm">
                        1 LKM = ? RUB
                        <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={config.globalConfig.nominalRubPerLkm}
                            onChange={(e) => setConfig((prev) => ({
                                ...prev,
                                globalConfig: {
                                    nominalRubPerLkm: Number(e.target.value),
                                },
                            }))}
                            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2"
                        />
                    </label>
                    <p className="text-sm text-[var(--muted-foreground)] lg:col-span-2">
                        По умолчанию: <b>1.00 RUB</b>. Можно задать, например, <b>1.05</b>, и все quote/packages будут считаться по новому номиналу.
                    </p>
                </div>
            </section>

            <section className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-5">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-[var(--primary)]" />
                    Региональные пакеты и custom границы
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {regionConfigs.map((cfg) => (
                        <div key={cfg.region} className="space-y-3 p-4 rounded-xl border border-[var(--border)] bg-[var(--secondary)]/20">
                            <p className="font-semibold uppercase tracking-wide text-xs text-[var(--muted-foreground)]">{cfg.region}</p>
                            <div className="grid grid-cols-3 gap-3">
                                <label className="text-sm">
                                    Min
                                    <input
                                        type="number"
                                        value={cfg.customMinLkm}
                                        onChange={(e) => setRegionValue(cfg.region, 'customMinLkm', Number(e.target.value))}
                                        className="mt-1 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2"
                                    />
                                </label>
                                <label className="text-sm">
                                    Max
                                    <input
                                        type="number"
                                        value={cfg.customMaxLkm}
                                        onChange={(e) => setRegionValue(cfg.region, 'customMaxLkm', Number(e.target.value))}
                                        className="mt-1 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2"
                                    />
                                </label>
                                <label className="text-sm">
                                    Step
                                    <input
                                        type="number"
                                        value={cfg.customStepLkm}
                                        onChange={(e) => setRegionValue(cfg.region, 'customStepLkm', Number(e.target.value))}
                                        className="mt-1 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2"
                                    />
                                </label>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <label className="text-sm">
                        Fixed пакеты CIS (через запятую)
                        <input
                            type="text"
                            value={cisPackagesText}
                            onChange={(e) => setCisPackagesText(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2"
                        />
                    </label>
                    <label className="text-sm">
                        Fixed пакеты non-CIS (через запятую)
                        <input
                            type="text"
                            value={nonCisPackagesText}
                            onChange={(e) => setNonCisPackagesText(e.target.value)}
                            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2"
                        />
                    </label>
                </div>
            </section>

            <section className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-5">
                <h2 className="text-xl font-bold">Шлюзы и processing costs</h2>
                <div className="space-y-3">
                    {config.gateways.map((gateway, index) => (
                        <div key={`${gateway.code}-${index}`} className="grid grid-cols-1 lg:grid-cols-5 gap-3 items-center">
                            <input
                                value={gateway.code}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setConfig((prev) => ({
                                        ...prev,
                                        gateways: prev.gateways.map((item, i) => i === index ? { ...item, code: value } : item),
                                    }));
                                }}
                                placeholder="code"
                                className="rounded-lg border border-[var(--border)] bg-transparent px-3 py-2"
                            />
                            <input
                                value={gateway.name}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setConfig((prev) => ({
                                        ...prev,
                                        gateways: prev.gateways.map((item, i) => i === index ? { ...item, name: value } : item),
                                    }));
                                }}
                                placeholder="name"
                                className="rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 lg:col-span-2"
                            />
                            <label className="inline-flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={gateway.isEnabled}
                                    onChange={(e) => {
                                        const checked = e.target.checked;
                                        setConfig((prev) => ({
                                            ...prev,
                                            gateways: prev.gateways.map((item, i) => i === index ? { ...item, isEnabled: checked } : item),
                                        }));
                                    }}
                                />
                                Enabled
                            </label>
                            <button
                                onClick={() => setConfig((prev) => ({
                                    ...prev,
                                    gateways: prev.gateways.filter((_, i) => i !== index),
                                }))}
                                className="justify-self-start px-3 py-2 text-sm rounded-lg border border-red-400/30 text-red-500"
                            >
                                Remove
                            </button>
                        </div>
                    ))}
                    <button
                        onClick={() => setConfig((prev) => ({
                            ...prev,
                            gateways: [...prev.gateways, { code: '', name: '', isEnabled: true }],
                        }))}
                        className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm"
                    >
                        Add gateway
                    </button>
                </div>

                <div className="space-y-3">
                    {(config.processingCosts || []).map((cost, index) => (
                        <div key={`${cost.gatewayCode}-${cost.paymentMethod}-${index}`} className="grid grid-cols-1 lg:grid-cols-7 gap-3 items-center">
                            <input
                                value={cost.gatewayCode}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setConfig((prev) => ({
                                        ...prev,
                                        processingCosts: prev.processingCosts.map((item, i) => i === index ? { ...item, gatewayCode: value } : item),
                                    }));
                                }}
                                placeholder="gateway"
                                className="rounded-lg border border-[var(--border)] bg-transparent px-3 py-2"
                            />
                            <input
                                value={cost.paymentMethod}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setConfig((prev) => ({
                                        ...prev,
                                        processingCosts: prev.processingCosts.map((item, i) => i === index ? { ...item, paymentMethod: value } : item),
                                    }));
                                }}
                                placeholder="method"
                                className="rounded-lg border border-[var(--border)] bg-transparent px-3 py-2"
                            />
                            <select
                                value={cost.region}
                                onChange={(e) => {
                                    const value = e.target.value as LKMRegion;
                                    setConfig((prev) => ({
                                        ...prev,
                                        processingCosts: prev.processingCosts.map((item, i) => i === index ? { ...item, region: value } : item),
                                    }));
                                }}
                                className="rounded-lg border border-[var(--border)] bg-transparent px-3 py-2"
                            >
                                <option value="cis">cis</option>
                                <option value="non_cis">non_cis</option>
                            </select>
                            <input
                                type="number"
                                value={cost.percent}
                                onChange={(e) => {
                                    const value = Number(e.target.value);
                                    setConfig((prev) => ({
                                        ...prev,
                                        processingCosts: prev.processingCosts.map((item, i) => i === index ? { ...item, percent: value } : item),
                                    }));
                                }}
                                placeholder="%"
                                className="rounded-lg border border-[var(--border)] bg-transparent px-3 py-2"
                            />
                            <input
                                type="number"
                                value={cost.fixedRub}
                                onChange={(e) => {
                                    const value = Number(e.target.value);
                                    setConfig((prev) => ({
                                        ...prev,
                                        processingCosts: prev.processingCosts.map((item, i) => i === index ? { ...item, fixedRub: value } : item),
                                    }));
                                }}
                                placeholder="fixed RUB"
                                className="rounded-lg border border-[var(--border)] bg-transparent px-3 py-2"
                            />
                            <label className="inline-flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={cost.isEnabled}
                                    onChange={(e) => {
                                        const checked = e.target.checked;
                                        setConfig((prev) => ({
                                            ...prev,
                                            processingCosts: prev.processingCosts.map((item, i) => i === index ? { ...item, isEnabled: checked } : item),
                                        }));
                                    }}
                                />
                                Enabled
                            </label>
                            <button
                                onClick={() => setConfig((prev) => ({
                                    ...prev,
                                    processingCosts: prev.processingCosts.filter((_, i) => i !== index),
                                }))}
                                className="justify-self-start px-3 py-2 text-sm rounded-lg border border-red-400/30 text-red-500"
                            >
                                Remove
                            </button>
                        </div>
                    ))}
                    <button
                        onClick={() => setConfig((prev) => ({
                            ...prev,
                            processingCosts: [
                                ...prev.processingCosts,
                                {
                                    gatewayCode: 'yookassa',
                                    paymentMethod: 'default',
                                    region: 'cis',
                                    percent: 0,
                                    fixedRub: 0,
                                    isEnabled: true,
                                },
                            ],
                        }))}
                        className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm"
                    >
                        Add processing cost row
                    </button>
                </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
                    <h2 className="text-xl font-bold">Manual FX (RUB → currency)</h2>
                    {config.fxRates.map((fx, index) => (
                        <div key={`${fx.currency}-${index}`} className="grid grid-cols-4 gap-3 items-center">
                            <input
                                value={fx.currency}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setConfig((prev) => ({
                                        ...prev,
                                        fxRates: prev.fxRates.map((item, i) => i === index ? { ...item, currency: value } : item),
                                    }));
                                }}
                                className="rounded-lg border border-[var(--border)] bg-transparent px-3 py-2"
                                placeholder="USD"
                            />
                            <input
                                type="number"
                                value={fx.rubPerUnit}
                                onChange={(e) => {
                                    const value = Number(e.target.value);
                                    setConfig((prev) => ({
                                        ...prev,
                                        fxRates: prev.fxRates.map((item, i) => i === index ? { ...item, rubPerUnit: value } : item),
                                    }));
                                }}
                                className="rounded-lg border border-[var(--border)] bg-transparent px-3 py-2"
                                placeholder="rub per 1 unit"
                            />
                            <label className="inline-flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={fx.isActive}
                                    onChange={(e) => {
                                        const checked = e.target.checked;
                                        setConfig((prev) => ({
                                            ...prev,
                                            fxRates: prev.fxRates.map((item, i) => i === index ? { ...item, isActive: checked } : item),
                                        }));
                                    }}
                                />
                                Active
                            </label>
                            <button
                                onClick={() => setConfig((prev) => ({
                                    ...prev,
                                    fxRates: prev.fxRates.filter((_, i) => i !== index),
                                }))}
                                className="px-3 py-2 text-sm rounded-lg border border-red-400/30 text-red-500"
                            >
                                Remove
                            </button>
                        </div>
                    ))}
                    <button
                        onClick={() => setConfig((prev) => ({
                            ...prev,
                            fxRates: [...prev.fxRates, { currency: '', rubPerUnit: 0, isActive: true }],
                        }))}
                        className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm"
                    >
                        Add FX rate
                    </button>
                </div>

                <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
                    <h2 className="text-xl font-bold">Risk tiers</h2>
                    {config.riskTiers.map((tier, index) => (
                        <div key={`${tier.name}-${index}`} className="grid grid-cols-6 gap-2 items-center">
                            <input
                                value={tier.name}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setConfig((prev) => ({
                                        ...prev,
                                        riskTiers: prev.riskTiers.map((item, i) => i === index ? { ...item, name: value } : item),
                                    }));
                                }}
                                placeholder="name"
                                className="rounded-lg border border-[var(--border)] bg-transparent px-2 py-2 text-sm"
                            />
                            <select
                                value={tier.action}
                                onChange={(e) => {
                                    const value = e.target.value as LKMRiskAction;
                                    setConfig((prev) => ({
                                        ...prev,
                                        riskTiers: prev.riskTiers.map((item, i) => i === index ? { ...item, action: value } : item),
                                    }));
                                }}
                                className="rounded-lg border border-[var(--border)] bg-transparent px-2 py-2 text-sm"
                            >
                                <option value="auto">auto</option>
                                <option value="enhanced">enhanced</option>
                                <option value="manual">manual</option>
                            </select>
                            <input
                                type="number"
                                value={tier.minLkm}
                                onChange={(e) => {
                                    const value = Number(e.target.value);
                                    setConfig((prev) => ({
                                        ...prev,
                                        riskTiers: prev.riskTiers.map((item, i) => i === index ? { ...item, minLkm: value } : item),
                                    }));
                                }}
                                placeholder="min"
                                className="rounded-lg border border-[var(--border)] bg-transparent px-2 py-2 text-sm"
                            />
                            <input
                                type="number"
                                value={tier.maxLkm}
                                onChange={(e) => {
                                    const value = Number(e.target.value);
                                    setConfig((prev) => ({
                                        ...prev,
                                        riskTiers: prev.riskTiers.map((item, i) => i === index ? { ...item, maxLkm: value } : item),
                                    }));
                                }}
                                placeholder="max"
                                className="rounded-lg border border-[var(--border)] bg-transparent px-2 py-2 text-sm"
                            />
                            <label className="inline-flex items-center gap-1 text-xs">
                                <input
                                    type="checkbox"
                                    checked={tier.isEnabled}
                                    onChange={(e) => {
                                        const checked = e.target.checked;
                                        setConfig((prev) => ({
                                            ...prev,
                                            riskTiers: prev.riskTiers.map((item, i) => i === index ? { ...item, isEnabled: checked } : item),
                                        }));
                                    }}
                                />
                                Active
                            </label>
                            <button
                                onClick={() => setConfig((prev) => ({
                                    ...prev,
                                    riskTiers: prev.riskTiers.filter((_, i) => i !== index),
                                }))}
                                className="px-2 py-2 text-xs rounded-lg border border-red-400/30 text-red-500"
                            >
                                Remove
                            </button>
                        </div>
                    ))}
                    <button
                        onClick={() => setConfig((prev) => ({
                            ...prev,
                            riskTiers: [
                                ...prev.riskTiers,
                                {
                                    name: '',
                                    action: 'auto',
                                    minLkm: 0,
                                    maxLkm: 0,
                                    sortOrder: prev.riskTiers.length + 1,
                                    isEnabled: true,
                                },
                            ],
                        }))}
                        className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm"
                    >
                        Add risk tier
                    </button>
                </div>
            </section>

            <section className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-5">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-[var(--primary)]" />
                    Preview “что увидит пользователь”
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
                    <select
                        value={previewRegion}
                        onChange={(e) => setPreviewRegion(e.target.value as LKMRegion)}
                        className="rounded-lg border border-[var(--border)] bg-transparent px-3 py-2"
                    >
                        <option value="cis">cis</option>
                        <option value="non_cis">non_cis</option>
                    </select>
                    <input
                        value={previewCurrency}
                        onChange={(e) => setPreviewCurrency(e.target.value.toUpperCase())}
                        className="rounded-lg border border-[var(--border)] bg-transparent px-3 py-2"
                        placeholder="currency"
                    />
                    <input
                        value={previewGateway}
                        onChange={(e) => setPreviewGateway(e.target.value.toLowerCase())}
                        className="rounded-lg border border-[var(--border)] bg-transparent px-3 py-2"
                        placeholder="gateway"
                    />
                    <input
                        value={previewMethod}
                        onChange={(e) => setPreviewMethod(e.target.value.toLowerCase())}
                        className="rounded-lg border border-[var(--border)] bg-transparent px-3 py-2"
                        placeholder="method"
                    />
                    <button
                        onClick={refreshPreview}
                        disabled={previewLoading}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--primary)] text-white px-4 py-2 font-semibold disabled:opacity-60"
                    >
                        {previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        Обновить
                    </button>
                </div>

                {preview && (
                    <div className="space-y-3">
                        <p className="text-sm text-[var(--muted-foreground)]">{preview.disclaimer}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                            Номинальный курс в preview: 1 LKM = {preview.nominalRubPerLkm.toFixed(2)} RUB
                        </p>
                        <div className="overflow-auto border border-[var(--border)] rounded-xl">
                            <table className="w-full text-sm">
                                <thead className="bg-[var(--secondary)]/30">
                                    <tr>
                                        <th className="text-left px-3 py-2">LKM</th>
                                        <th className="text-left px-3 py-2">Вы получите</th>
                                        <th className="text-left px-3 py-2">Итого к оплате</th>
                                        <th className="text-left px-3 py-2">Номинал RUB</th>
                                        <th className="text-left px-3 py-2">Processing RUB</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {preview.packages.map((pkg) => (
                                        <tr key={`${pkg.lkmAmount}-${pkg.payCurrency}`} className="border-t border-[var(--border)]">
                                            <td className="px-3 py-2">{pkg.lkmAmount}</td>
                                            <td className="px-3 py-2">{pkg.receiveLkm} LKM</td>
                                            <td className="px-3 py-2">{pkg.totalPayAmount.toFixed(2)} {pkg.payCurrency}</td>
                                            <td className="px-3 py-2">{pkg.nominalRub.toFixed(2)}</td>
                                            <td className="px-3 py-2">{pkg.processingCostRub.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </section>

            <section className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Clock3 className="w-5 h-5 text-amber-500" />
                        Manual review queue
                    </h2>
                    <button
                        onClick={loadManualQueue}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] text-sm"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                </div>

                {manualQueueLoading ? (
                    <div className="py-12 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
                    </div>
                ) : manualQueue.length === 0 ? (
                    <div className="py-8 text-sm text-[var(--muted-foreground)] border border-dashed border-[var(--border)] rounded-xl text-center">
                        Очередь manual review пуста
                    </div>
                ) : (
                    <div className="space-y-3">
                        {manualQueue.map((item) => (
                            <div key={item.topupId} className="p-4 rounded-xl border border-[var(--border)] bg-[var(--secondary)]/20">
                                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                                    <div className="text-sm">
                                        <p className="font-semibold">{item.topupId}</p>
                                        <p className="text-[var(--muted-foreground)]">
                                            user #{item.userId} · {item.receiveLkm} LKM · {item.totalPayAmount.toFixed(2)} {item.payCurrency}
                                        </p>
                                        <p className="text-[var(--muted-foreground)]">
                                            gateway: {item.gatewayCode}/{item.paymentMethod} · risk: {item.riskAction}
                                            {item.riskReason ? ` (${item.riskReason})` : ''}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={() => approveTopup(item.topupId)}
                                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-500/30 text-emerald-500 text-sm"
                                        >
                                            <CheckCircle2 className="w-4 h-4" />
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => rejectTopup(item.topupId)}
                                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-red-500/30 text-red-500 text-sm"
                                        >
                                            <XCircle className="w-4 h-4" />
                                            Reject
                                        </button>
                                        <button
                                            onClick={() => markTopupPaid(item.topupId)}
                                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-500/30 text-amber-500 text-sm"
                                        >
                                            <AlertTriangle className="w-4 h-4" />
                                            Mark paid (test)
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
