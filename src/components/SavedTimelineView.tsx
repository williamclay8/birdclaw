import { useEffect, useMemo, useState } from "react";
import { AccountSwitcher } from "#/components/AccountSwitcher";
import { SyncToolbar, type SyncTarget } from "#/components/SyncToolbar";
import { TimelineCard } from "#/components/TimelineCard";
import type {
	AccountRecord,
	QueryEnvelope,
	QueryResponse,
	TimelineItem,
} from "#/lib/types";
import {
	cx,
	eyebrowClass,
	emptyPanelClass,
	emptyPanelCopyClass,
	emptyPanelTitleClass,
	feedPageClass,
	heroControlsClass,
	heroCopyClass,
	heroShellClass,
	heroTitleClass,
	pageWrapClass,
	textFieldClass,
	textFieldWideClass,
	timelineLaneClass,
} from "#/lib/ui";

interface SavedTimelineViewProps {
	filter: "liked" | "bookmarked";
	eyebrow: string;
	title: string;
	loadingLabel: string;
	searchPlaceholder: string;
}

export function SavedTimelineView({
	filter,
	eyebrow,
	title,
	loadingLabel,
	searchPlaceholder,
}: SavedTimelineViewProps) {
	const [meta, setMeta] = useState<QueryEnvelope | null>(null);
	const [items, setItems] = useState<TimelineItem[]>([]);
	const [search, setSearch] = useState("");
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
		const url = new URL("/api/query", window.location.origin);
		url.searchParams.set("resource", "home");
		url.searchParams.set("account", selectedAccountId);
		url.searchParams.set(filter, "true");
		url.searchParams.set("refresh", String(refreshTick));
		if (search.trim()) {
			url.searchParams.set("search", search.trim());
		}

		fetch(url)
			.then((response) => response.json())
			.then((data: QueryResponse) => setItems(data.items as TimelineItem[]));
	}, [filter, refreshTick, search, selectedAccountId]);

	const subtitle = useMemo(() => {
		if (!meta) {
			return items.length > 0 ? `${items.length} visible` : loadingLabel;
		}
		return `${items.length} visible · ${meta.transport.statusText}`;
	}, [items.length, loadingLabel, meta]);

	const accountOptions = meta?.accounts ?? [];
	const selectedAccount =
		accountOptions.find((account) => account.id === selectedAccountId) ??
		getDefaultAccount(accountOptions);

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

	async function replyToTweet(tweetId: string) {
		const text = window.prompt("Draft a reply to copy");
		if (!text?.trim()) return;

		await fetch("/api/action", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				kind: "replyTweet",
				accountId: selectedAccount?.id ?? "acct_primary",
				tweetId,
				text,
			}),
		});

		setRefreshTick((value) => value + 1);
	}

	return (
		<main className={pageWrapClass}>
			<div className={feedPageClass}>
				<section className={heroShellClass}>
					<div>
						<p className={eyebrowClass}>{eyebrow}</p>
						<h2 className={heroTitleClass}>{title}</h2>
						<p className={heroCopyClass}>{subtitle}</p>
					</div>
					<div className={heroControlsClass}>
						{accountOptions.length > 0 ? (
							<AccountSwitcher
								accounts={accountOptions}
								current={selectedAccountId}
								onChange={(account) => setSelectedAccountId(account.id)}
							/>
						) : null}
						<SyncToolbar
							disabled={!selectedAccountId || selectedAccountId === "all"}
							loadingTargets={loadingTargets}
							onSync={syncTarget}
						/>
						<input
							aria-label={searchPlaceholder}
							className={cx(textFieldClass, textFieldWideClass)}
							onChange={(event) => setSearch(event.target.value)}
							placeholder={searchPlaceholder}
							value={search}
						/>
					</div>
				</section>

				{items.length > 0 ? (
					<section
						aria-label={`${eyebrow} results`}
						className={timelineLaneClass}
					>
						{items.map((item) => (
							<TimelineCard
								key={item.id}
								item={item}
								onReply={replyToTweet}
								showReplyControls={false}
							/>
						))}
					</section>
				) : (
					<SavedTimelineEmptyState
						filter={filter}
						hasMeta={Boolean(meta)}
						hasSearch={Boolean(search.trim())}
					/>
				)}
			</div>
		</main>
	);
}

function SavedTimelineEmptyState({
	filter,
	hasMeta,
	hasSearch,
}: {
	filter: "liked" | "bookmarked";
	hasMeta: boolean;
	hasSearch: boolean;
}) {
	const noun = filter === "liked" ? "likes" : "bookmarks";
	const title = !hasMeta
		? `Loading your ${noun}`
		: hasSearch
			? `No ${noun} match that search`
			: `No ${noun} saved yet`;
	const copy = !hasMeta
		? "Birdclaw is checking the local archive before it shows this lane."
		: hasSearch
			? "Try a different phrase or clear the search to return to the full lane."
			: `Sync ${noun} for the selected account to bring this signal into view.`;

	return (
		<section aria-live="polite" className={emptyPanelClass}>
			<h3 className={emptyPanelTitleClass}>{title}</h3>
			<p className={emptyPanelCopyClass}>{copy}</p>
		</section>
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
