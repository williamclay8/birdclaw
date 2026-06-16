// @vitest-environment node
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { getAnalyticsSummary } from "./analytics";
import { resetBirdclawPathsForTests } from "./config";
import { getNativeDb, resetDatabaseForTests } from "./db";

const tempRoots: string[] = [];

function setupTempHome() {
	const tempRoot = mkdtempSync(path.join(os.tmpdir(), "birdclaw-analytics-"));
	tempRoots.push(tempRoot);
	process.env.BIRDCLAW_HOME = tempRoot;
	resetBirdclawPathsForTests();
	resetDatabaseForTests();
	return getNativeDb({ seedDemoData: false });
}

function insertAccount({
	id,
	handle,
	name,
	isDefault = 0,
}: {
	id: string;
	handle: string;
	name: string;
	isDefault?: number;
}) {
	getNativeDb({ seedDemoData: false })
		.prepare(
			`
      insert into accounts (
        id, name, handle, external_user_id, transport, is_default, created_at
      ) values (?, ?, ?, ?, ?, ?, ?)
      `,
		)
		.run(
			id,
			name,
			handle,
			null,
			"local",
			isDefault,
			"2026-04-30T00:00:00.000Z",
		);
}

function insertProfile({
	id,
	handle,
	followersCount,
	bio = "Merchant ops builder",
	avatarUrl = null,
}: {
	id: string;
	handle: string;
	followersCount: number;
	bio?: string;
	avatarUrl?: string | null;
}) {
	getNativeDb({ seedDemoData: false })
		.prepare(
			`
      insert into profiles (
        id, handle, display_name, bio, followers_count, avatar_hue, avatar_url, created_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?)
      `,
		)
		.run(
			id,
			handle,
			handle.replaceAll("_", " "),
			bio,
			followersCount,
			40,
			avatarUrl,
			"2026-04-30T00:00:00.000Z",
		);
}

