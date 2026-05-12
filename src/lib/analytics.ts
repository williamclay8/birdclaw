import { getNativeDb } from "./db";
import type {
	AccountAnalyticsSummary,
	AnalyticsResponse,
	ProfileRecord,
	ProjectOpportunityItem,
	SharedAudienceItem,
	TopicSignal,
} from "./types";

const PROJECT_HANDLE = "@vantaprivacy";
const PERSONAL_HANDLE = "@williamclay";

const topicMatchers = [
	{
		topic: "Agent Payments",
		pattern:
			/agent|x402|api checkout|paid api|wallet|permission|spend|policy|revocation/i,
		weight: 5,
	},
	{
		topic: "Receipts",
		pattern: /receipt|verify|verified|proof|trust packet|settle|settlement/i,
		weight: 5,
	},
	{
		topic: "Merchant Metadata",
		pattern: /merchant|invoice|customer context|payout|metadata|internal note/i,
		weight: 5,
	},
	{
		topic: "Recovery",
		pattern: /refund|retry|failed|failure|recover|recovery|status|approved/i,
		weight: 4,
	},
	{
		topic: "Solana Stablecoins",
		pattern: /solana|stablecoin|\$vanta|bags|bagsapp/i,
		weight: 4,
	},
	{
		topic: "Privacy Proof",
		pattern:
			/privacy|private|selective disclosure|disclosure|surveillance|sovereignty/i,
		weight: 4,
	},
	{
		topic: "Launch Feedback",
		pattern: /launch|progress|beta|live|trust|reputation/i,
		weight: 3,
	},
	{
		topic: "Security Boundaries",
		pattern: /security|custody|self custody|signing key|key boundary|hardened/i,
		weight: 3,
	},
] as const;

function roleForHandle(handle: string): AccountAnalyticsSummary["role"] {
	if (handle.toLowerCase() === PROJECT_HANDLE) return "project";
	if (handle.toLowerCase() === PERSONAL_HANDLE) return "personal";
	return "other";
}

function toProfile(row: Record<string, unknown>): ProfileRecord {
	return {
		id: String(row.profile_id),
		handle: String(row.handle),
		displayName: String(row.display_name),
		bio: String(row.bio),
		followersCount: Number(row.followers_count),
		avatarHue: Number(row.avatar_hue),
		avatarUrl:
			typeof row.avatar_url === "string" ? String(row.avatar_url) : undefined,
		createdAt: String(row.profile_created_at),
	};
}

function getAccountSummaries(): AccountAnalyticsSummary[] {
	const db = getNativeDb();
	const rows = db
		.prepare(
			`
      select
        a.id,
        a.handle,
        a.name,
        count(distinct t.id) as mentions,
        count(distinct case when t.is_replied = 0 then t.id end) as unreplied_mentions,
        count(distinct c.id) as dms,
        count(distinct case when c.needs_reply = 1 then c.id end) as needs_reply_dms,
        count(distinct t.author_profile_id) as unique_mention_authors,
        max(t.created_at) as latest_mention_at
      from accounts a
      left join tweets t on t.account_id = a.id and t.kind = 'mention'
      left join dm_conversations c on c.account_id = a.id
      group by a.id
      order by a.is_default desc, mentions desc, lower(a.handle) asc
      `,
		)
		.all() as Array<Record<string, unknown>>;

	return rows.map((row) => ({
		accountId: String(row.id),
		handle: String(row.handle),
		name: String(row.name),
		role: roleForHandle(String(row.handle).toLowerCase()),
		mentions: Number(row.mentions),
		unrepliedMentions: Number(row.unreplied_mentions),
		dms: Number(row.dms),
		needsReplyDms: Number(row.needs_reply_dms),
		uniqueMentionAuthors: Number(row.unique_mention_authors),
		latestMentionAt:
			typeof row.latest_mention_at === "string"
				? String(row.latest_mention_at)
				: undefined,
	}));
}

