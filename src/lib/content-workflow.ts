import type { AnalyticsResponse } from "./types";
import {
	VANTA_CT_ENGAGEMENT_PLAYBOOK,
	buildVantaContentPlan,
	buildVantaVoiceBridgePairs,
	VANTA_FORBIDDEN_CONTENT_CLAIMS,
} from "./vanta-content-workflow";
import type {
	EngagementGoal,
	EngagementPattern,
	VantaProofBoundary,
	VantaContentPriority,
	VantaReviewChecklistItem,
} from "./vanta-content-workflow";
export type {
	VantaContentPillar as ProjectContentPillar,
	VantaContentPlan as ProjectContentWorkflow,
	VantaPostDraft as ProjectPostDraft,
	VantaReplyPrompt as ProjectReplyPrompt,
} from "./vanta-content-workflow";

export { VANTA_FORBIDDEN_CONTENT_CLAIMS };

export interface PersonalPostDraft {
	id: string;
	accountHandle: "@williamclay";
	archetype: string;
	body: string;
	text: string;
	sourceSignal: string;
	sourceEvidence: string[];
	approvedToPost: false;
	engagementGoal: EngagementGoal;
	engagementPattern: EngagementPattern;
	tension: string;
	replyEdge: string;
	artifactNeeded: string;
	priority: VantaContentPriority;
	score: number;
	nextAction: string;
	whyItMatters: string;
	reviewChecklist: VantaReviewChecklistItem[];
	proofBoundary: VantaProofBoundary;
}

function buildPersonalPostDrafts(): PersonalPostDraft[] {
	const drafts = [
		{
			id: "personal-draft-agent-permissions",
			archetype: "AI agent pattern read",
			body: "the agent wallet problem is not intelligence. it is blast radius.",
			engagementGoal: "reply",
			engagementPattern: "personal_observation",
			tension: "agent capability vs default permissions",
			replyEdge:
				"AI builders can argue what permission boundary should be default.",
			artifactNeeded: "none",
			score: 74,
			whyItMatters:
				"Turns the current AI-failure feed pattern into a replyable opinion without borrowing panic.",
		},
		{
			id: "personal-draft-ct-receipts",
			archetype: "CT infrastructure read",
			body: "CT notices the scoreboard instantly. the operating system underneath it usually gets discussed three disasters later.",
			engagementGoal: "share",
			engagementPattern: "contradiction",
			tension: "public argument vs durable context",
			replyEdge:
				"Crypto people can name the receipt or record they wish existed.",
			artifactNeeded: "none",
			score: 70,
			whyItMatters:
				"Connects CT drama to a durable Vanta-adjacent idea from the personal voice.",
		},
		{
			id: "personal-draft-build-checklist",
			archetype: "save-worthy builder checklist",
			body: "useful product test: if the screenshot goes viral, can a normal person tell what happened, who had permission, and what changed?",
			engagementGoal: "bookmark",
			engagementPattern: "reply_bait_question",
			tension: "viral screenshot vs inspectable context",
			replyEdge: "Product builders can apply the test to their own flows.",
			artifactNeeded: "workflow screenshot",
			score: 78,
			whyItMatters:
				"Creates a reusable builder heuristic that can pull saves and replies.",
		},
		{
			id: "personal-draft-local-workflow-proof",
			archetype: "workflow proof caption",
			body: "best use of agents so far is not replacing taste. it is forcing the messy loop into a local workflow you can inspect and keep improving.",
			engagementGoal: "proof",
			engagementPattern: "artifact_caption",
			tension: "agent speed vs inspectable taste",
			replyEdge: "Agent users can compare how they keep taste in the loop.",
			artifactNeeded: "local workflow screenshot",
			score: 68,
			whyItMatters:
				"Fits Clay's personal account: agent workflow, local tooling, taste, and proof over hype.",
		},
		{
			id: "personal-draft-launch-receipt",
			archetype: "launch culture read",
			body: "every new crypto launch has two products: the thing and the explanation of why it is not a rug.",
			engagementGoal: "reply",
			engagementPattern: "personal_observation",
			tension: "distribution speed vs trust explanation",
			replyEdge:
				"Founders and CT people can argue what evidence a launch needs to survive ambiguity.",
			artifactNeeded: "none",
			score: 72,
			whyItMatters:
				"Uses live launch-culture interest while keeping the point on product evidence instead of promotion.",
		},
		{
			id: "personal-draft-manual-taste",
			archetype: "founder taste note",
			body: "best founder taste right now is probably knowing which parts of the flow should stay manual.",
			engagementGoal: "bookmark",
			engagementPattern: "compressed_take",
			tension: "autonomy vs human review",
			replyEdge:
				"Builders can argue which steps should stay manual as agents get more capable.",
			artifactNeeded: "workflow screenshot",
			score: 69,
			whyItMatters:
				"Connects Clay's agent workflow taste to current crypto-agent permission debates.",
		},
		{
			id: "personal-draft-ct-product-spec",
			archetype: "CT product spec",
			body: "the weird thing about CT is that every panic is also an accidental product requirements doc.",
			engagementGoal: "share",
			engagementPattern: "compressed_take",
			tension: "public panic vs product requirement",
			replyEdge:
				"Builders can name the controls every panic accidentally specifies.",
			artifactNeeded: "none",
			score: 71,
			whyItMatters:
				"Turns timeline chaos into founder/product taste without quote-tweet pile-ons.",
		},
		{
			id: "personal-draft-agent-demo-permission",
			archetype: "agent demo skepticism",
			body: "i trust agent demos more when they show the permission screen before the magic.",
			engagementGoal: "reply",
			engagementPattern: "personal_observation",
			tension: "agent magic vs permission screen",
			replyEdge:
				"Agent builders can argue what should be shown before autonomy.",
			artifactNeeded: "permission screen screenshot",
			score: 73,
			whyItMatters:
				"Provides a short, replyable personal take that trains the audience toward permission-first product taste.",
		},
		{
			id: "personal-draft-wallet-group-chat",
			archetype: "wallet UX read",
			body: "a wallet flow is not done when the payment succeeds. it is done when the explanation survives a confused group chat.",
			engagementGoal: "bookmark",
			engagementPattern: "personal_observation",
			tension: "payment success vs social explanation",
			replyEdge:
				"Wallet users can name the context that should survive the screenshot.",
			artifactNeeded: "wallet receipt or screenshot teardown",
			score: 72,
			whyItMatters:
				"Connects personal product taste to wallet receipts and context without sounding like project marketing.",
		},
		{
			id: "personal-draft-fast-intern",
			archetype: "agent workflow metaphor",
			body: "the best agent workflows feel less like delegation and more like a very fast intern with a very small debit card.",
			engagementGoal: "reply",
			engagementPattern: "personal_observation",
			tension: "delegation speed vs spend limit",
			replyEdge: "Agent users can argue how small the debit card should be.",
			artifactNeeded: "agent workflow screenshot",
			score: 70,
			whyItMatters:
				"Turns agent autonomy into a concrete, memorable permission frame for the personal account.",
		},
		{
			id: "personal-draft-agent-payment-metadata",
			archetype: "agent payment weirdness",
			body: "the weird part of agent payments is that the payment is often less sensitive than the reason the agent made it.",
			engagementGoal: "reply",
			engagementPattern: "personal_observation",
			tension: "payment amount vs request context",
			replyEdge:
				"Agent builders can argue what request context should leave the local workflow.",
			artifactNeeded: "none",
			score: 72,
			whyItMatters:
				"Turns current x402 metadata risk into a personal-account mechanism read without making Vanta claims.",
		},
	] as const;

	return drafts.map((draft) => ({
		...draft,
		accountHandle: "@williamclay",
		text: draft.body,
		sourceSignal:
			"Read-only @williamclay For You engagement snapshot and personal-account interest map.",
		sourceEvidence: [
			VANTA_CT_ENGAGEMENT_PLAYBOOK.source,
			VANTA_CT_ENGAGEMENT_PLAYBOOK.personalUse[
				`${draft.engagementGoal}Bait` as keyof typeof VANTA_CT_ENGAGEMENT_PLAYBOOK.personalUse
			] ?? VANTA_CT_ENGAGEMENT_PLAYBOOK.personalUse.screenshotProofBait,
		],
		approvedToPost: false,
		priority: draft.score >= 72 ? "high" : "medium",
		nextAction: "Review and post manually from personal account",
		proofBoundary: {
			canProve:
				"personal post can name a mechanism without making a Vanta claim",
			staysPrivate:
				"source text, private workflow context, and project claims stay local",
			missingArtifact:
				draft.artifactNeeded === "none" ? "none" : draft.artifactNeeded,
			betaLimit: "personal scout copy is not project readiness evidence",
		},
		reviewChecklist: [
			{ label: "Manual posting only", passed: true },
			{ label: "No X write action from Birdclaw", passed: true },
			{ label: "Fits X character limit", passed: draft.body.length <= 280 },
		],
	}));
}

