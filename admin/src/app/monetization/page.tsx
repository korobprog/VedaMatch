'use client';

import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle,
    Coins,
    ExternalLink,
    Loader2,
    RefreshCw,
    Save,
    Settings2,
    WalletCards,
} from 'lucide-react';
import api from '@/lib/api';

type MonetizationSectionCode =
    | 'lkm_topup'
    | 'pro'
    | 'services_fee'
    | 'market_fee'
    | 'cafe_fee'
    | 'shop_plans'
    | 'shop_promotions'
    | 'chat_transcribe'
    | 'yatra_billing'
    | 'service_tariffs_summary';

interface MonetizationItem {
    key: string;
    label: string;
    value?: any;
    meta?: Record<string, any>;
}

interface MonetizationAction {
    label: string;
    path: string;
    kind: string;
}

interface MonetizationSection {
    sectionCode: MonetizationSectionCode;
    title: string;
    status: string;
    source: string;
    editable: boolean;
    lastUpdatedAt?: string;
    items: MonetizationItem[];
    actions?: MonetizationAction[];
}

interface MonetizationOverviewResponse {
    sections: MonetizationSection[];
}

interface ServiceTariffSummary {
    tariffId: number;
    serviceId: number;
    serviceTitle: string;
    serviceStatus: string;
    ownerId: number;
    ownerDisplayName: string;
    tariffName: string;
    price: number;
    currency: string;
    durationMinutes: number;
    sessionsCount: number;
    validityDays: number;
    isActive: boolean;
    isDefault: boolean;
}

interface LKMAdminConfig {
    globalConfig: {
        nominalRubPerLkm: number;
    };
    gateways: Array<{ code: string; name: string; isEnabled: boolean }>;
    packages: Array<{ region: string; lkmAmount: number; isActive: boolean }>;
}

type FeeForm = {
    isEnabled: boolean;
    percentBps: number;
    capLkm: number;
    rolloutPercent: number;
    applyNoShow?: boolean;
    minOrderLkm?: number;
};

type ProPlanForm = {
    code: string;
    title: string;
    days: number;
    priceLkm: number;
    badge: string;
    isPopular: boolean;
    isEnabled: boolean;
};

type PromotionForm = {
    code: string;
    scope: string;
    priceLkm: number;
    durationMinutes: number;
    isActive: boolean;
};

type ShopPlanForm = {
    code: string;
    priceLkm: number;
    productsLimit: number;
    priorityRank: number;
    promoSlots: number;
    isActive: boolean;
};

function boolValue(section: MonetizationSection | undefined, key: string, fallback = false) {
    return Boolean(section?.items.find((item) => item.key === key)?.value ?? fallback);
}