function getSharedAudience(): SharedAudienceItem[] {
	const db = getNativeDb();
	const rows = db
		.prepare(
			`
      select
        p.id as profile_id,
        p.handle,
        p.display_name,
        p.bio,
        p.followers_count,
        p.avatar_hue,
        p.avatar_url,
        p.created_at as profile_created_at,
        sum(case when lower(a.handle) = ? then 1 else 0 end) as project_mentions,
        sum(case when lower(a.handle) = ? then 1 else 0 end) as personal_mentions,
        max(t.created_at) as latest_mention_at
      from tweets t
      join accounts a on a.id = t.account_id
      join profiles p on p.id = t.author_profile_id
      where t.kind = 'mention'
      group by p.id
      having project_mentions > 0 and personal_mentions > 0
      order by (project_mentions + personal_mentions) desc, latest_mention_at desc
      limit 12
      `,
		)
		.all(PROJECT_HANDLE, PERSONAL_HANDLE) as Array<Record<string, unknown>>;

	return rows.map((row) => ({
		profile: toProfile(row),
		projectMentions: Number(row.project_mentions),
		personalMentions: Number(row.personal_mentions),
		latestMentionAt: String(row.latest_mention_at),
	}));
}

function isLowQualitySignalText(value: string) {
	return /follow back|dm me|send me dm|shoot dm|project growth|pump your project|promo|collab|partnership|airdrop|whitelist|100x|rocket|fire/i.test(
		value,
	);
}

function topicQualityNotes({
	noiseMentions,
	projectMentions,
	personalMentions,
	score,
}: {
	noiseMentions: number;
	personalMentions: number;
	projectMentions: number;
	score: number;
}) {
	const notes = [
		"Quality-adjusted score favors specific receipts, permissions, metadata, recovery, and merchant-ops language.",
	];
	if (personalMentions > 0 && projectMentions > 0) {
		notes.push(
			"Both Clay's scout account and Vanta's project lane touched it.",
		);
	}
	if (noiseMentions > 0) {
		notes.push(
			`Downranked ${noiseMentions} low-quality collaboration, promo, or followback signal${noiseMentions === 1 ? "" : "s"}.`,
		);
	}
	if (score >= 30) {
		notes.push("Strong enough to outrank broad topic heat.");
	}
	return notes;
}

function getTopicSignals(): TopicSignal[] {
	const db = getNativeDb();
	const rows = db
		.prepare(
			`
      select
        a.handle as account_handle,
        t.text,
        t.like_count,
        coalesce(p.followers_count, 0) as followers_count
      from tweets t
      join accounts a on a.id = t.account_id
      left join profiles p on p.id = t.author_profile_id
      where t.kind = 'mention'
        and lower(a.handle) in (?, ?)
      order by t.created_at desc
      limit 240
      `,
		)
		.all(PROJECT_HANDLE, PERSONAL_HANDLE) as Array<Record<string, unknown>>;

	return topicMatchers
		.map(({ topic, pattern, weight }) => {
			const matches = rows.filter((row) => pattern.test(String(row.text)));
			const usefulMatches = matches.filter(
				(row) => !isLowQualitySignalText(String(row.text)),
			);
			const projectMentions = usefulMatches.filter(
				(row) => String(row.account_handle).toLowerCase() === PROJECT_HANDLE,
			).length;
			const personalMentions = usefulMatches.filter(
				(row) => String(row.account_handle).toLowerCase() === PERSONAL_HANDLE,
			).length;
			const noiseMentions = matches.length - usefulMatches.length;
			const score = Math.max(
				0,
				Math.round(
					usefulMatches.reduce((total, row) => {
						const accountWeight =
							String(row.account_handle).toLowerCase() === PERSONAL_HANDLE
								? 5
								: 4;
						const likeWeight = Math.min(8, Number(row.like_count) || 0);
						const audienceWeight = Math.min(
							10,
							Math.floor((Number(row.followers_count) || 0) / 1500),
						);
						return total + weight + accountWeight + likeWeight + audienceWeight;
					}, 0) -
						noiseMentions * 5,
				),
			);
			return {
				topic,
				projectMentions,
				personalMentions,
				sampleText: String(usefulMatches[0]?.text ?? matches[0]?.text ?? ""),
				score,
				noiseMentions,
				qualityNotes: topicQualityNotes({
					noiseMentions,
					projectMentions,
					personalMentions,
					score,
				}),
			};
		})
		.filter(
			(signal) =>
				signal.projectMentions + signal.personalMentions > 0 &&
				(signal.score ?? 0) > 0,
		)
		.sort(
			(left, right) =>
				(right.score ?? 0) - (left.score ?? 0) ||
				right.personalMentions - left.personalMentions ||
				right.projectMentions - left.projectMentions,
		);
}