export function buildProjectContentWorkflow(analytics: AnalyticsResponse) {
	const plan = buildVantaContentPlan(analytics);
	const personalPostDrafts = buildPersonalPostDrafts();
	const postDrafts = [
		...plan.postDrafts,
		{
			id: "vanta-draft-beta-truth",
			archetype: "truth-first build note",
			body: "Vanta is beta today. The useful standard is simple: proof-backed where implemented, operator-verifiable where exposed, and explicit about current limits.",
			text: "Vanta is beta today. The useful standard is simple: proof-backed where implemented, operator-verifiable where exposed, and explicit about current limits.",
			sourceSignal: "Vanta beta-truth and no-overclaiming guardrail.",
			approvedToPost: false,
			priority: "medium" as const,
			score: 14,
			nextAction: "Review beta-truth note manually",
			whyItMatters:
				"Reinforces the no-overclaiming posture before any public Vanta content ships.",
			sourceEvidence: ["Vanta beta-truth and no-overclaiming guardrail."],
			engagementGoal: "share" as const,
			engagementPattern: "compressed_take" as const,
			tension: "proof-backed implementation vs broad readiness claims",
			replyEdge: "Builders can ask which current limit should be most visible.",
			artifactNeeded: "none",
			proofBoundary: {
				canProve: "implemented surfaces can be reviewed where exposed",
				staysPrivate: "unverified readiness claims stay out of public copy",
				missingArtifact: "none",
				betaLimit: "explicitly says Vanta is beta today",
			},
			reviewChecklist: [
				{ label: "Manual posting only", passed: true },
				{ label: "No unsafe Vanta claims", passed: true },
				{ label: "Fits X character limit", passed: true },
				{ label: "Keeps beta-truth framing", passed: true },
			],
		},
	];
	return {
		...plan,
		personalPostDrafts,
		engagementPlaybook: VANTA_CT_ENGAGEMENT_PLAYBOOK,
		postDrafts,
		voiceBridgePairs: buildVantaVoiceBridgePairs({
			personalPostDrafts,
			postDrafts,
		}),
	};
}
