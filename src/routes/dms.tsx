import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AccountSwitcher } from "#/components/AccountSwitcher";
import { DmWorkspace } from "#/components/DmWorkspace";
import { SyncToolbar, type SyncTarget } from "#/components/SyncToolbar";
import type {
	AccountRecord,
	DmConversationItem,
	DmMessageItem,
	QueryEnvelope,
	QueryResponse,
	ReplyFilter,
} from "#/lib/types";
import {
	cx,
	dmPageClass,
	eyebrowClass,
	heroControlsClass,
	heroControlsDmClass,
	heroCopyClass,
	heroShellClass,
	heroShellDmClass,
	heroTitleClass,
	pageWrapClass,
	segmentActiveClass,
	segmentClass,
	segmentedClass,
	textFieldClass,
	textFieldShortClass,
	textFieldWideClass,
} from "#/lib/ui";

export const Route = createFileRoute("/dms")({
	component: DmsRoute,
});

function DmsRoute() {
	const [meta, setMeta] = useState<QueryEnvelope | null>(null);
	const [items, setItems] = useState<DmConversationItem[]>([]);
	const [messages, setMessages] = useState<DmMessageItem[]>([]);
	const [selectedConversationId, setSelectedConversationId] = useState<
		string | undefined
	>();
	const [replyFilter, setReplyFilter] = useState<ReplyFilter>("unreplied");
	const [minFollowers, setMinFollowers] = useState("0");
	const [minInfluenceScore, setMinInfluenceScore] = useState("0");
	const [sort, setSort] = useState<"recent" | "influence">("recent");
	const [search, setSearch] = useState("");
	const [replyDraft, setReplyDraft] = useState("");
	const [refreshTick, setRefreshTick] = useState(0);
	const [selectedAccountId, setSelectedAccountId] = useState("all");
	const [loadingTargets, setLoadingTargets] = useState<SyncTarget[]>([]);

	function refreshStatus() {
		fetch("/api/status")
			.then((response) => response.json())
			.then((data: QueryEnvelope) => {
				setMeta(data);
				setSelectedAccountId((current) =>
					current && current !== "all"
						? current
						: getDefaultAccount(data.accounts)?.id || "all",
				);
			});
	}

	useEffect(() => {
		refreshStatus();
	}, []);

	useEffect(() => {
		if (!selectedAccountId) return;
		const controller = new AbortController();
		const url = new URL("/api/query", window.location.origin);
		url.searchParams.set("resource", "dms");
		url.searchParams.set("account", selectedAccountId);
		url.searchParams.set("replyFilter", replyFilter);
		url.searchParams.set("minFollowers", minFollowers);
		url.searchParams.set("minInfluenceScore", minInfluenceScore);
		url.searchParams.set("refresh", String(refreshTick));
		url.searchParams.set("sort", sort);
		if (selectedConversationId) {
			url.searchParams.set("conversationId", selectedConversationId);
		}
		if (search.trim()) {
			url.searchParams.set("search", search.trim());
		}

		fetch(url, { signal: controller.signal })
			.then((response) => response.json())
			.then((data: QueryResponse) => {
				const conversations = data.items as DmConversationItem[];
				const nextSelected =
					data.selectedConversation?.conversation.id ?? conversations[0]?.id;
				setItems(conversations);
				setSelectedConversationId((current) => {
					if (!current) return nextSelected;
					return conversations.some(
						(conversation) => conversation.id === current,
					)
						? current
						: nextSelected;
				});
				setMessages(data.selectedConversation?.messages ?? []);
			})
			.catch((error: unknown) => {
				if (error instanceof DOMException && error.name === "AbortError") {
					return;
				}
				throw error;
			});

		return () => {
			controller.abort();
		};
	}, [
		minFollowers,
		minInfluenceScore,
		refreshTick,
		replyFilter,
		search,
		selectedAccountId,
		selectedConversationId,
		sort,
	]);

	const selectedConversation =
		items.find((item) => item.id === selectedConversationId) ?? null;
	const accountOptions = meta?.accounts ?? [];

	const subtitle = useMemo(() => {
		if (!meta) return "Loading direct messages...";
		return `${meta.stats.dms} conversations cached locally · filter by follower load or derived influence score`;
	}, [meta]);

	async function syncTarget(target: SyncTarget) {
		if (!selectedAccountId) return;
		setLoadingTargets((current) => [...current, target]);

		try {
			await fetch("/api/action", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					kind: syncActionKind(target),
					accountId: selectedAccountId,
					limit: 50,
					refresh: true,
				}),
			});
			refreshStatus();
			setRefreshTick((value) => value + 1);
		} finally {
			setLoadingTargets((current) =>
				current.filter((value) => value !== target),
			);
		}
	}

	async function replyToConversation(conversationId: string) {
		const text = replyDraft.trim();
		if (!text || !selectedConversation) return;

		const now = new Date().toISOString();
		const accountRecord = meta?.accounts.find(
			(account) => account.id === selectedConversation.accountId,
		);
		const senderHandle = (
			accountRecord?.handle ?? selectedConversation.accountHandle
		).replace(/^@/, "");
		const optimisticMessage: DmMessageItem = {
			id: `optimistic-${now}`,
			conversationId,
			text,
			createdAt: now,
			direction: "outbound",
			isReplied: true,
			mediaCount: 0,
			sender: {
				id: `local-${selectedConversation.accountId}`,
				handle: senderHandle,
				displayName: accountRecord?.name ?? senderHandle,
				bio: "",
				followersCount: 0,
				avatarHue: 18,
				createdAt: now,
			},
		};
		const previousMessages = messages;
		const previousItems = items;

		setReplyDraft("");
		setMessages((current) => [...current, optimisticMessage]);
		setItems((current) =>
			current.map((item) =>
				item.id === conversationId
					? {
							...item,
							lastMessageAt: now,
							lastMessagePreview: text,
							needsReply: false,
							unreadCount: 0,
						}
					: item,
			),
		);

		try {
			await fetch("/api/action", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					kind: "replyDm",
					conversationId,
					text,
				}),
			});

			setSelectedConversationId(conversationId);
			setRefreshTick((value) => value + 1);
		} catch (error) {
			setReplyDraft(text);
			setMessages(previousMessages);
			setItems(previousItems);
			throw error;
		}
	}

	return (
		<main className={pageWrapClass}>
			<div className={dmPageClass}>
				<section className={cx(heroShellClass, heroShellDmClass)}>
					<div>
						<p className={eyebrowClass}>direct messages</p>
						<h2 className={heroTitleClass}>
							Influence, bio, and reply state. No hunting.
						</h2>
						<p className={heroCopyClass}>{subtitle}</p>
					</div>
					<div className={cx(heroControlsClass, heroControlsDmClass)}>
						{accountOptions.length > 0 ? (
							<AccountSwitcher
								accounts={accountOptions}
								current={selectedAccountId}
								onChange={(account) => {
									setSelectedConversationId(undefined);
									setSelectedAccountId(account.id);
								}}
							/>
						) : null}
						<SyncToolbar
							disabled={!selectedAccountId || selectedAccountId === "all"}
							loadingTargets={loadingTargets}
							onSync={syncTarget}
						/>
						<input
							className={cx(textFieldClass, textFieldWideClass)}
							onChange={(event) => setSearch(event.target.value)}
							placeholder="Search DMs"
							value={search}
						/>
						<input
							className={cx(textFieldClass, textFieldShortClass)}
							inputMode="numeric"
							onChange={(event) => setMinFollowers(event.target.value)}
							placeholder="Min followers"
							value={minFollowers}
						/>
						<input
							className={cx(textFieldClass, textFieldShortClass)}
							inputMode="numeric"
							onChange={(event) => setMinInfluenceScore(event.target.value)}
							placeholder="Min score"
							value={minInfluenceScore}
						/>
						<div className={segmentedClass}>
							{(["recent", "influence"] as const).map((value) => (
								<button
									key={value}
									className={cx(
										segmentClass,
										value === sort && segmentActiveClass,
									)}
									onClick={() => setSort(value)}
									type="button"
								>
									{value}
								</button>
							))}
						</div>
						<div className={segmentedClass}>
							{(["all", "replied", "unreplied"] as const).map((value) => (
								<button
									key={value}
									className={cx(
										segmentClass,
										value === replyFilter && segmentActiveClass,
									)}
									onClick={() => setReplyFilter(value)}
									type="button"
								>
									{value}
								</button>
							))}
						</div>
					</div>
				</section>

				<DmWorkspace
					conversations={items}
					onReplyDraftChange={setReplyDraft}
					onReplySend={replyToConversation}
					onSelectConversation={setSelectedConversationId}
					replyDraft={replyDraft}
					selectedConversation={selectedConversation}
					selectedMessages={messages}
				/>
			</div>
		</main>
	);
}

function getDefaultAccount(accounts: AccountRecord[]) {
	return (
		accounts.find((account) => account.isDefault) ??
		accounts.find((account) => account.handle === "@vantaprivacy") ??
		accounts[0]
	);
}

function syncActionKind(target: SyncTarget) {
	const actions = {
		mentions: "syncMentions",
		likes: "syncLikes",
		bookmarks: "syncBookmarks",
		dms: "syncDms",
	} as const;
	return actions[target];
}