function getProjectOpportunities(): ProjectOpportunityItem[] {
	const db = getNativeDb();
	const rows = db
		.prepare(
			`
      select
        t.id,
        t.account_id,
        a.handle as account_handle,
        t.text,
        t.created_at,
        t.like_count,
        p.id as profile_id,
        p.handle,
        p.display_name,
        p.bio,
        p.followers_count,
        p.avatar_hue,
        p.avatar_url,
        p.created_at as profile_created_at
      from tweets t
      join accounts a on a.id = t.account_id
      join profiles p on p.id = t.author_profile_id
      where t.kind = 'mention'
        and lower(a.handle) = ?
        and t.is_replied = 0
      order by
        case
          when t.text like '%?%' then 0
          when lower(t.text) like '%dm%' then 1
          else 2
        end,
        t.like_count desc,
        t.created_at desc
      limit 8
      `,
		)
		.all(PROJECT_HANDLE) as Array<Record<string, unknown>>;

	return rows.map((row) => {
		const text = String(row.text);
		const reason = text.includes("?")
			? "Question or confusion worth answering publicly"
			: /dm|collab|proposal/i.test(text)
				? "Inbound collaboration or DM request to triage"
				: "Recent unreplied project mention";
		return {
			id: String(row.id),
			accountId: String(row.account_id),
			accountHandle: String(row.account_handle),
			text,
			createdAt: String(row.created_at),
			likeCount: Number(row.like_count),
			author: toProfile(row),
			reason,
		};
	});
}

function getSourceBreakdown(): AnalyticsResponse["sourceBreakdown"] {
	const db = getNativeDb();
	const rows = db
		.prepare(
			`
      select
        kind,
        count(*) as count,
        max(created_at) as latest_at
      from tweets
      group by kind
      order by count desc, kind asc
      `,
		)
		.all() as Array<Record<string, unknown>>;
	const kinds = rows.map((row) => ({
		kind: String(row.kind) as "mention" | "home" | "like" | "bookmark",
		count: Number(row.count),
		latestAt:
			typeof row.latest_at === "string" ? String(row.latest_at) : undefined,
	}));
	const totalTweets = kinds.reduce((total, item) => total + item.count, 0);
	const latestTweetAt = kinds
		.flatMap((item) => (item.latestAt ? [item.latestAt] : []))
		.sort()
		.at(-1);

	return {
		totalTweets,
		latestTweetAt,
		kinds,
	};
}

function buildRecommendations({
	accounts,
	sharedAudience,
	topicSignals,
	projectOpportunities,
}: Omit<AnalyticsResponse, "recommendations">): string[] {
	const project = accounts.find((account) => account.role === "project");
	const personal = accounts.find((account) => account.role === "personal");
	const recommendations: string[] = [];

	if (project && project.unrepliedMentions > 0) {
		recommendations.push(
			`Reply from ${project.handle} to the highest-signal ${Math.min(project.unrepliedMentions, projectOpportunities.length)} project mentions before broad posting.`,
		);
	}

	if (personal && project) {
		recommendations.push(
			`Use ${personal.handle} as the research antenna and route privacy/Solana language into ${project.handle} posts.`,
		);
	}

	if (sharedAudience.length > 0) {
		recommendations.push(
			"Start with people who already overlap both accounts; they are the warmest bridge from personal trust to project distribution.",
		);
	}

	const topTopic = topicSignals[0];
	if (topTopic) {
		recommendations.push(
			`Turn the current top signal, ${topTopic.topic.toLowerCase()}, into a short project-account reply/post series.`,
		);
	}

	return recommendations;
}

export function getAnalyticsSummary(): AnalyticsResponse {
	const accounts = getAccountSummaries();
	const sharedAudience = getSharedAudience();
	const topicSignals = getTopicSignals();
	const projectOpportunities = getProjectOpportunities();
	const sourceBreakdown = getSourceBreakdown();
	return {
		accounts,
		sharedAudience,
		topicSignals,
		projectOpportunities,
		sourceBreakdown,
		recommendations: buildRecommendations({
			accounts,
			sharedAudience,
			topicSignals,
			projectOpportunities,
		}),
	};
}