function insertTweet({
	id,
	accountId,
	authorProfileId,
	text,
	createdAt,
	isReplied = 0,
	likeCount = 0,
	kind = "mention",
}: {
	id: string;
	accountId: string;
	authorProfileId: string;
	text: string;
	createdAt: string;
	isReplied?: number;
	likeCount?: number;
	kind?: "mention" | "home" | "like" | "bookmark";
}) {
	getNativeDb({ seedDemoData: false })
		.prepare(
			`
      insert into tweets (
        id, account_id, author_profile_id, kind, text, created_at, is_replied,
        reply_to_id, like_count, media_count, bookmarked, liked, entities_json, media_json, quoted_tweet_id
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
		)
		.run(
			id,
			accountId,
			authorProfileId,
			kind,
			text,
			createdAt,
			isReplied,
			null,
			likeCount,
			0,
			0,
			0,
			"{}",
			"[]",
			null,
		);
}

afterEach(() => {
	resetDatabaseForTests();
	resetBirdclawPathsForTests();
	delete process.env.BIRDCLAW_HOME;

	for (const tempRoot of tempRoots.splice(0)) {
		rmSync(tempRoot, { recursive: true, force: true });
	}
});

describe("getAnalyticsSummary", () => {
	it("builds account, audience, topic, opportunity, and source analytics", () => {
		const db = setupTempHome();

		insertAccount({
			id: "acct_project",
			handle: "@vantaprivacy",
			name: "Vanta",
			isDefault: 1,
		});
		insertAccount({
			id: "acct_personal",
			handle: "@williamclay",
			name: "Clay",
		});
		insertAccount({
			id: "acct_other",
			handle: "@birdclaw_lab",
			name: "Birdclaw",
		});

		insertProfile({
			id: "profile_overlap",
			handle: "merchant_ops",
			followersCount: 5400,
			avatarUrl: "https://example.com/avatar.png",
		});
		insertProfile({
			id: "profile_builder",
			handle: "builder_q",
			followersCount: 2400,
		});
		insertProfile({
			id: "profile_noise",
			handle: "promo_bot",
			followersCount: 200,
			bio: "",
		});
		insertProfile({
			id: "profile_recent",
			handle: "recent_user",
			followersCount: 1200,
		});

		insertTweet({
			id: "tweet_project_question",
			accountId: "acct_project",
			authorProfileId: "profile_builder",
			text: "@vantaprivacy how does the merchant verify the receipt?",
			createdAt: "2026-04-30T12:00:00.000Z",
			likeCount: 5,
		});
		insertTweet({
			id: "tweet_project_dm",
			accountId: "acct_project",
			authorProfileId: "profile_noise",
			text: "@vantaprivacy DM me for project growth rockets",
			createdAt: "2026-04-30T11:00:00.000Z",
			likeCount: 1,
		});
		insertTweet({
			id: "tweet_project_recent",
			accountId: "acct_project",
			authorProfileId: "profile_recent",
			text: "@vantaprivacy recovery status should show approved refunds",
			createdAt: "2026-04-30T10:00:00.000Z",
			isReplied: 1,
		});
		insertTweet({
			id: "tweet_project_overlap",
			accountId: "acct_project",
			authorProfileId: "profile_overlap",
			text: "@vantaprivacy private settlement receipt for merchants",
			createdAt: "2026-04-30T09:00:00.000Z",
			likeCount: 2,
		});
		insertTweet({
			id: "tweet_personal_overlap",
			accountId: "acct_personal",
			authorProfileId: "profile_overlap",
			text: "@williamclay Solana wallet policy and privacy proof boundaries",
			createdAt: "2026-04-30T08:00:00.000Z",
			likeCount: 4,
		});
		insertTweet({
			id: "tweet_other",
			accountId: "acct_other",
			authorProfileId: "profile_recent",
			text: "@birdclaw_lab local archive dashboard",
			createdAt: "2026-04-30T07:00:00.000Z",
		});
		insertTweet({
			id: "tweet_home",
			accountId: "acct_personal",
			authorProfileId: "profile_overlap",
			text: "Home timeline receipt bookmark",
			createdAt: "2026-04-30T06:00:00.000Z",
			kind: "home",
		});

		db.prepare(
			`
      insert into dm_conversations (
        id, account_id, participant_profile_id, title, last_message_at, unread_count, needs_reply
      ) values (?, ?, ?, ?, ?, ?, ?)
      `,
		).run(
			"dm_project",
			"acct_project",
			"profile_overlap",
			"Merchant ops",
			"2026-04-30T13:00:00.000Z",
			0,
			1,
		);

		const summary = getAnalyticsSummary();

		expect(summary.accounts).toEqual([
			expect.objectContaining({
				accountId: "acct_project",
				handle: "@vantaprivacy",
				role: "project",
				mentions: 4,
				unrepliedMentions: 3,
				dms: 1,
				needsReplyDms: 1,
				uniqueMentionAuthors: 4,
				latestMentionAt: "2026-04-30T12:00:00.000Z",
			}),
			expect.objectContaining({
				accountId: "acct_other",
				handle: "@birdclaw_lab",
				role: "other",
			}),
			expect.objectContaining({
				accountId: "acct_personal",
				handle: "@williamclay",
				role: "personal",
				mentions: 1,
			}),
		]);

		expect(summary.sharedAudience).toEqual([
			expect.objectContaining({
				profile: expect.objectContaining({
					id: "profile_overlap",
					handle: "merchant_ops",
					avatarUrl: "https://example.com/avatar.png",
				}),
				projectMentions: 1,
				personalMentions: 1,
				latestMentionAt: "2026-04-30T09:00:00.000Z",
			}),
		]);

		expect(
			summary.topicSignals.find((signal) => signal.topic === "Receipts"),
		).toEqual(
			expect.objectContaining({
				topic: "Receipts",
				projectMentions: 2,
				personalMentions: 1,
				score: expect.any(Number),
				qualityNotes: expect.arrayContaining([
					expect.stringContaining("Quality-adjusted score"),
				]),
			}),
		);
		expect(
			summary.topicSignals.find((signal) => signal.topic === "Receipts")
				?.noiseMentions,
		).toBe(0);
		expect(
			summary.topicSignals.find((signal) => signal.topic === "Privacy Proof")
				?.qualityNotes,
		).toEqual(
			expect.arrayContaining([
				"Both Clay's scout account and Vanta's project lane touched it.",
			]),
		);

		expect(summary.projectOpportunities.map((item) => item.reason)).toEqual([
			"Question or confusion worth answering publicly",
			"Inbound collaboration or DM request to triage",
			"Recent unreplied project mention",
		]);
		expect(summary.sourceBreakdown).toEqual(
			expect.objectContaining({
				totalTweets: 7,
				latestTweetAt: "2026-04-30T12:00:00.000Z",
				kinds: expect.arrayContaining([
					{ kind: "mention", count: 6, latestAt: "2026-04-30T12:00:00.000Z" },
					{ kind: "home", count: 1, latestAt: "2026-04-30T06:00:00.000Z" },
				]),
			}),
		);
		expect(summary.recommendations).toEqual(
			expect.arrayContaining([
				expect.stringContaining("Reply from @vantaprivacy"),
				expect.stringContaining("Use @williamclay as the research antenna"),
				expect.stringContaining("people who already overlap both accounts"),
				expect.stringContaining("current top signal"),
			]),
		);
	});

	it("returns empty recommendations when no project, personal, audience, or topics exist", () => {
		setupTempHome();
		insertAccount({
			id: "acct_other",
			handle: "@birdclaw_lab",
			name: "Birdclaw",
			isDefault: 1,
		});

		const summary = getAnalyticsSummary();

		expect(summary.accounts).toEqual([
			expect.objectContaining({
				accountId: "acct_other",
				role: "other",
				latestMentionAt: undefined,
			}),
		]);
		expect(summary.sharedAudience).toEqual([]);
		expect(summary.topicSignals).toEqual([]);
		expect(summary.projectOpportunities).toEqual([]);
		expect(summary.sourceBreakdown).toEqual({
			totalTweets: 0,
			latestTweetAt: undefined,
			kinds: [],
		});
		expect(summary.recommendations).toEqual([]);
	});
});
