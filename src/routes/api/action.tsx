import { createFileRoute } from "@tanstack/react-router";
import { addBlock, removeBlock, syncBlocks } from "#/lib/blocks";
import { syncDirectMessagesViaCachedBird } from "#/lib/dms-live";
import { scoreInbox } from "#/lib/inbox";
import { exportMentionsViaCachedBird } from "#/lib/mentions-live";
import { addMute, removeMute } from "#/lib/mutes";
import { createDmReply, createPost, createTweetReply } from "#/lib/queries";
import { syncTimelineCollection } from "#/lib/timeline-collections-live";
import type { ActionsTransport } from "#/lib/config";
import type { InboxKind } from "#/lib/types";

function parseActionsTransport(
	value: string | undefined,
): ActionsTransport | undefined {
	return value === "auto" || value === "bird" || value === "xurl"
		? value
		: undefined;
}

function parseBoolean(value: string | undefined, fallback = false): boolean {
	if (value === undefined) {
		return fallback;
	}
	return value === "true";
}

function parseOptionalNumber(value: string | undefined): number | undefined {
	return value === undefined ? undefined : Number(value);
}

export const Route = createFileRoute("/api/action")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				const body = (await request.json()) as Record<string, string>;
				const transport = parseActionsTransport(body.transport);
				let result: unknown;

				if (body.kind === "post") {
					result = await createPost(
						body.accountId || "acct_primary",
						body.text || "",
					);
				} else if (body.kind === "replyTweet") {
					result = await createTweetReply(
						body.accountId || "acct_primary",
						body.tweetId || "",
						body.text || "",
					);
				} else if (body.kind === "replyDm") {
					result = await createDmReply(
						body.conversationId || "",
						body.text || "",
					);
				} else if (body.kind === "scoreInbox") {
					result = await scoreInbox({
						kind: ((body.scoreKind as InboxKind) || "mixed") as InboxKind,
						limit: body.limit ? Number(body.limit) : 8,
					});
				} else if (body.kind === "blockProfile") {
					result = await addBlock(
						body.accountId || "acct_primary",
						body.query || "",
						{
							transport,
						},
					);
				} else if (body.kind === "unblockProfile") {
					result = await removeBlock(
						body.accountId || "acct_primary",
						body.query || "",
						{
							transport,
						},
					);
				} else if (body.kind === "muteProfile") {
					result = await addMute(
						body.accountId || "acct_primary",
						body.query || "",
						{
							transport,
						},
					);
				} else if (body.kind === "unmuteProfile") {
					result = await removeMute(
						body.accountId || "acct_primary",
						body.query || "",
						{
							transport,
						},
					);
				} else if (body.kind === "syncBlocks") {
					result = await syncBlocks(body.accountId || "acct_primary");
				} else if (body.kind === "syncMentions") {
					result = await exportMentionsViaCachedBird({
						account: body.accountId || "acct_primary",
						search: body.search,
						replyFilter: "all",
						limit: body.limit ? Number(body.limit) : 20,
						all: parseBoolean(body.all),
						maxPages: parseOptionalNumber(body.maxPages),
						refresh: parseBoolean(body.refresh),
						cacheTtlMs: parseOptionalNumber(body.cacheTtlMs),
					});
				} else if (body.kind === "syncLikes") {
					result = await syncTimelineCollection({
						kind: "likes",
						account: body.accountId || "acct_primary",
						mode: "bird",
						limit: body.limit ? Number(body.limit) : 20,
						all: parseBoolean(body.all),
						maxPages: parseOptionalNumber(body.maxPages),
						refresh: parseBoolean(body.refresh),
						cacheTtlMs: parseOptionalNumber(body.cacheTtlMs),
					});
				} else if (body.kind === "syncBookmarks") {
					result = await syncTimelineCollection({
						kind: "bookmarks",
						account: body.accountId || "acct_primary",
						mode: "bird",
						limit: body.limit ? Number(body.limit) : 20,
						all: parseBoolean(body.all),
						maxPages: parseOptionalNumber(body.maxPages),
						refresh: parseBoolean(body.refresh),
						cacheTtlMs: parseOptionalNumber(body.cacheTtlMs),
					});
				} else if (body.kind === "syncDms") {
					result = await syncDirectMessagesViaCachedBird({
						account: body.accountId || "acct_primary",
						limit: body.limit ? Number(body.limit) : 20,
						refresh: parseBoolean(body.refresh),
						cacheTtlMs: parseOptionalNumber(body.cacheTtlMs),
					});
				} else {
					return new Response(
						JSON.stringify({ ok: false, message: "Unknown action kind" }),
						{
							status: 400,
							headers: { "content-type": "application/json" },
						},
					);
				}

				return new Response(JSON.stringify(result), {
					headers: {
						"content-type": "application/json",
					},
				});
			},
		},
	},
});
