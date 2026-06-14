"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@vedamatch/api-client";
import type { DatingApproval, DatingApprovalsResponse } from "@vedamatch/domain-types";
import { useSession } from "@/components/session-context";

type PanelNotice = {
  loading: boolean;
  busy: boolean;
  error: string;
  success: string;
};

function approvalId(approval: DatingApproval): number {
  const id = Number(approval.ID || approval.id || 0);
  return Number.isFinite(id) ? id : 0;
}

function sessionUserName(user?: { spiritualName?: string; karmicName?: string; nickname?: string }): string {
  if (!user) {
    return "—";
  }
  return user.spiritualName || user.karmicName || user.nickname || "—";
}

export function UnionPublicationPanel({ userId }: { userId: number }) {
  const { dictionary } = useSession();
  const copy = dictionary.datingWeb;
  const pub = copy.publication;
  const client = useMemo(() => createBrowserClient(), []);

  const [data, setData] = useState<DatingApprovalsResponse | null>(null);
  const [incoming, setIncoming] = useState<DatingApproval[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<number[]>([]);
  const [notice, setNotice] = useState<PanelNotice>({ loading: true, busy: false, error: "", success: "" });

  const load = useCallback(async () => {
    if (!userId) {
      return;
    }
    setNotice((current) => ({ ...current, loading: true, error: "" }));
    try {
      const [approvals, incomingResult] = await Promise.all([
        client.getDatingApprovals(userId),
        client.getIncomingApprovalRequests().catch(() => [] as DatingApproval[]),
      ]);
      setData(approvals);
      setIncoming(Array.isArray(incomingResult) ? incomingResult : []);
      setNotice((current) => ({ ...current, loading: false }));
    } catch (error) {
      setNotice((current) => ({
        ...current,
        loading: false,
        error: error instanceof Error ? error.message : copy.loadFailed,
      }));
    }
  }, [client, copy.loadFailed, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  function toggleFriend(friendId: number) {
    setSelectedFriendIds((current) =>
      current.includes(friendId) ? current.filter((id) => id !== friendId) : [...current, friendId],
    );
  }

  async function handleRequestApprovals() {
    setNotice((current) => ({ ...current, busy: true, error: "", success: "" }));
    try {
      await client.requestDatingApprovals(userId, selectedFriendIds);
      setSelectedFriendIds([]);
      await load();
      setNotice((current) => ({ ...current, busy: false, success: pub.requestSent }));
    } catch (error) {
      setNotice((current) => ({
        ...current,
        busy: false,
        error: error instanceof Error ? error.message : pub.requestFailed,
      }));
    }
  }

  async function handleRespond(approval: DatingApproval, status: "approved" | "rejected") {
    const id = approvalId(approval);
    if (!id || !approval.userId) {
      return;
    }
    setNotice((current) => ({ ...current, busy: true, error: "", success: "" }));
    try {
      await client.respondDatingApproval(approval.userId, id, status);
      await load();
      setNotice((current) => ({ ...current, busy: false, success: pub.responded }));
    } catch (error) {
      setNotice((current) => ({
        ...current,
        busy: false,
        error: error instanceof Error ? error.message : pub.respondFailed,
      }));
    }
  }

  const publication = data?.publication;
  const friends = data?.friends || [];
  const ownApprovals = data?.approvals || [];

  return (
    <section className="panel dating-publication-panel">
      <div className="section-head">
        <h2>{pub.title}</h2>
        {publication ? (
          <p>
            {pub.progress
              .replace("{approved}", String(publication.approvedCount))
              .replace("{required}", String(publication.requiredApprovals))}
          </p>
        ) : null}
      </div>

      {notice.error ? <div className="notice error-copy">{notice.error}</div> : null}
      {notice.success ? <div className="notice success">{notice.success}</div> : null}
      {notice.loading ? <div className="notice">{copy.loading}</div> : null}

      {publication?.needsAdminFallback ? <p className="muted">{pub.needsAdminFallback}</p> : null}

      <div className="dating-approval-request">
        <h3>{pub.selectFriends}</h3>
        {friends.length ? (
          <>
            <ul className="dating-friend-list">
              {friends.map((friend) => {
                const friendId = Number(friend.ID || friend.id || 0);
                const checked = selectedFriendIds.includes(friendId);
                return (
                  <li key={friendId}>
                    <label className="dating-toggle">
                      <input
                        checked={checked}
                        onChange={() => toggleFriend(friendId)}
                        type="checkbox"
                      />
                      <span>{sessionUserName(friend)}{friend.city ? ` · ${friend.city}` : ""}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
            <button
              className="button"
              disabled={notice.busy || selectedFriendIds.length === 0}
              onClick={() => void handleRequestApprovals()}
              type="button"
            >
              {notice.busy ? pub.requesting : pub.requestApprovals}
            </button>
          </>
        ) : (
          <p className="muted">{pub.noFriends}</p>
        )}
      </div>

      {ownApprovals.length ? (
        <ul className="dating-approval-list">
          {ownApprovals.map((approval) => (
            <li key={approvalId(approval)}>
              <span>{sessionUserName(approval.approver)}</span>
              <strong>{approval.status}</strong>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="dating-approval-incoming">
        <h3>{pub.incomingTitle}</h3>
        {incoming.length ? (
          <ul className="dating-approval-list">
            {incoming.map((approval) => {
              const isPending = approval.status === "pending";
              return (
                <li key={approvalId(approval)}>
                  <span>{sessionUserName(approval.user)}</span>
                  {isPending ? (
                    <span className="dating-approval-actions">
                      <button
                        className="button-secondary"
                        disabled={notice.busy}
                        onClick={() => void handleRespond(approval, "approved")}
                        type="button"
                      >
                        {pub.approve}
                      </button>
                      <button
                        className="button-secondary danger"
                        disabled={notice.busy}
                        onClick={() => void handleRespond(approval, "rejected")}
                        type="button"
                      >
                        {pub.reject}
                      </button>
                    </span>
                  ) : (
                    <strong>{approval.status}</strong>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="muted">{pub.noIncoming}</p>
        )}
      </div>
    </section>
  );
}
