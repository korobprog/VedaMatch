"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getApiBaseURL } from "@/lib/api";
import { clearAuthData, getAuthToken } from "../../lib/auth";

type EkadashiSummary = {
  totalEvents?: number;
  successEvents?: number;
  failedEvents?: number;
};

type CalendarImportTarget = {
  id: number;
  organizationId: string;
  scopeKey: string;
  scopeMode: string;
  timezone: string;
  city?: string;
  country?: string;
  source: string;
  isActive: boolean;
  importStatus: string;
  lastSeenAt?: string;
  lastImportedAt?: string;
  nextImportDueAt?: string;
  lastError?: string;
  lastImportRunId?: number;
};

type ProviderHealth = {
  status?: string;
  message?: string;
  lastError?: string;
  checkedAt?: string;
  updatedAt?: string;
};

type CalendarPublication = {
  id: number;
  organizationId: string;
  scopeKey: string;
  scopeMode: string;
  timezone: string;
  city?: string;
  country?: string;
  publicationVersion: string;
  importRunID?: number;
  isActive: boolean;
  rangeStart: string;
  rangeEnd: string;
  eventsCount: number;
  conflictCount?: number;
  warningCount?: number;
  reviewStatus?: string;
  reviewSummary?: string;
  lastSuccessAt?: string;
  createdAt: string;
};

type CalendarImportRun = {
  id: number;
  organizationId: string;
  scopeKey: string;
  scopeMode: string;
  timezone: string;
  city?: string;
  country?: string;
  importVersion: string;
  status: string;
  rangeStart: string;
  rangeEnd: string;
  importedCount: number;
  curatedCount: number;
  snapshotCount: number;
  errorMessage?: string;
  createdAt: string;
  finishedAt?: string;
  publishedAt?: string;
};

type EkadashiHealth = {
  status: string;
  summary?: EkadashiSummary;
  publications: CalendarPublication[];
  recentImportRuns: CalendarImportRun[];
  importTargets?: CalendarImportTarget[];
  providerStatuses?: Record<string, ProviderHealth>;
};

const organizations = [
  { id: "iskcon", name: "ISKCON" },
  { id: "sri_chaitanya_math", name: "Sri Chaitanya Math" },
  { id: "pure_bhakti", name: "Pure Bhakti" },
  { id: "default_vaishnava", name: "Default Vaishnava" },
];

