import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AccountSwitcher } from "#/components/AccountSwitcher";
import { SyncToolbar, type SyncTarget } from "#/components/SyncToolbar";
import { TimelineCard } from "#/components/TimelineCard";
import type { ProjectContentWorkflow } from "#/lib/content-workflow";
import type {
	AccountRecord,
	AnalyticsResponse,
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
	stackGridClass,
	surfaceCardClass,
	textFieldClass,
	textFieldWideClass,
	timelineLaneClass,
} from "#/lib/ui";

export const Route = createFileRoute("/")({
	component: HomeRoute,
});

function HomeRoute() {
	const [meta, setMeta] = useState<QueryEnvelope | null>(null);
	const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
	const [contentWorkflow, setContentWorkflow] =
		useState<ProjectContentWorkflow | null>(null);
	const [items, setItems] = useState<TimelineItem[]>([]);
	const [replyFilter, setReplyFilter] = useState<ReplyFilter>("all");
	const [search, setSearch] = useState("");
	const [refreshTick, setRefreshTick] = useState(0);
	const [selectedAccountId, setSelectedAccountId] = useState("all");
	const [loadingTargets, setLoadingTargets] = useState<SyncTarget[]>([]);
	const [replyCopyStatus, setReplyCopyStatus] = useState("");

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

	function refreshAnalytics() {
		fetch("/api/analytics")
			.then((response) => response.json())
			.then((data: AnalyticsResponse) => setAnalytics(data))
			.catch(() => setAnalytics(null));
		fetch("/api/content-workflow")
			.then((response) => response.json())
			.then((data: ProjectContentWorkflow) => setContentWorkflow(data))
			.catch(() => setContentWorkflow(null));
	}

	useEffect(() => {
		refreshStatus();
		refreshAnalytics();
	}, []);

	useEffect(() => {
		if (!selectedAccountId) return;
		const url = new URL("/api/query", window.location.origin);
		url.searchParams.set("resource", "home");
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
		if (!meta) return "Loading local context...";
		return `${meta.stats.home} home items · ${meta.stats.needsReply} waiting on action · ${meta.transport.statusText}`;
	}, [meta]);

	const accountOptions = meta?.accounts ?? [];
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
			refreshAnalytics();
			setRefreshTick((value) => value + 1);
		} finally {
			setLoadingTargets((current) =>
				current.filter((value) => value !== target),
			);
		}
	}

	async function replyToTweet(_tweetId: string) {
		const text = window.prompt("Reply text");
		if (!text?.trim()) return;

		try {
			if (!navigator.clipboard?.writeText) {
				throw new Error("Clipboard API unavailable");
			}
			await navigator.clipboard.writeText(text.trim());
			setReplyCopyStatus(
				"Copied reply to clipboard. Review in X before posting.",
			);
		} catch {
			setReplyCopyStatus(
				"Clipboard unavailable. Select and copy the reply manually.",
			);
		}
	}

	return (
		<main className={pageWrapClass}>
			<div className={feedPageClass}>
				{replyCopyStatus ? (
					<p
						aria-live="polite"
						className="m-0 rounded-[16px] bg-[var(--panel-strong)] p-3 text-sm font-medium text-[var(--ink)] shadow-[inset_0_0_0_1px_var(--line)]"
						role="status"
					>
						{replyCopyStatus}
					</p>
				) : null}
				<section className={heroShellClass}>
					<div>
						<p className={eyebrowClass}>home timeline</p>
						<h2 className={heroTitleClass}>
							Read first. Act only where signal survives.
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
							placeholder="Search local timeline"
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

				<AnalyticsPanel analytics={analytics} />
				<ContentWorkflowPanel workflow={contentWorkflow} />

				<section className={timelineLaneClass}>
					{items.map((item) => (
						<TimelineCard key={item.id} item={item} onReply={replyToTweet} />
					))}
				</section>
			</div>
		</main>
	);
}

