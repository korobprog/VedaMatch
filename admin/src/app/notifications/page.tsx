"use client";

import {
  Bell,
  CalendarClock,
  Loader2,
  RefreshCw,
  Send,
  Users,
  XCircle,
} from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ui/ToastProvider";
import api from "@/lib/api";

interface NotificationItem {
  id: number;
  type: string;
  message: string;
  link?: string;
  linkTo?: string;
  isRead: boolean;
  read?: boolean;
  createdAt: string;
}

interface PushHealth {
  delivery_success_rate: number;
  invalid_token_rate: number;
  retry_rate: number;
  latency_p95: number;
  total_events: number;
  fcmConfigured: boolean;
  fcmKeySource: string;
}

interface Campaign {
  id: number;
  createdAt: string;
  title: string;
  body: string;
  priority: string;
  targetMode: string;
  targetUserId?: number;
  sendMode: string;
  status: string;
  scheduledFor?: string;
  startedAt?: string;
  finishedAt?: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  lastError?: string;
  data?: Record<string, string>;
  segmentFilters?: {
    role?: string;
    status?: string;
    hasPushToken?: boolean;
  };
}

interface CampaignRecipient {
  id: number;
  userId: number;
  status: string;
  attempts: number;
  error?: string;
  sentAt?: string;
  displayName?: string;
  email?: string;
}

interface CampaignDetailResponse {
  campaign: Campaign;
  recipients: CampaignRecipient[];
  recipientsTotal: number;
}

interface UserSearchResult {
  ID: number;
  spiritualName?: string;
  karmicName?: string;
  email: string;
  role: string;
  isBlocked?: boolean;
}

const normalizeNotification = (
  raw: Partial<NotificationItem> & {
    read?: unknown;
    isRead?: unknown;
    link?: unknown;
    linkTo?: unknown;
  },
): NotificationItem => ({
  id: Number(raw.id || 0),
  type: typeof raw.type === "string" ? raw.type : "unknown",
  message: typeof raw.message === "string" ? raw.message : "",
  createdAt: typeof raw.createdAt === "string" ? raw.createdAt : "",
  isRead: typeof raw.isRead === "boolean" ? raw.isRead : !!raw.read,
  read: typeof raw.read === "boolean" ? raw.read : undefined,
  link:
    typeof raw.link === "string"
      ? raw.link
      : typeof raw.linkTo === "string"
        ? raw.linkTo
        : undefined,
  linkTo: typeof raw.linkTo === "string" ? raw.linkTo : undefined,
});

const initialForm = {
  sendMode: "now",
  targetMode: "user",
  targetUserId: "",
  role: "user",
  status: "active",
  title: "",
  body: "",
  priority: "high",
  dataJson: '{\n  "type": "admin_campaign"\n}',
  scheduledFor: "",
};

const statusStyles: Record<string, string> = {
  scheduled: "bg-amber-50 text-amber-700 border-amber-200",
  processing: "bg-blue-50 text-blue-700 border-blue-200",
  sent: "bg-green-50 text-green-700 border-green-200",
  partial_failed: "bg-orange-50 text-orange-700 border-orange-200",
  failed: "bg-red-50 text-red-700 border-red-200",
  cancelled: "bg-slate-50 text-slate-700 border-slate-200",
  draft: "bg-slate-50 text-slate-700 border-slate-200",
};

