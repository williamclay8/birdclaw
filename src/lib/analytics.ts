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
	{ topic: "Privacy", pattern: /privacy|private|surveillance|sovereignty/i },
	{ topic: "Solana", pattern: /solana|\$vanta|bags|bagsapp/i },
	{
		topic: "Collaboration",
		pattern: /collab|partner|proposal|dm me|talk in dm/i,
	},
	{
		topic: "Launch Feedback",
		pattern: /progress|production|live|status|trust/i,
	},
	{ topic: "Security", pattern: /security|custody|self custody|hardened/i },
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

function getTopicSignals(): TopicSignal[] {
	const db = getNativeDb();
	const rows = db
		.prepare(
			`
      select a.handle as account_handle, t.text
      from tweets t
      join accounts a on a.id = t.account_id
      where t.kind = 'mention'
        and lower(a.handle) in (?, ?)
      order by t.created_at desc
      limit 240
      `,
		)
		.all(PROJECT_HANDLE, PERSONAL_HANDLE) as Array<Record<string, unknown>>;

	return topicMatchers
		.map(({ topic, pattern }) => {
			const matches = rows.filter((row) => pattern.test(String(row.text)));
			const projectMentions = matches.filter(
				(row) => String(row.account_handle).toLowerCase() === PROJECT_HANDLE,
			).length;
			const personalMentions = matches.filter(
				(row) => String(row.account_handle).toLowerCase() === PERSONAL_HANDLE,
			).length;
			return {
				topic,
				projectMentions,
				personalMentions,
				sampleText: String(matches[0]?.text ?? ""),
			};
		})
		.filter((signal) => signal.projectMentions + signal.personalMentions > 0)
		.sort(
			(left, right) =>
				right.projectMentions +
				right.personalMentions -
				(left.projectMentions + left.personalMentions),
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
	return {
		accounts,
		sharedAudience,
		topicSignals,
		projectOpportunities,
		recommendations: buildRecommendations({
			accounts,
			sharedAudience,
			topicSignals,
			projectOpportunities,
		}),
	};
}