function ContentWorkflowPanel({
	workflow,
}: {
	workflow: ProjectContentWorkflow | null;
}) {
	if (!workflow) return null;

	return (
		<section
			aria-label="Vanta content workflow"
			className={cx(surfaceCardClass, "grid gap-4 p-5")}
		>
			<div className="flex items-start justify-between gap-4 max-[760px]:flex-col">
				<div>
					<p className={eyebrowClass}>audience to drafts</p>
					<h3 className="m-0 font-display text-[1.65rem] leading-tight">
						Build @vantaprivacy from personal signal.
					</h3>
					<p className={heroCopyClass}>{workflow.bridgeTheme}</p>
				</div>
				<span className="rounded-full border border-[var(--line)] bg-[var(--accent-soft)] px-3 py-2 text-sm font-medium text-[var(--accent)]">
					manual only
				</span>
			</div>
			<div className="grid gap-3 min-[860px]:grid-cols-[0.9fr_1.1fr]">
				<div className="grid gap-2">
					<p className="m-0 text-sm font-medium text-[var(--ink)]">
						Content lanes
					</p>
					{workflow.pillars.slice(0, 3).map((pillar) => (
						<div
							key={`${pillar.title}-${pillar.topic}`}
							className="rounded-[16px] border border-[var(--line)] bg-[color:color-mix(in_srgb,var(--panel-strong)_76%,transparent)] p-3.5"
						>
							<p className="m-0 text-sm font-medium text-[var(--ink)]">
								{pillar.title}
							</p>
							<p className="m-0 mt-1 text-[0.9rem] leading-relaxed text-[var(--ink-soft)]">
								{pillar.angle}
							</p>
						</div>
					))}
				</div>
				<div className="grid gap-2">
					<p className="m-0 text-sm font-medium text-[var(--ink)]">
						Post drafts
					</p>
					{workflow.postDrafts.slice(0, 3).map((draft) => (
						<div
							key={draft.id}
							className="rounded-[16px] border border-[var(--line)] bg-[color:color-mix(in_srgb,var(--panel-strong)_76%,transparent)] p-3.5"
						>
							<p className="m-0 text-[0.9rem] uppercase tracking-[0.12em] text-[var(--ink-soft)]">
								{draft.archetype}
							</p>
							<p className="m-0 mt-2 text-[0.98rem] leading-relaxed">
								{draft.text}
							</p>
						</div>
					))}
				</div>
			</div>
			{workflow.replyPrompts.length > 0 ? (
				<div className="grid gap-2">
					<p className="m-0 text-sm font-medium text-[var(--ink)]">
						Reply prompts
					</p>
					{workflow.replyPrompts.slice(0, 2).map((prompt) => (
						<p
							key={prompt.tweetId}
							className="m-0 rounded-[16px] border border-[var(--line)] bg-[color:color-mix(in_srgb,var(--panel-strong)_76%,transparent)] px-3.5 py-3 text-[0.94rem] leading-relaxed text-[var(--ink-soft)]"
						>
							<span className="font-medium text-[var(--ink)]">
								@{prompt.authorHandle}
							</span>{" "}
							{prompt.suggestedReply}
						</p>
					))}
				</div>
			) : null}
			<p className="m-0 text-[0.88rem] text-[var(--ink-soft)]">
				{workflow.safetyNotes[0] ?? workflow.safetyNote}
			</p>
		</section>
	);
}

function AnalyticsPanel({
	analytics,
}: {
	analytics: AnalyticsResponse | null;
}) {
	if (!analytics) return null;

	const project = analytics.accounts.find(
		(account) => account.role === "project",
	);
	const personal = analytics.accounts.find(
		(account) => account.role === "personal",
	);
	const topTopic = analytics.topicSignals[0];

	return (
		<section
			aria-label="Project growth analytics"
			className={cx(surfaceCardClass, "grid gap-4 p-5")}
		>
			<div>
				<p className={eyebrowClass}>personal signal to project growth</p>
				<h3 className="m-0 font-display text-[1.65rem] leading-tight">
					Use {personal?.handle ?? "@williamclay"} to aim{" "}
					{project?.handle ?? "@vantaprivacy"}.
				</h3>
			</div>
			<div className="grid gap-3 min-[760px]:grid-cols-3">
				<MetricCard
					label="Project mentions"
					value={project?.mentions ?? 0}
					secondary={`${project?.unrepliedMentions ?? 0} unreplied`}
				/>
				<MetricCard
					label="Personal mentions"
					value={personal?.mentions ?? 0}
					secondary={`${personal?.uniqueMentionAuthors ?? 0} people`}
				/>
				<MetricCard
					label="Warm overlap"
					value={analytics.sharedAudience.length}
					secondary={topTopic ? `${topTopic.topic} is hot` : "building sample"}
				/>
			</div>
			<div className={cx(stackGridClass, "min-[860px]:grid-cols-2")}>
				<div>
					<p className="m-0 mb-2 text-sm font-medium text-[var(--ink)]">
						Recommended next moves
					</p>
					<ul className="m-0 grid gap-2 pl-5 text-[0.95rem] leading-relaxed text-[var(--ink-soft)]">
						{analytics.recommendations.slice(0, 3).map((item) => (
							<li key={item}>{item}</li>
						))}
					</ul>
				</div>
				<div>
					<p className="m-0 mb-2 text-sm font-medium text-[var(--ink)]">
						Project reply queue
					</p>
					<div className="grid gap-2">
						{analytics.projectOpportunities.slice(0, 3).map((item) => (
							<p
								key={item.id}
								className="m-0 rounded-[16px] border border-[var(--line)] bg-[color:color-mix(in_srgb,var(--panel-strong)_78%,transparent)] px-3.5 py-3 text-[0.92rem] leading-relaxed text-[var(--ink-soft)]"
							>
								<span className="font-medium text-[var(--ink)]">
									@{item.author.handle}
								</span>{" "}
								{item.reason}
							</p>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}

function MetricCard({
	label,
	value,
	secondary,
}: {
	label: string;
	value: number;
	secondary: string;
}) {
	return (
		<div className="rounded-[16px] border border-[var(--line)] bg-[color:color-mix(in_srgb,var(--panel-strong)_76%,transparent)] p-4">
			<p className="m-0 text-[0.8rem] uppercase tracking-[0.12em] text-[var(--ink-soft)]">
				{label}
			</p>
			<p className="m-0 mt-2 font-display text-3xl leading-none">{value}</p>
			<p className="m-0 mt-1.5 text-sm text-[var(--ink-soft)]">{secondary}</p>
		</div>
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