function numberValue(section: MonetizationSection | undefined, key: string, fallback = 0) {
    const raw = section?.items.find((item) => item.key === key)?.value;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeSection(section: MonetizationSection): MonetizationSection {
    return {
        ...section,
        items: Array.isArray(section?.items) ? section.items : [],
        actions: Array.isArray(section?.actions) ? section.actions : [],
    };
}

function statusTone(status: string) {
    switch (status) {
        case 'active':
            return 'text-emerald-600 bg-emerald-50 border-emerald-200';
        case 'disabled':
            return 'text-amber-700 bg-amber-50 border-amber-200';
        default:
            return 'text-slate-700 bg-slate-50 border-slate-200';
    }
}

export default function MonetizationPage() {
    const [overview, setOverview] = useState<MonetizationSection[]>([]);
    const [serviceTariffs, setServiceTariffs] = useState<ServiceTariffSummary[]>([]);
    const [lkmConfig, setLkmConfig] = useState<LKMAdminConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [savingCode, setSavingCode] = useState<string | null>(null);
    const [tariffSearch, setTariffSearch] = useState('');

    const [proPlans, setProPlans] = useState<ProPlanForm[]>([]);
    const [chatForm, setChatForm] = useState({
        isEnabled: true,
        freeMinPerWeek: 5,
        pricePerMinLkm: 3,
        longAudioThresholdMin: 5,
        longAudioPricePerMinLkm: 2,
        minChargeLkm: 1,
    });
    const [yatraForm, setYatraForm] = useState({
        isEnabled: false,
        dailyFeeLkm: 10,
    });
    const [serviceFeeForm, setServiceFeeForm] = useState<FeeForm>({
        isEnabled: true,
        percentBps: 800,
        capLkm: 300,
        rolloutPercent: 100,
        applyNoShow: true,
    });
    const [marketFeeForm, setMarketFeeForm] = useState<FeeForm>({
        isEnabled: true,
        percentBps: 800,
        capLkm: 300,
        rolloutPercent: 100,
    });
    const [cafeFeeForm, setCafeFeeForm] = useState<FeeForm>({
        isEnabled: false,
        percentBps: 800,
        capLkm: 250,
        rolloutPercent: 0,
        minOrderLkm: 100,
    });
    const [shopPlans, setShopPlans] = useState<ShopPlanForm[]>([]);
    const [shopPromotions, setShopPromotions] = useState<PromotionForm[]>([]);

    const sectionsMap = useMemo(
        () => new Map(overview.map((section) => [section.sectionCode, normalizeSection(section)])),
        [overview],
    );

    useEffect(() => {
        void loadAll(false);
    }, []);

    useEffect(() => {
        const proSection = sectionsMap.get('pro');
        if (proSection) {
            setProPlans(
                (proSection.items || []).map((item) => ({
                    code: item.key,
                    title: item.label,
                    days: Number(item.meta?.days || 0),
                    priceLkm: Number(item.value || 0),
                    badge: String(item.meta?.badge || ''),
                    isPopular: Boolean(item.meta?.isPopular),
                    isEnabled: Boolean(item.meta?.isEnabled),
                })),
            );
        }

        const chatSection = sectionsMap.get('chat_transcribe');
        if (chatSection) {
            setChatForm({
                isEnabled: boolValue(chatSection, 'enabled', true),
                freeMinPerWeek: numberValue(chatSection, 'free_min_per_week', 5),
                pricePerMinLkm: numberValue(chatSection, 'price_per_min_lkm', 3),
                longAudioThresholdMin: numberValue(chatSection, 'long_audio_threshold_min', 5),
                longAudioPricePerMinLkm: numberValue(chatSection, 'long_audio_price_per_min_lkm', 2),
                minChargeLkm: numberValue(chatSection, 'min_charge_lkm', 1),
            });
        }

        const yatraSection = sectionsMap.get('yatra_billing');
        if (yatraSection) {
            setYatraForm({
                isEnabled: boolValue(yatraSection, 'enabled', false),
                dailyFeeLkm: numberValue(yatraSection, 'daily_fee_lkm', 10),
            });
        }

        const servicesSection = sectionsMap.get('services_fee');
        if (servicesSection) {
            setServiceFeeForm({
                isEnabled: boolValue(servicesSection, 'enabled', true),
                percentBps: numberValue(servicesSection, 'percent_bps', 800),
                capLkm: numberValue(servicesSection, 'cap_lkm', 300),
                rolloutPercent: numberValue(servicesSection, 'rollout_percent', 100),
                applyNoShow: boolValue(servicesSection, 'apply_no_show', true),
            });
        }

        const marketSection = sectionsMap.get('market_fee');
        if (marketSection) {
            setMarketFeeForm({
                isEnabled: boolValue(marketSection, 'enabled', true),
                percentBps: numberValue(marketSection, 'percent_bps', 800),
                capLkm: numberValue(marketSection, 'cap_lkm', 300),
                rolloutPercent: numberValue(marketSection, 'rollout_percent', 100),
            });
        }

        const cafeSection = sectionsMap.get('cafe_fee');
        if (cafeSection) {
            setCafeFeeForm({
                isEnabled: boolValue(cafeSection, 'enabled', false),
                percentBps: numberValue(cafeSection, 'percent_bps', 800),
                capLkm: numberValue(cafeSection, 'cap_lkm', 250),
                rolloutPercent: numberValue(cafeSection, 'rollout_percent', 0),
                minOrderLkm: numberValue(cafeSection, 'min_order_lkm', 100),
            });
        }

        const shopPlanSection = sectionsMap.get('shop_plans');
        if (shopPlanSection) {
            setShopPlans(
                (shopPlanSection.items || []).map((item) => ({
                    code: item.key,
                    priceLkm: Number(item.value || 0),
                    productsLimit: Number(item.meta?.productsLimit || 0),
                    priorityRank: Number(item.meta?.priorityRank || 0),
                    promoSlots: Number(item.meta?.promoSlots || 0),
                    isActive: Boolean(item.meta?.isActive),
                })),
            );
        }

        const promoSection = sectionsMap.get('shop_promotions');
        if (promoSection) {
            setShopPromotions(
                (promoSection.items || []).map((item) => ({
                    code: item.key,
                    scope: String(item.meta?.scope || ''),
                    priceLkm: Number(item.value || 0),
                    durationMinutes: Number(item.meta?.durationMinutes || 0),
                    isActive: Boolean(item.meta?.isActive),
                })),
            );
        }
    }, [sectionsMap]);

    const filteredServiceTariffs = useMemo(() => {
        const needle = tariffSearch.trim().toLowerCase();
        if (!needle) {
            return serviceTariffs;
        }
        return serviceTariffs.filter((item) =>
            item.serviceTitle.toLowerCase().includes(needle) ||
            item.tariffName.toLowerCase().includes(needle) ||
            item.ownerDisplayName.toLowerCase().includes(needle),
        );
    }, [serviceTariffs, tariffSearch]);

    const loadAll = async (softRefresh: boolean) => {
        if (softRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }
        setError(null);

        try {
            const [overviewRes, tariffsRes, lkmRes] = await Promise.all([
                api.get<MonetizationOverviewResponse>('/admin/monetization/overview'),
                api.get<{ items: ServiceTariffSummary[] }>('/admin/monetization/service-tariffs'),
                api.get<LKMAdminConfig>('/admin/lkm/config'),
            ]);
            setOverview(Array.isArray(overviewRes.data?.sections) ? overviewRes.data.sections.map(normalizeSection) : []);
            setServiceTariffs(Array.isArray(tariffsRes.data?.items) ? tariffsRes.data.items : []);
            setLkmConfig(lkmRes.data);
        } catch (err) {
            console.error(err);
            setError('Не удалось загрузить центр монетизации');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const showSuccess = (message: string) => {
        setSuccess(message);
        window.setTimeout(() => setSuccess(null), 2500);
    };

    const saveSection = async (sectionCode: string, endpoint: string, payload: unknown) => {
        setSavingCode(sectionCode);
        setError(null);
        try {
            await api.put(endpoint, payload);
            await loadAll(true);
            showSuccess('Секция сохранена');
        } catch (err) {
            console.error(err);
            setError('Не удалось сохранить секцию');
        } finally {
            setSavingCode(null);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 md:p-8">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[var(--secondary)] px-3 py-1 text-sm font-medium text-[var(--muted-foreground)]">
                            <Coins className="h-4 w-4" />
                            Source of truth: DB/API
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight">Monetization</h1>
                        <p className="mt-2 max-w-3xl text-sm text-[var(--muted-foreground)]">
                            Единый центр монетизации показывает реальные тарифы, комиссии и LKM-конфиг,
                            которые backend использует в расчетах и покупках.
                        </p>
                    </div>
                    <button
                        onClick={() => void loadAll(true)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--secondary)]"
                    >
                        {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        Обновить
                    </button>
                </div>

                {success && (
                    <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                        {success}
                    </div>
                )}
                {error && (
                    <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {overview.map((section) => (
                    <div key={section.sectionCode} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h2 className="font-semibold">{section.title}</h2>
                                <p className="mt-1 text-xs text-[var(--muted-foreground)]">source: {section.source}</p>
                            </div>
                            <span className={`rounded-full border px-2 py-1 text-xs font-medium ${statusTone(section.status)}`}>
                                {section.status}
                            </span>
                        </div>
                        {section.lastUpdatedAt && (
                            <p className="mt-3 text-xs text-[var(--muted-foreground)]">
                                updated: {new Date(section.lastUpdatedAt).toLocaleString()}
                            </p>
                        )}
                        {section.actions && section.actions.length > 0 && (
                            <div className="mt-4 space-y-2">
                                {section.actions.map((action) => (
                                    <a
                                        key={`${section.sectionCode}-${action.path}`}
                                        href={action.path}
                                        className="inline-flex items-center gap-2 text-sm font-medium text-[var(--primary)] hover:underline"
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                        {action.label}
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </section>

            <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6">
                <div className="mb-4 flex items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-semibold">LKM Top-up</h2>
                        <p className="text-sm text-[var(--muted-foreground)]">
                            Полный LKM-конфиг остается в специализированном экране, но его текущие значения видны и здесь.
                        </p>
                    </div>
                    <a
                        href="/payments"
                        className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white"
                    >
                        <WalletCards className="h-4 w-4" />
                        Открыть LKM Payments
                    </a>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                    <MetricCard label="Nominal rate" value={`${lkmConfig?.globalConfig.nominalRubPerLkm ?? 1} RUB / LKM`} />
                    <MetricCard label="Gateways" value={String(lkmConfig?.gateways?.length ?? 0)} />
                    <MetricCard label="Packages" value={String(lkmConfig?.packages?.length ?? 0)} />
                </div>
            </section>

            <EditableCard
                title="PRO"
                saving={savingCode === 'pro'}
                onSave={() => saveSection('pro', '/admin/monetization/pro', { plans: proPlans })}
            >
                <div className="space-y-3">
                    {proPlans.map((plan, index) => (
                        <div key={plan.code} className="grid gap-3 rounded-2xl border border-[var(--border)] p-4 md:grid-cols-6">
                            <Field label="Code" value={plan.code} onChange={(value) => updateAt(setProPlans, index, 'code', value)} />
                            <Field label="Title" value={plan.title} onChange={(value) => updateAt(setProPlans, index, 'title', value)} />
                            <NumberField label="Days" value={plan.days} onChange={(value) => updateAt(setProPlans, index, 'days', value)} />
                            <NumberField label="Price LKM" value={plan.priceLkm} onChange={(value) => updateAt(setProPlans, index, 'priceLkm', value)} />
                            <Field label="Badge" value={plan.badge} onChange={(value) => updateAt(setProPlans, index, 'badge', value)} />
                            <div className="grid gap-2 md:pt-6">
                                <Toggle label="Popular" checked={plan.isPopular} onChange={(value) => updateAt(setProPlans, index, 'isPopular', value)} />
                                <Toggle label="Enabled" checked={plan.isEnabled} onChange={(value) => updateAt(setProPlans, index, 'isEnabled', value)} />
                            </div>
                        </div>
                    ))}
                </div>
            </EditableCard>

            <div className="grid gap-6 xl:grid-cols-2">
                <EditableCard
                    title="Services Fee"
                    saving={savingCode === 'services_fee'}
                    onSave={() => saveSection('services_fee', '/admin/monetization/services-fee', serviceFeeForm)}
                >
                    <FeeFields form={serviceFeeForm} setForm={setServiceFeeForm} showApplyNoShow />
                </EditableCard>

                <EditableCard
                    title="Market Fee"
                    saving={savingCode === 'market_fee'}
                    onSave={() => saveSection('market_fee', '/admin/monetization/market-fee', marketFeeForm)}
                >
                    <FeeFields form={marketFeeForm} setForm={setMarketFeeForm} />
                </EditableCard>

                <EditableCard
                    title="Cafe Fee"
                    saving={savingCode === 'cafe_fee'}
                    onSave={() => saveSection('cafe_fee', '/admin/monetization/cafe-fee', cafeFeeForm)}
                >
                    <FeeFields form={cafeFeeForm} setForm={setCafeFeeForm} showMinOrder />
                </EditableCard>

                <EditableCard
                    title="Chat Transcribe"
                    saving={savingCode === 'chat_transcribe'}
                    onSave={() => saveSection('chat_transcribe', '/admin/monetization/chat-transcribe', chatForm)}
                >
                    <div className="grid gap-4 md:grid-cols-2">
                        <Toggle label="Enabled" checked={chatForm.isEnabled} onChange={(value) => setChatForm((prev) => ({ ...prev, isEnabled: value }))} />
                        <NumberField label="Free min / week" value={chatForm.freeMinPerWeek} onChange={(value) => setChatForm((prev) => ({ ...prev, freeMinPerWeek: value }))} />
                        <NumberField label="Price per min LKM" value={chatForm.pricePerMinLkm} onChange={(value) => setChatForm((prev) => ({ ...prev, pricePerMinLkm: value }))} />
                        <NumberField label="Long audio threshold" value={chatForm.longAudioThresholdMin} onChange={(value) => setChatForm((prev) => ({ ...prev, longAudioThresholdMin: value }))} />
                        <NumberField label="Long audio price / min" value={chatForm.longAudioPricePerMinLkm} onChange={(value) => setChatForm((prev) => ({ ...prev, longAudioPricePerMinLkm: value }))} />
                        <NumberField label="Min charge LKM" value={chatForm.minChargeLkm} onChange={(value) => setChatForm((prev) => ({ ...prev, minChargeLkm: value }))} />
                    </div>
                </EditableCard>

                <EditableCard
                    title="Yatra Billing"
                    saving={savingCode === 'yatra_billing'}
                    onSave={() => saveSection('yatra_billing', '/admin/monetization/yatra-billing', yatraForm)}
                >
                    <div className="grid gap-4 md:grid-cols-2">
                        <Toggle label="Enabled" checked={yatraForm.isEnabled} onChange={(value) => setYatraForm((prev) => ({ ...prev, isEnabled: value }))} />
                        <NumberField label="Daily fee LKM" value={yatraForm.dailyFeeLkm} onChange={(value) => setYatraForm((prev) => ({ ...prev, dailyFeeLkm: value }))} />
                    </div>
                </EditableCard>
            </div>

            <EditableCard
                title="Shop Plans"
                saving={savingCode === 'shop_plans'}
                onSave={() => saveSection('shop_plans', '/admin/monetization/shop-plans', { plans: shopPlans })}
            >
                <div className="space-y-3">
                    {shopPlans.map((plan, index) => (
                        <div key={plan.code} className="grid gap-3 rounded-2xl border border-[var(--border)] p-4 md:grid-cols-6">
                            <Field label="Code" value={plan.code} readOnly />
                            <NumberField label="Price LKM" value={plan.priceLkm} onChange={(value) => updateAt(setShopPlans, index, 'priceLkm', value)} />
                            <NumberField label="Products limit" value={plan.productsLimit} onChange={(value) => updateAt(setShopPlans, index, 'productsLimit', value)} />
                            <NumberField label="Priority rank" value={plan.priorityRank} onChange={(value) => updateAt(setShopPlans, index, 'priorityRank', value)} />
                            <NumberField label="Promo slots" value={plan.promoSlots} onChange={(value) => updateAt(setShopPlans, index, 'promoSlots', value)} />
                            <div className="md:pt-6">
                                <Toggle label="Active" checked={plan.isActive} onChange={(value) => updateAt(setShopPlans, index, 'isActive', value)} />
                            </div>
                        </div>
                    ))}
                </div>
            </EditableCard>

            <EditableCard
                title="Shop Promotions"
                saving={savingCode === 'shop_promotions'}
                onSave={() => saveSection('shop_promotions', '/admin/monetization/shop-promotions', { tariffs: shopPromotions })}
            >
                <div className="space-y-3">
                    {shopPromotions.map((plan, index) => (
                        <div key={plan.code} className="grid gap-3 rounded-2xl border border-[var(--border)] p-4 md:grid-cols-5">
                            <Field label="Code" value={plan.code} readOnly />
                            <Field label="Scope" value={plan.scope} readOnly />
                            <NumberField label="Price LKM" value={plan.priceLkm} onChange={(value) => updateAt(setShopPromotions, index, 'priceLkm', value)} />
                            <NumberField label="Duration min" value={plan.durationMinutes} onChange={(value) => updateAt(setShopPromotions, index, 'durationMinutes', value)} />
                            <div className="md:pt-6">
                                <Toggle label="Active" checked={plan.isActive} onChange={(value) => updateAt(setShopPromotions, index, 'isActive', value)} />
                            </div>
                        </div>
                    ))}
                </div>
            </EditableCard>

            <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6">
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="text-xl font-semibold">Services Tariffs Summary</h2>
                        <p className="text-sm text-[var(--muted-foreground)]">
                            Это витрина текущих тарифов услуг. Редактирование остается в домене самой услуги.
                        </p>
                    </div>
                    <div className="relative w-full md:w-80">
                        <Settings2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
                        <input
                            value={tariffSearch}
                            onChange={(event) => setTariffSearch(event.target.value)}
                            placeholder="Поиск по услуге, тарифу, владельцу"
                            className="w-full rounded-xl border border-[var(--border)] bg-transparent py-2 pl-10 pr-3 text-sm outline-none"
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead>
                            <tr className="border-b border-[var(--border)] text-left text-[var(--muted-foreground)]">
                                <th className="px-3 py-3">Service</th>
                                <th className="px-3 py-3">Owner</th>
                                <th className="px-3 py-3">Tariff</th>
                                <th className="px-3 py-3">Price</th>
                                <th className="px-3 py-3">Duration</th>
                                <th className="px-3 py-3">Sessions</th>
                                <th className="px-3 py-3">Default</th>
                                <th className="px-3 py-3">Active</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredServiceTariffs.map((item) => (
                                <tr key={item.tariffId} className="border-b border-[var(--border)]/70">
                                    <td className="px-3 py-3">
                                        <div className="font-medium">{item.serviceTitle}</div>
                                        <div className="text-xs text-[var(--muted-foreground)]">{item.serviceStatus}</div>
                                    </td>
                                    <td className="px-3 py-3">{item.ownerDisplayName}</td>
                                    <td className="px-3 py-3">{item.tariffName}</td>
                                    <td className="px-3 py-3">{item.price} {item.currency}</td>
                                    <td className="px-3 py-3">{item.durationMinutes} min</td>
                                    <td className="px-3 py-3">{item.sessionsCount}</td>
                                    <td className="px-3 py-3">{item.isDefault ? 'Yes' : 'No'}</td>
                                    <td className="px-3 py-3">{item.isActive ? 'Yes' : 'No'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredServiceTariffs.length === 0 && (
                        <div className="flex items-center gap-2 px-3 py-6 text-sm text-[var(--muted-foreground)]">
                            <AlertTriangle className="h-4 w-4" />
                            Тарифы не найдены по текущему фильтру.
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}

function MetricCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--secondary)]/20 p-4">
            <p className="text-sm text-[var(--muted-foreground)]">{label}</p>
            <p className="mt-2 text-xl font-semibold">{value}</p>
        </div>
    );
}

function EditableCard({
    title,
    children,
    saving,
    onSave,
}: {
    title: string;
    children: ReactNode;
    saving?: boolean;
    onSave: () => void;
}) {
    return (
        <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className="text-xl font-semibold">{title}</h2>
                <button
                    onClick={onSave}
                    className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
                    disabled={saving}
                >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Сохранить
                </button>
            </div>
            {children}
        </section>
    );
}

function Field({
    label,
    value,
    onChange,
    readOnly,
}: {
    label: string;
    value: string;
    onChange?: (value: string) => void;
    readOnly?: boolean;
}) {
    return (
        <label className="grid gap-2">
            <span className="text-xs font-medium text-[var(--muted-foreground)]">{label}</span>
            <input
                value={value}
                onChange={(event) => onChange?.(event.target.value)}
                readOnly={readOnly}
                className="rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none read-only:bg-[var(--secondary)]/20"
            />
        </label>
    );
}

function NumberField({
    label,
    value,
    onChange,
}: {
    label: string;
    value: number;
    onChange: (value: number) => void;
}) {
    return (
        <label className="grid gap-2">
            <span className="text-xs font-medium text-[var(--muted-foreground)]">{label}</span>
            <input
                type="number"
                value={value}
                onChange={(event) => onChange(Number(event.target.value))}
                className="rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none"
            />
        </label>
    );
}

function Toggle({
    label,
    checked,
    onChange,
}: {
    label: string;
    checked: boolean;
    onChange: (value: boolean) => void;
}) {
    return (
        <label className="inline-flex items-center gap-3 text-sm font-medium">
            <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
            {label}
        </label>
    );
}

function FeeFields({
    form,
    setForm,
    showApplyNoShow,
    showMinOrder,
}: {
    form: FeeForm;
    setForm: Dispatch<SetStateAction<FeeForm>>;
    showApplyNoShow?: boolean;
    showMinOrder?: boolean;
}) {
    return (
        <div className="grid gap-4 md:grid-cols-2">
            <Toggle label="Enabled" checked={form.isEnabled} onChange={(value) => setForm((prev) => ({ ...prev, isEnabled: value }))} />
            <NumberField label="Percent (bps)" value={form.percentBps} onChange={(value) => setForm((prev) => ({ ...prev, percentBps: value }))} />
            <NumberField label="Cap LKM" value={form.capLkm} onChange={(value) => setForm((prev) => ({ ...prev, capLkm: value }))} />
            <NumberField label="Rollout %" value={form.rolloutPercent} onChange={(value) => setForm((prev) => ({ ...prev, rolloutPercent: value }))} />
            {showApplyNoShow && (
                <Toggle label="Apply no-show" checked={Boolean(form.applyNoShow)} onChange={(value) => setForm((prev) => ({ ...prev, applyNoShow: value }))} />
            )}
            {showMinOrder && (
                <NumberField label="Min order LKM" value={Number(form.minOrderLkm || 0)} onChange={(value) => setForm((prev) => ({ ...prev, minOrderLkm: value }))} />
            )}
        </div>
    );
}

function updateAt<T extends Record<string, any>, K extends keyof T>(
    setter: Dispatch<SetStateAction<T[]>>,
    index: number,
    key: K,
    value: T[K],
) {
    setter((prev) => prev.map((item, idx) => (idx === index ? { ...item, [key]: value } : item)));
}