const formatDateTime = (value?: string) => {
  if (!value) return "n/a";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

const formatScope = (item: {
  scopeMode?: string;
  scopeKey?: string;
  city?: string;
  timezone?: string;
}) => {
  if (item.scopeMode === "location") {
    return `${item.city || "city n/a"} / ${item.timezone || "timezone n/a"}`;
  }
  return item.timezone || item.scopeKey || "n/a";
};

const formatStatusLabel = (status: string) => {
  const normalized = status.trim().replace(/_/g, " ");
  if (!normalized) return "n/a";
  return normalized.replace(/^\w/, (char) => char.toUpperCase());
};

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case "published":
      return "bg-emerald-100 text-emerald-700";
    case "queued":
    case "review_pending":
      return "bg-amber-100 text-amber-700";
    case "running":
      return "bg-blue-100 text-blue-700";
    case "failed":
    case "conflict":
      return "bg-red-100 text-red-700";
    case "missing":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

export default function CalendarAdminPage() {
  const router = useRouter();
  const [health, setHealth] = useState<EkadashiHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  const [approvingScopeKey, setApprovingScopeKey] = useState<string | null>(
    null,
  );
  const [rejectingScopeKey, setRejectingScopeKey] = useState<string | null>(
    null,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState("iskcon");
  const [city, setCity] = useState("Khabarovsk");
  const [country, setCountry] = useState("Russia");
  const [timezone, setTimezone] = useState("Asia/Vladivostok");

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    try {
      const token = getAuthToken();
      if (!token) {
        clearAuthData();
        router.push("/login");
        return;
      }
      const response = await fetch(
        `${getApiBaseURL()}/admin/push/health/ekadashi?window_hours=168&limit=50`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (response.status === 401) {
        clearAuthData();
        router.push("/login");
        return;
      }
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || "Failed to load calendar health");
      }
      const payload = await response.json();
      setHealth(payload);
      setError(null);
    } catch (fetchError: unknown) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to load calendar health",
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchHealth().catch(() => undefined);
  }, [fetchHealth]);

  const latestPublication = useMemo(
    () =>
      health?.publications?.find((item) => item.isActive) ||
      health?.publications?.[0] ||
      null,
    [health],
  );

  const failedRuns = useMemo(
    () =>
      (health?.recentImportRuns || []).filter(
        (item) => item.status !== "published",
      ),
    [health],
  );

  const importTargets = useMemo(() => health?.importTargets || [], [health]);
  const reviewQueueTargets = useMemo(
    () =>
      importTargets.filter((item) =>
        ["queued", "running", "failed", "conflict", "review_pending"].includes(
          item.importStatus,
        ),
      ),
    [importTargets],
  );
  const missingCoverageTargets = useMemo(
    () => importTargets.filter((item) => item.importStatus === "missing"),
    [importTargets],
  );
  const providerStatusEntries = useMemo(
    () => Object.entries(health?.providerStatuses || {}),
    [health],
  );

  const runImport = async (batch: boolean) => {
    const token = getAuthToken();
    if (!token) {
      clearAuthData();
      router.push("/login");
      return;
    }

    const params = new URLSearchParams({
      timezone,
      country,
    });
    if (city.trim()) {
      params.set("city", city.trim());
    }
    if (!batch) {
      params.set("organizationId", organizationId);
    }

    const endpoint = batch
      ? "/admin/ekadashi/refresh-all"
      : "/admin/ekadashi/refresh";
    const setPending = batch ? setBatchSubmitting : setSubmitting;
    setPending(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(
        `${getApiBaseURL()}${endpoint}?${params.toString()}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (response.status === 401) {
        clearAuthData();
        router.push("/login");
        return;
      }
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Import failed");
      }
      setMessage(
        batch
          ? "Batch publication build completed."
          : "Publication build completed.",
      );
      await fetchHealth();
    } catch (submitError: unknown) {
      setError(
        submitError instanceof Error ? submitError.message : "Import failed",
      );
    } finally {
      setPending(false);
    }
  };

  const approveReview = async (publication: CalendarPublication) => {
    const token = getAuthToken();
    if (!token) {
      clearAuthData();
      router.push("/login");
      return;
    }

    const params = new URLSearchParams({
      organizationId: publication.organizationId,
      timezone: publication.timezone || timezone,
      country: publication.country || country,
    });
    if (publication.city?.trim()) {
      params.set("city", publication.city.trim());
    }

    setApprovingScopeKey(publication.scopeKey);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(
        `${getApiBaseURL()}/admin/ekadashi/review/approve?${params.toString()}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (response.status === 401) {
        clearAuthData();
        router.push("/login");
        return;
      }
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Review approval failed");
      }
      setMessage("Publication review approved.");
      await fetchHealth();
    } catch (approveError: unknown) {
      setError(
        approveError instanceof Error
          ? approveError.message
          : "Review approval failed",
      );
    } finally {
      setApprovingScopeKey(null);
    }
  };

  const rejectReview = async (publication: CalendarPublication) => {
    const token = getAuthToken();
    if (!token) {
      clearAuthData();
      router.push("/login");
      return;
    }

    const params = new URLSearchParams({
      organizationId: publication.organizationId,
      timezone: publication.timezone || timezone,
      country: publication.country || country,
    });
    if (publication.city?.trim()) {
      params.set("city", publication.city.trim());
    }

    setRejectingScopeKey(publication.scopeKey);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(
        `${getApiBaseURL()}/admin/ekadashi/review/reject?${params.toString()}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (response.status === 401) {
        clearAuthData();
        router.push("/login");
        return;
      }
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Review rejection failed");
      }
      setMessage("Publication review rejected.");
      await fetchHealth();
    } catch (rejectError: unknown) {
      setError(
        rejectError instanceof Error
          ? rejectError.message
          : "Review rejection failed",
      );
    } finally {
      setRejectingScopeKey(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
          <p className="mt-1 text-gray-600">
            Published database status, review queue, and publication build
            controls for the Vedic calendar.
          </p>
        </div>
        <button
          type="button"
          onClick={() => fetchHealth().catch(() => undefined)}
          className="rounded-lg bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
        >
          Refresh status
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Published scopes
          </p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {health?.publications?.filter((item) => item.isActive).length || 0}
          </p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Review queue
          </p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {reviewQueueTargets.length}
          </p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Coverage gaps
          </p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {missingCoverageTargets.length}
          </p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Recent failed runs
          </p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {failedRuns.length}
          </p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Latest published
          </p>
          <p className="mt-2 text-sm font-semibold text-gray-900">
            {formatDateTime(
              latestPublication?.lastSuccessAt || latestPublication?.createdAt,
            )}
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="rounded-2xl border bg-white p-5">
          <h2 className="text-lg font-semibold text-gray-900">
            Publication build
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Choose a scope and build a reviewed calendar publication for the
            next 24 months.
          </p>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">
                Organization
              </span>
              <select
                value={organizationId}
                onChange={(event) => setOrganizationId(event.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              >
                {organizations.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">
                City
              </span>
              <input
                value={city}
                onChange={(event) => setCity(event.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                placeholder="Required for ISKCON scopes"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">
                Country
              </span>
              <input
                value={country}
                onChange={(event) => setCountry(event.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">
                Timezone
              </span>
              <input
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
              />
            </label>
          </div>

          {message ? (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {message}
            </div>
          ) : null}
          {error ? (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="mt-5 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => runImport(false).catch(() => undefined)}
              disabled={submitting}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? "Building publication..."
                : "Build publication for selected organization"}
            </button>
            <button
              type="button"
              onClick={() => runImport(true).catch(() => undefined)}
              disabled={batchSubmitting}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {batchSubmitting
                ? "Building batch publication..."
                : "Build publication for all organizations in this scope"}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border bg-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Review queue
                </h2>
                <p className="text-sm text-gray-600">
                  Queued, running, failed, and missing scopes that need
                  attention before the published database is complete.
                </p>
              </div>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                {reviewQueueTargets.length} in queue
              </span>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="px-3 py-2 font-medium">Organization</th>
                    <th className="px-3 py-2 font-medium">Scope</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Last seen</th>
                    <th className="px-3 py-2 font-medium">Next due</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewQueueTargets.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b last:border-b-0 align-top"
                    >
                      <td className="px-3 py-2 font-medium text-gray-900">
                        {item.organizationId}
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        {formatScope(item)}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusBadgeClass(item.importStatus)}`}
                        >
                          {formatStatusLabel(item.importStatus)}
                        </span>
                        {item.lastError ? (
                          <div className="mt-1 text-xs text-red-600">
                            {item.lastError}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        {formatDateTime(item.lastSeenAt)}
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        {formatDateTime(item.nextImportDueAt)}
                      </td>
                    </tr>
                  ))}
                  {!loading && reviewQueueTargets.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-6 text-center text-gray-500"
                      >
                        No queued or failed scopes. Published data looks
                        current.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Source health
                </h2>
                <p className="text-sm text-gray-600">
                  Live source health is only used during import; published
                  client traffic should stay on the database path.
                </p>
              </div>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                {providerStatusEntries.length} sources
              </span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {providerStatusEntries.map(([name, item]) => (
                <div
                  key={name}
                  className="rounded-xl border border-gray-200 bg-gray-50 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-gray-900">{name}</p>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusBadgeClass(item.status || "")}`}
                    >
                      {formatStatusLabel(item.status || "unknown")}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-gray-600">
                    {item.message ||
                      item.lastError ||
                      item.checkedAt ||
                      item.updatedAt ||
                      "No status details available."}
                  </p>
                </div>
              ))}
              {!loading && providerStatusEntries.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500 md:col-span-2">
                  No provider health data yet.
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Published versions
                </h2>
                <p className="text-sm text-gray-600">
                  Current published versions served to mobile and web clients.
                </p>
              </div>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                {(health?.publications || []).length} total
              </span>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="px-3 py-2 font-medium">Organization</th>
                    <th className="px-3 py-2 font-medium">Scope</th>
                    <th className="px-3 py-2 font-medium">Range</th>
                    <th className="px-3 py-2 font-medium">Events</th>
                    <th className="px-3 py-2 font-medium">State</th>
                    <th className="px-3 py-2 font-medium">Review</th>
                    <th className="px-3 py-2 font-medium">Published</th>
                    <th className="px-3 py-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(health?.publications || []).map((item) => (
                    <tr key={item.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2 font-medium text-gray-900">
                        {item.organizationId}
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        {formatScope(item)}
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        {item.rangeStart} {"->"} {item.rangeEnd}
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        {item.eventsCount}
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${item.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-700"}`}
                        >
                          {item.isActive ? "Active" : "Archived"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusBadgeClass(item.reviewStatus || "published")}`}
                        >
                          {formatStatusLabel(item.reviewStatus || "published")}
                        </span>
                        {item.conflictCount || item.warningCount ? (
                          <div className="mt-1 text-xs text-gray-500">
                            conflicts {item.conflictCount || 0} / warnings{" "}
                            {item.warningCount || 0}
                          </div>
                        ) : null}
                        {item.reviewSummary ? (
                          <div className="mt-1 text-xs text-gray-500">
                            {item.reviewSummary}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        {formatDateTime(item.lastSuccessAt || item.createdAt)}
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        {item.reviewStatus === "review_pending" ? (
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                approveReview(item).catch(() => undefined)
                              }
                              disabled={approvingScopeKey === item.scopeKey}
                              className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {approvingScopeKey === item.scopeKey
                                ? "Approving..."
                                : "Approve review"}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                rejectReview(item).catch(() => undefined)
                              }
                              disabled={rejectingScopeKey === item.scopeKey}
                              className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {rejectingScopeKey === item.scopeKey
                                ? "Rejecting..."
                                : "Reject review"}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">
                            No action
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!loading && (health?.publications || []).length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-3 py-6 text-center text-gray-500"
                      >
                        No published calendar versions yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Recent import runs
                </h2>
                <p className="text-sm text-gray-600">
                  Latest build attempts with success, review, and failure
                  details.
                </p>
              </div>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Organization</th>
                    <th className="px-3 py-2 font-medium">Scope</th>
                    <th className="px-3 py-2 font-medium">Counts</th>
                    <th className="px-3 py-2 font-medium">Finished</th>
                  </tr>
                </thead>
                <tbody>
                  {(health?.recentImportRuns || []).map((item) => (
                    <tr
                      key={item.id}
                      className="border-b last:border-b-0 align-top"
                    >
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${item.status === "published" ? "bg-emerald-100 text-emerald-700" : item.status === "failed" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-medium text-gray-900">
                        {item.organizationId}
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        {formatScope(item)}
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        imported {item.importedCount} / curated{" "}
                        {item.curatedCount} / snapshots {item.snapshotCount}
                        {item.errorMessage ? (
                          <div className="mt-1 text-xs text-red-600">
                            {item.errorMessage}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        {formatDateTime(
                          item.finishedAt || item.publishedAt || item.createdAt,
                        )}
                      </td>
                    </tr>
                  ))}
                  {!loading && (health?.recentImportRuns || []).length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-6 text-center text-gray-500"
                      >
                        No import runs yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
