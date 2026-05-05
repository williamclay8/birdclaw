import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { InboxCard } from "#/components/InboxCard";
import type {
	InboxItem,
	InboxKind,
	InboxResponse,
	QueryEnvelope,
} from "#/lib/types";
import {
	actionButtonClass,
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
	inboxLaneClass,
	navLinkActiveClass,
	navLinkClass,
	pageWrapClass,
	segmentActiveClass,
	segmentClass,
	segmentedClass,
	textFieldClass,
	textFieldShortClass,
	timestampClass,
} from "#/lib/ui";

export const Route = createFileRoute("/inbox")({
	component: InboxRoute,
});

function InboxRoute() {
	const [meta, setMeta] = useState<QueryEnvelope | null>(null);
	const [items, setItems] = useState<InboxItem[]>([]);
	const [kind, setKind] = useState<InboxKind>("mixed");
	const [minScore, setMinScore] = useState("40");
	const [hideLowSignal, setHideLowSignal] = useState(true);
	const [refreshTick, setRefreshTick] = useState(0);
	const [isScoring, setIsScoring] = useState(false);
	const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
	const [replyDraft, setReplyDraft] = useState("");
	const [isSendingReply, setIsSendingReply] = useState(false);
	const [stats, setStats] = useState<InboxResponse["stats"] | null>(null);

	useEffect(() => {
		fetch("/api/status")
			.then((response) => response.json())
			.then((data: QueryEnvelope) => setMeta(data));
	}, []);

	useEffect(() => {
		const url = new URL("/api/inbox", window.location.origin);
		url.searchParams.set("kind", kind);
		url.searchParams.set("minScore", minScore);
		url.searchParams.set("refresh", String(refreshTick));
		if (hideLowSignal) {
			url.searchParams.set("hideLowSignal", "1");
		}

		fetch(url)
			.then((response) => response.json())
			.then((data: InboxResponse) => {
				setItems(data.items);
				setStats(data.stats);
			});
	}, [hideLowSignal, kind, minScore, refreshTick]);

	const subtitle = useMemo(() => {
		if (!meta || !stats) return "Ranking unreplied mentions and DMs...";
		return `${stats.total} items in queue · ${stats.openai} optional AI scores · ${meta.transport.statusText}`;
	}, [meta, stats]);

	async function scoreNow() {
		setIsScoring(true);
		try {
			await fetch("/api/action", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					kind: "scoreInbox",
					scoreKind: kind,
					limit: 8,
				}),
			});
			setRefreshTick((value) => value + 1);
		} finally {
			setIsScoring(false);
		}
	}

	async function sendReply(item: InboxItem) {
		if (!replyDraft.trim()) return;
		setIsSendingReply(true);
		try {
			await fetch("/api/action", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(
					item.entityKind === "dm"
						? {
								kind: "replyDm",
								conversationId: item.entityId,
								text: replyDraft,
							}
						: {
								kind: "replyTweet",
								accountId: item.accountId,
								tweetId: item.entityId,
								text: replyDraft,
							},
				),
			});
			setReplyDraft("");
			setActiveReplyId(null);
			setRefreshTick((value) => value + 1);
		} finally {
			setIsSendingReply(false);
		}
	}

	return (
		<main className={pageWrapClass}>
			<div className={feedPageClass}>
				<section className={heroShellClass}>
					<div>
						<p className={eyebrowClass}>inbox</p>
						<h2 className={heroTitleClass}>
							Find the replies worth your attention.
						</h2>
						<p className={heroCopyClass}>{subtitle}</p>
					</div>
					<div className={heroControlsClass}>
						<div
							aria-label="Inbox type"
							className={segmentedClass}
							role="group"
						>
							{(["mixed", "mentions", "dms"] as const).map((value) => (
								<button
									key={value}
									aria-pressed={value === kind}
									className={cx(
										segmentClass,
										value === kind && segmentActiveClass,
									)}
									onClick={() => setKind(value)}
									type="button"
								>
									{value}
								</button>
							))}
						</div>
						<input
							aria-label="Minimum priority score"
							className={cx(textFieldClass, textFieldShortClass)}
							inputMode="numeric"
							onChange={(event) => setMinScore(event.target.value)}
							placeholder="Min score"
							value={minScore}
						/>
						<button
							className={cx(navLinkClass, hideLowSignal && navLinkActiveClass)}
							onClick={() => setHideLowSignal((value) => !value)}
							type="button"
						>
							{hideLowSignal ? "Hide low-signal" : "Show all"}
						</button>
						<button
							className={actionButtonClass}
							disabled={isScoring}
							onClick={() => void scoreNow()}
							type="button"
						>
							{isScoring ? "Ranking..." : "Rank queue"}
						</button>
					</div>
				</section>

				{items.length > 0 ? (
					<section
						aria-label="Priority inbox results"
						className={inboxLaneClass}
					>
						{items.map((item) => (
							<InboxCard
								key={item.id}
								isReplying={activeReplyId === item.id}
								item={item}
								onReplyChange={setReplyDraft}
								onReplySend={() => void sendReply(item)}
								onReplyToggle={() => {
									if (activeReplyId === item.id) {
										setActiveReplyId(null);
										setReplyDraft("");
										return;
									}
									setActiveReplyId(item.id);
									setReplyDraft("");
								}}
								replyDraft={activeReplyId === item.id ? replyDraft : ""}
							/>
						))}
					</section>
				) : (
					<section aria-live="polite" className={emptyPanelClass}>
						<h3 className={emptyPanelTitleClass}>
							No replies need attention under these filters
						</h3>
						<p className={emptyPanelCopyClass}>
							Lower the score threshold, show low-signal items, or sync again to
							refresh the queue.
						</p>
					</section>
				)}
			</div>
			{isSendingReply ? (
				<p className={timestampClass}>Sending reply...</p>
			) : null}
		</main>
	);
}
