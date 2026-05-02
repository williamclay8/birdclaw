import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AccountSwitcher } from "#/components/AccountSwitcher";
import { SyncToolbar, type SyncTarget } from "#/components/SyncToolbar";
import { TimelineCard } from "#/components/TimelineCard";
import type {
	AccountRecord,
	QueryEnvelope,
	QueryResponse,
	ReplyFilter,
	TimelineItem,
} from "#/lib/types";
import {
	cx,
	eyebrowClass,
	feedPageClass,
	heroControlsClass,
	heroCopyClass,
	heroShellClass,
	heroTitleClass,
	pageWrapClass,
	segmentActiveClass,
	segmentClass,
	segmentedClass,
	textFieldClass,
	textFieldWideClass,
	timelineLaneClass,
} from "#/lib/ui";

export const Route = createFileRoute("/mentions")({
	component: MentionsRoute,
});

function MentionsRoute() {
	const [meta, setMeta] = useState<QueryEnvelope | null>(null);
	const [items, setItems] = useState<TimelineItem[]>([]);
	const [replyFilter, setReplyFilter] = useState<ReplyFilter>("unreplied");
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
		url.searchParams.set("resource", "mentions");
		url.searchParams.set("account", selectedAccountId);
		url.searchParams.set("replyFilter", replyFilter);
		url.searchParams.set("refresh", String(refreshTick));
		if (search.trim()) {
			url.searchParams.set("search", search.trim());
		}

		fetch(url)
			.then((response) => response.json())
			.then((data: QueryResponse) => setItems(data.items as TimelineItem[]));
	}, [refreshTick, replyFilter, search, selectedAccountId]);

	const subtitle = useMemo(() => {
		if (!meta) return "Loading mentions...";
		return `${meta.stats.mentions} mention/reply items in local store`;
	}, [meta]);

	const accountOptions = meta?.accounts ?? [];
	const selectedAccount =
		accountOptions.find((account) => account.id === selectedAccountId) ??
		getDefaultAccount(accountOptions);

	async function syncTarget(target: SyncTarget) {
		if (!selectedAccountId) return;
		setLoadingTargets((current) => [...current, target]);
		const kind = syncActionKind(target);

		try {
			await fetch("/api/action", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					kind,
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
		const text = window.prompt("Reply text");
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
						<p className={eyebrowClass}>mentions and replies</p>
						<h2 className={heroTitleClass}>
							Keep the actionable queue small and visible.
						</h2>
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
							className={cx(textFieldClass, textFieldWideClass)}
							onChange={(event) => setSearch(event.target.value)}
							placeholder="Search mentions"
							value={search}
						/>
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

				<section className={timelineLaneClass}>
					{items.map((item) => (
						<TimelineCard key={item.id} item={item} onReply={replyToTweet} />
					))}
				</section>
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