export default function NotificationsPage() {
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [pushHealth, setPushHealth] = useState<PushHealth | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(
    null,
  );
  const [campaignDetail, setCampaignDetail] =
    useState<CampaignDetailResponse | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState<UserSearchResult[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [campaignStatusFilter, setCampaignStatusFilter] = useState("all");
  const [creatingCampaign, setCreatingCampaign] = useState(false);
  const [loadingCampaignDetail, setLoadingCampaignDetail] = useState(false);
  const [cancellingCampaignId, setCancellingCampaignId] = useState<
    number | null
  >(null);
  const [page, setPage] = useState(1);

  const fetchNotifications = useCallback(
    async (nextPage: number) => {
      setLoadingNotifications(true);
      try {
        const response = await api.get(
          `/admin/notifications?page=${nextPage}&limit=20`,
        );
        setNotifications(
          (response.data.notifications || []).map(normalizeNotification),
        );
      } catch (error) {
        console.error("Error fetching notifications:", error);
        showToast("Не удалось загрузить админ-уведомления", "error");
      } finally {
        setLoadingNotifications(false);
      }
    },
    [showToast],
  );

  const fetchPushHealth = useCallback(async () => {
    try {
      const response = await api.get("/admin/push/health?window_hours=24");
      setPushHealth(response.data);
    } catch (error) {
      console.error("Error fetching push health:", error);
      showToast("Не удалось загрузить метрики push", "error");
    }
  }, [showToast]);

  const fetchCampaigns = useCallback(async () => {
    setLoadingCampaigns(true);
    try {
      const query =
        campaignStatusFilter === "all"
          ? "/admin/push/campaigns?page=1&limit=20"
          : `/admin/push/campaigns?page=1&limit=20&status=${encodeURIComponent(campaignStatusFilter)}`;
      const response = await api.get(query);
      const nextCampaigns = response.data.campaigns || [];
      setCampaigns(nextCampaigns);
      if (nextCampaigns.length === 0) {
        setSelectedCampaignId(null);
        setCampaignDetail(null);
      } else if (
        !selectedCampaignId ||
        !nextCampaigns.some((item: Campaign) => item.id === selectedCampaignId)
      ) {
        setSelectedCampaignId(nextCampaigns[0].id);
      }
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      showToast("Не удалось загрузить журнал кампаний", "error");
    } finally {
      setLoadingCampaigns(false);
    }
  }, [campaignStatusFilter, selectedCampaignId, showToast]);

  const fetchCampaignDetail = useCallback(
    async (campaignId: number) => {
      setLoadingCampaignDetail(true);
      try {
        const response = await api.get(
          `/admin/push/campaigns/${campaignId}?page=1&limit=100`,
        );
        setCampaignDetail(response.data);
      } catch (error) {
        console.error("Error fetching campaign detail:", error);
        showToast("Не удалось загрузить детали кампании", "error");
      } finally {
        setLoadingCampaignDetail(false);
      }
    },
    [showToast],
  );

  useEffect(() => {
    void fetchNotifications(page);
  }, [fetchNotifications, page]);

  useEffect(() => {
    void fetchPushHealth();
    void fetchCampaigns();
  }, [fetchCampaigns, fetchPushHealth]);

  useEffect(() => {
    if (!selectedCampaignId) {
      setCampaignDetail(null);
      return;
    }
    void fetchCampaignDetail(selectedCampaignId);
  }, [fetchCampaignDetail, selectedCampaignId]);

  useEffect(() => {
    if (form.targetMode !== "user") {
      setUserResults([]);
      return;
    }

    const query = userSearch.trim();
    if (query.length < 2) {
      setUserResults([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      setLoadingUsers(true);
      try {
        const response = await api.get(
          `/admin/users?search=${encodeURIComponent(query)}&status=active`,
        );
        setUserResults((response.data || []).slice(0, 8));
      } catch (error) {
        console.error("Error searching users:", error);
        showToast("Не удалось найти пользователей", "error");
      } finally {
        setLoadingUsers(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [form.targetMode, userSearch, showToast]);

  const markAsRead = async (id: number) => {
    try {
      await api.post(`/admin/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, isRead: true, read: true } : item,
        ),
      );
    } catch (error) {
      console.error("Error marking notification as read:", error);
      showToast("Не удалось отметить уведомление как прочитанное", "error");
    }
  };

  const parsePayload = () => {
    const raw = form.dataJson.trim();
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      throw new Error("Payload должен быть JSON-объектом");
    }

    const result: Record<string, string> = {};
    Object.entries(parsed).forEach(([key, value]) => {
      result[key] = String(value);
    });
    return result;
  };

  const handleCreateCampaign = async () => {
    try {
      if (!form.title.trim() || !form.body.trim()) {
        showToast("Заполните заголовок и текст уведомления", "error");
        return;
      }
      if (form.targetMode === "user" && !form.targetUserId) {
        showToast("Выберите пользователя для отправки", "error");
        return;
      }
      if (form.sendMode === "scheduled" && !form.scheduledFor) {
        showToast("Укажите дату и время отправки", "error");
        return;
      }

      setCreatingCampaign(true);

      const payload: Record<string, unknown> = {
        sendMode: form.sendMode,
        targetMode: form.targetMode,
        title: form.title.trim(),
        body: form.body.trim(),
        priority: form.priority,
        data: parsePayload(),
      };

      if (form.targetMode === "user") {
        payload.targetUserId = Number(form.targetUserId);
      } else {
        payload.segmentFilters = {
          role: form.role,
          status: form.status,
          hasPushToken: true,
        };
      }

      if (form.sendMode === "scheduled") {
        payload.scheduledFor = new Date(form.scheduledFor).toISOString();
      }

      const response = await api.post("/admin/push/campaigns", payload);
      showToast(
        form.sendMode === "scheduled"
          ? "Кампания запланирована"
          : "Кампания отправлена",
        "success",
      );
      setForm(initialForm);
      setUserSearch("");
      setUserResults([]);
      await fetchCampaigns();
      setSelectedCampaignId(response.data.id);
      await fetchCampaignDetail(response.data.id);
    } catch (error: unknown) {
      console.error("Error creating campaign:", error);
      const message = getErrorMessage(error, "Не удалось создать кампанию");
      showToast(message, "error");
    } finally {
      setCreatingCampaign(false);
    }
  };

  const handleCancelCampaign = async (campaignId: number) => {
    setCancellingCampaignId(campaignId);
    try {
      await api.post(`/admin/push/campaigns/${campaignId}/cancel`);
      showToast("Запланированная кампания отменена", "success");
      await fetchCampaigns();
      if (selectedCampaignId === campaignId) {
        await fetchCampaignDetail(campaignId);
      }
    } catch (error: unknown) {
      console.error("Error cancelling campaign:", error);
      showToast(
        getErrorMessage(error, "Не удалось отменить кампанию"),
        "error",
      );
    } finally {
      setCancellingCampaignId(null);
    }
  };

  const selectedUser = userResults.find(
    (user) => String(user.ID) === form.targetUserId,
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Push-рассылки и уведомления
          </h1>
          <p className="text-gray-600 mt-1">
            Управление ручными push-кампаниями, очередью отправки и внутренними
            админ-уведомлениями.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void fetchNotifications(page);
            void fetchPushHealth();
            void fetchCampaigns();
            if (selectedCampaignId) {
              void fetchCampaignDetail(selectedCampaignId);
            }
          }}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg font-medium"
        >
          <RefreshCw className="w-4 h-4" />
          Обновить данные
        </button>
      </div>

      {pushHealth && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <MetricCard
            title="Успешная доставка"
            value={`${pushHealth.delivery_success_rate.toFixed(1)}%`}
          />
          <MetricCard
            title="Невалидные токены"
            value={`${pushHealth.invalid_token_rate.toFixed(1)}%`}
          />
          <MetricCard
            title="Повторные попытки"
            value={`${pushHealth.retry_rate.toFixed(1)}%`}
          />
          <MetricCard
            title="Задержка p95"
            value={`${pushHealth.latency_p95} ms`}
          />
          <MetricCard
            title="FCM"
            value={pushHealth.fcmConfigured ? "Настроен" : "Не настроен"}
            note={`Источник: ${pushHealth.fcmKeySource}`}
          />
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <section className="bg-white rounded-2xl border shadow-sm p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Новая push-кампания
                </h2>
                <p className="text-sm text-gray-500">
                  Сразу отправить push или поставить одноразовую задачу в
                  очередь.
                </p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <FormSelect
                id="campaign-send-mode"
                label="Режим отправки"
                value={form.sendMode}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, sendMode: value }))
                }
                options={[
                  { value: "now", label: "Отправить сразу" },
                  { value: "scheduled", label: "Запланировать" },
                ]}
              />
              <FormSelect
                id="campaign-target-mode"
                label="Аудитория"
                value={form.targetMode}
                onChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    targetMode: value,
                    targetUserId: "",
                  }))
                }
                options={[
                  { value: "user", label: "Один пользователь" },
                  { value: "segment", label: "Сегмент" },
                ]}
              />
            </div>

            {form.sendMode === "scheduled" && (
              <div>
                <label
                  htmlFor="campaign-scheduled-for"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Дата и время отправки
                </label>
                <input
                  id="campaign-scheduled-for"
                  type="datetime-local"
                  value={form.scheduledFor}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      scheduledFor: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>
            )}

            {form.targetMode === "user" ? (
              <div className="space-y-3">
                <label
                  htmlFor="campaign-user-search"
                  className="block text-sm font-medium text-gray-700"
                >
                  Получатель
                </label>
                <input
                  id="campaign-user-search"
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Начните вводить имя или email пользователя"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-blue-500"
                />
                {loadingUsers && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Ищем пользователей...
                  </div>
                )}
                {form.targetUserId && (
                  <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                    Выбран пользователь ID {form.targetUserId}
                    {selectedUser
                      ? `: ${selectedUser.spiritualName || selectedUser.karmicName || selectedUser.email}`
                      : ""}
                  </div>
                )}
                {userResults.length > 0 && (
                  <div className="rounded-xl border border-gray-200 divide-y">
                    {userResults.map((user) => (
                      <button
                        key={user.ID}
                        type="button"
                        onClick={() => {
                          setForm((prev) => ({
                            ...prev,
                            targetUserId: String(user.ID),
                          }));
                          setUserSearch(user.email);
                          setUserResults([]);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50"
                      >
                        <div className="font-medium text-gray-900">
                          {user.spiritualName || user.karmicName || "Без имени"}
                        </div>
                        <div className="text-xs text-gray-500">
                          ID {user.ID} · {user.email} · {user.role}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2">
                <FormSelect
                  id="campaign-role"
                  label="Роль"
                  value={form.role}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, role: value }))
                  }
                  options={[
                    { value: "user", label: "user" },
                    { value: "in_goodness", label: "in_goodness" },
                    { value: "yogi", label: "yogi" },
                    { value: "devotee", label: "devotee" },
                    { value: "admin", label: "admin" },
                    { value: "superadmin", label: "superadmin" },
                  ]}
                />
                <FormSelect
                  id="campaign-user-status"
                  label="Статус пользователя"
                  value={form.status}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, status: value }))
                  }
                  options={[
                    { value: "active", label: "active" },
                    { value: "blocked", label: "blocked" },
                  ]}
                />
              </div>
            )}

            <div className="grid gap-5 md:grid-cols-[1fr_220px]">
              <div>
                <label
                  htmlFor="campaign-title"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Заголовок push
                </label>
                <input
                  id="campaign-title"
                  type="text"
                  value={form.title}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Например: Напоминание о событии"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>
              <FormSelect
                id="campaign-priority"
                label="Приоритет"
                value={form.priority}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, priority: value }))
                }
                options={[
                  { value: "high", label: "high" },
                  { value: "default", label: "default" },
                  { value: "max", label: "max" },
                ]}
              />
            </div>

            <div>
              <label
                htmlFor="campaign-body"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Текст уведомления
              </label>
              <textarea
                id="campaign-body"
                value={form.body}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, body: e.target.value }))
                }
                rows={4}
                placeholder="Короткий текст, который увидит пользователь"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="campaign-payload"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Payload JSON
              </label>
              <textarea
                id="campaign-payload"
                value={form.dataJson}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, dataJson: e.target.value }))
                }
                rows={6}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-blue-500 font-mono text-sm"
              />
              <p className="mt-2 text-xs text-gray-500">
                Значения будут приведены к строкам и переданы в `data` текущего
                mobile push payload.
              </p>
            </div>

            <div className="flex justify-end">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setForm(initialForm);
                    setUserSearch("");
                    setUserResults([]);
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-3 font-medium text-gray-700 hover:bg-gray-50"
                >
                  Сбросить
                </button>
                <button
                  type="button"
                  onClick={() => void handleCreateCampaign()}
                  disabled={creatingCampaign}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {creatingCampaign ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {form.sendMode === "scheduled"
                    ? "Запланировать кампанию"
                    : "Отправить кампанию"}
                </button>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <CalendarClock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Журнал push-кампаний
                  </h2>
                  <p className="text-sm text-gray-500">
                    Последние ручные и запланированные задачи на отправку.
                  </p>
                </div>
              </div>
              <div className="min-w-[220px]">
                <FormSelect
                  id="campaign-status-filter"
                  label="Фильтр"
                  value={campaignStatusFilter}
                  onChange={setCampaignStatusFilter}
                  options={[
                    { value: "all", label: "Все статусы" },
                    { value: "scheduled", label: "Запланировано" },
                    { value: "processing", label: "В работе" },
                    { value: "sent", label: "Отправлено" },
                    { value: "partial_failed", label: "Частично с ошибками" },
                    { value: "failed", label: "Ошибка" },
                    { value: "cancelled", label: "Отменено" },
                  ]}
                />
              </div>
            </div>

            {loadingCampaigns ? (
              <LoadingBlock label="Загружаем кампании..." />
            ) : campaigns.length === 0 ? (
              <EmptyBlock
                icon={<Users className="w-6 h-6" />}
                label="Кампаний пока нет"
              />
            ) : (
              <div className="divide-y">
                {campaigns.map((campaign) => (
                  <button
                    key={campaign.id}
                    type="button"
                    onClick={() => setSelectedCampaignId(campaign.id)}
                    className={`w-full text-left px-6 py-4 hover:bg-gray-50 ${selectedCampaignId === campaign.id ? "bg-blue-50/60" : ""}`}
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900">
                            {campaign.title}
                          </span>
                          <StatusPill value={campaign.status} />
                          <span className="text-xs text-gray-500 uppercase">
                            {formatSendMode(campaign.sendMode)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {campaign.body}
                        </p>
                        <div className="text-xs text-gray-500 flex flex-wrap gap-3">
                          <span>ID {campaign.id}</span>
                          <span>
                            Аудитория:{" "}
                            {formatTargetMode(
                              campaign.targetMode,
                              campaign.targetUserId,
                            )}
                          </span>
                          <span>
                            Создано: {formatDateTime(campaign.createdAt)}
                          </span>
                          {campaign.scheduledFor && (
                            <span>
                              План: {formatDateTime(campaign.scheduledFor)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-start lg:items-end gap-2">
                        <div className="text-xs text-gray-600">
                          Всего: {campaign.totalRecipients} · Отправлено:{" "}
                          {campaign.sentCount} · Ошибок: {campaign.failedCount}{" "}
                          · Пропущено: {campaign.skippedCount}
                        </div>
                        {campaign.status === "scheduled" && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleCancelCampaign(campaign.id);
                            }}
                            disabled={cancellingCampaignId === campaign.id}
                            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
                          >
                            {cancellingCampaignId === campaign.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <XCircle className="w-4 h-4" />
                            )}
                            Отменить
                          </button>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Админ-уведомления
                </h2>
                <p className="text-sm text-gray-500">
                  Внутренние события административного контура.
                </p>
              </div>
            </div>

            {loadingNotifications ? (
              <LoadingBlock label="Загружаем уведомления..." />
            ) : notifications.length === 0 ? (
              <EmptyBlock
                icon={<Bell className="w-6 h-6" />}
                label="Уведомлений нет"
              />
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => {
                      if (!notification.isRead) {
                        void markAsRead(notification.id);
                      }
                    }}
                    className={`w-full text-left px-6 py-4 hover:bg-gray-50 ${!notification.isRead ? "bg-blue-50/50" : ""}`}
                  >
                    <div className="flex gap-3">
                      <span
                        className={`mt-1.5 h-2.5 w-2.5 rounded-full ${notification.isRead ? "bg-gray-300" : "bg-blue-500"}`}
                      />
                      <div className="min-w-0">
                        <p
                          className={`text-sm ${notification.isRead ? "text-gray-700" : "font-semibold text-gray-900"}`}
                        >
                          {notification.message}
                        </p>
                        <div className="mt-2 text-xs text-gray-500 flex flex-wrap gap-3">
                          <span>{formatDateTime(notification.createdAt)}</span>
                          <span>{notification.type.replace(/_/g, " ")}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center justify-center gap-4 px-6 py-4 border-t">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page === 1}
                className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                Назад
              </button>
              <span className="text-sm text-gray-600">Страница {page}</span>
              <button
                type="button"
                onClick={() => setPage((prev) => prev + 1)}
                disabled={notifications.length < 20}
                className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                Далее
              </button>
            </div>
          </section>

          <section className="bg-white rounded-2xl border shadow-sm overflow-hidden min-h-[420px]">
            <div className="px-6 py-5 border-b">
              <h2 className="text-xl font-semibold text-gray-900">
                Детали кампании
              </h2>
              <p className="text-sm text-gray-500">
                Снимок получателей и ошибки отправки по выбранной кампании.
              </p>
            </div>

            {!selectedCampaignId ? (
              <EmptyBlock
                icon={<CalendarClock className="w-6 h-6" />}
                label="Выберите кампанию из журнала"
              />
            ) : loadingCampaignDetail ? (
              <LoadingBlock label="Загружаем детали кампании..." />
            ) : !campaignDetail ? (
              <EmptyBlock
                icon={<CalendarClock className="w-6 h-6" />}
                label="Детали кампании недоступны"
              />
            ) : (
              <div className="p-6 space-y-5">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {campaignDetail.campaign.title}
                    </h3>
                    <StatusPill value={campaignDetail.campaign.status} />
                  </div>
                  <p className="text-sm text-gray-700">
                    {campaignDetail.campaign.body}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <InfoCell
                      label="Режим"
                      value={formatSendMode(campaignDetail.campaign.sendMode)}
                    />
                    <InfoCell
                      label="Аудитория"
                      value={formatTargetMode(
                        campaignDetail.campaign.targetMode,
                        campaignDetail.campaign.targetUserId,
                      )}
                    />
                    <InfoCell
                      label="Сегмент"
                      value={formatSegmentFilters(campaignDetail.campaign)}
                    />
                    <InfoCell
                      label="Создано"
                      value={formatDateTime(campaignDetail.campaign.createdAt)}
                    />
                    <InfoCell
                      label="План"
                      value={
                        campaignDetail.campaign.scheduledFor
                          ? formatDateTime(campaignDetail.campaign.scheduledFor)
                          : "—"
                      }
                    />
                    <InfoCell
                      label="Результат"
                      value={`отправлено ${campaignDetail.campaign.sentCount} / ошибки ${campaignDetail.campaign.failedCount} / пропущено ${campaignDetail.campaign.skippedCount}`}
                    />
                    <InfoCell
                      label="Ошибка"
                      value={campaignDetail.campaign.lastError || "—"}
                    />
                  </div>
                </div>

                <div className="border rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b text-sm font-medium text-gray-700">
                    Payload
                  </div>
                  <pre className="p-4 text-xs text-gray-700 whitespace-pre-wrap break-words bg-white">
                    {JSON.stringify(
                      campaignDetail.campaign.data || {},
                      null,
                      2,
                    )}
                  </pre>
                </div>

                <div className="border rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b text-sm font-medium text-gray-700">
                    Получатели ({campaignDetail.recipientsTotal})
                  </div>
                  {campaignDetail.recipients.length === 0 ? (
                    <div className="p-6 text-sm text-gray-500">
                      Снимок получателей пуст.
                    </div>
                  ) : (
                    <div className="divide-y max-h-[420px] overflow-auto">
                      {campaignDetail.recipients.map((recipient) => (
                        <div key={recipient.id} className="px-4 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-medium text-sm text-gray-900">
                                {recipient.displayName ||
                                  `Пользователь ${recipient.userId}`}
                              </div>
                              <div className="text-xs text-gray-500">
                                ID {recipient.userId}
                                {recipient.email ? ` · ${recipient.email}` : ""}
                              </div>
                              {recipient.error && (
                                <div className="mt-2 text-xs text-red-600">
                                  {recipient.error}
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <StatusPill value={recipient.status} />
                              <div className="mt-2 text-xs text-gray-500">
                                попыток: {recipient.attempts}
                                {recipient.sentAt
                                  ? ` · ${formatDateTime(recipient.sentAt)}`
                                  : ""}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  note,
}: {
  title: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="bg-white rounded-lg border p-3">
      <p className="text-xs text-gray-500">{title}</p>
      <p className="text-xl font-semibold text-gray-900">{value}</p>
      {note ? <p className="text-[11px] text-gray-500 mt-1">{note}</p> : null}
    </div>
  );
}

function FormSelect({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-gray-700 mb-2"
      >
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-blue-500 bg-white"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function StatusPill({ value }: { value: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase ${statusStyles[value] || statusStyles.draft}`}
    >
      {formatStatus(value)}
    </span>
  );
}

function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="p-10 flex flex-col items-center justify-center text-gray-500">
      <Loader2 className="w-8 h-8 animate-spin mb-3" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

function EmptyBlock({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="p-10 flex flex-col items-center justify-center text-gray-500">
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
        {icon}
      </div>
      <p className="text-sm">{label}</p>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-gray-500">
        {label}
      </div>
      <div className="mt-1 text-sm text-gray-900 break-words">{value}</div>
    </div>
  );
}

function formatDateTime(value?: string) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null) {
    const responseError = (
      error as { response?: { data?: { error?: string } } }
    ).response?.data?.error;
    if (typeof responseError === "string" && responseError.trim()) {
      return responseError;
    }
    const directMessage = (error as { message?: string }).message;
    if (typeof directMessage === "string" && directMessage.trim()) {
      return directMessage;
    }
  }
  return fallback;
}

function formatSendMode(value: string) {
  switch (value) {
    case "now":
      return "Сразу";
    case "scheduled":
      return "Запланировано";
    default:
      return value;
  }
}

function formatTargetMode(value: string, userId?: number) {
  if (value === "user") {
    return `Один пользователь${userId ? `: ${userId}` : ""}`;
  }
  if (value === "segment") {
    return "Сегмент";
  }
  return value;
}

function formatStatus(value: string) {
  switch (value) {
    case "scheduled":
      return "запланировано";
    case "processing":
      return "в работе";
    case "sent":
      return "отправлено";
    case "partial_failed":
      return "частично с ошибками";
    case "failed":
      return "ошибка";
    case "cancelled":
      return "отменено";
    case "draft":
      return "черновик";
    case "pending":
      return "ожидает";
    case "skipped":
      return "пропущено";
    default:
      return value.replace(/_/g, " ");
  }
}

function formatSegmentFilters(campaign: Campaign) {
  if (campaign.targetMode !== "segment") {
    return "—";
  }
  const role = campaign.segmentFilters?.role || "любая роль";
  const status = campaign.segmentFilters?.status || "любой статус";
  return `${role}, ${status}, push=true`;
}
