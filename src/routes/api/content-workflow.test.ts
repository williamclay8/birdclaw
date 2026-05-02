// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getRouteHandler } from "#/test/route-handlers";

const getAnalyticsSummaryMock = vi.fn();
const buildProjectContentWorkflowMock = vi.fn();
const maybeAutoUpdateBackupMock = vi.fn();

vi.mock("#/lib/analytics", () => ({
	getAnalyticsSummary: () => getAnalyticsSummaryMock(),
}));

vi.mock("#/lib/content-workflow", () => ({
	buildProjectContentWorkflow: (...args: unknown[]) =>
		buildProjectContentWorkflowMock(...args),
}));

vi.mock("#/lib/backup", () => ({
	maybeAutoUpdateBackup: () => maybeAutoUpdateBackupMock(),
}));

import { Route } from "./content-workflow";

const GET = getRouteHandler(Route, "GET");

describe("content workflow api route", () => {
	beforeEach(() => {
		getAnalyticsSummaryMock.mockReset();
		buildProjectContentWorkflowMock.mockReset();
		maybeAutoUpdateBackupMock.mockReset();
		maybeAutoUpdateBackupMock.mockResolvedValue({ skipped: true });
	});

	it("returns a local manual-only project content workflow", async () => {
		const analytics = { accounts: [{ handle: "@vantaprivacy" }] };
		const workflow = {
			manualPostingOnly: true,
			postDrafts: [{ text: "private settlement needs receipts" }],
		};
		getAnalyticsSummaryMock.mockReturnValue(analytics);
		buildProjectContentWorkflowMock.mockReturnValue(workflow);

		const response = await GET({
			request: new Request("http://localhost/api/content-workflow"),
		});

		expect(maybeAutoUpdateBackupMock).toHaveBeenCalled();
		expect(buildProjectContentWorkflowMock).toHaveBeenCalledWith(analytics);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual(workflow);
	});
});
