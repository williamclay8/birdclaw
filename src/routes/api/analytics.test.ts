// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getRouteHandler } from "#/test/route-handlers";

const getAnalyticsSummaryMock = vi.fn();
const maybeAutoUpdateBackupMock = vi.fn();

vi.mock("#/lib/analytics", () => ({
	getAnalyticsSummary: () => getAnalyticsSummaryMock(),
}));

vi.mock("#/lib/backup", () => ({
	maybeAutoUpdateBackup: () => maybeAutoUpdateBackupMock(),
}));

import { Route } from "./analytics";

const GET = getRouteHandler(Route, "GET");

describe("analytics api route", () => {
	beforeEach(() => {
		getAnalyticsSummaryMock.mockReset();
		maybeAutoUpdateBackupMock.mockReset();
		maybeAutoUpdateBackupMock.mockResolvedValue({ skipped: true });
	});

	it("returns local project and personal account analytics", async () => {
		getAnalyticsSummaryMock.mockReturnValue({
			accounts: [
				{ accountId: "acct_vantaprivacy", handle: "@vantaprivacy" },
				{ accountId: "acct_williamclay", handle: "@williamclay" },
			],
			recommendations: ["Bridge personal signal into project replies."],
		});

		const response = await GET({
			request: new Request("http://localhost/api/analytics"),
		});

		expect(maybeAutoUpdateBackupMock).toHaveBeenCalled();
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			accounts: [
				{ accountId: "acct_vantaprivacy", handle: "@vantaprivacy" },
				{ accountId: "acct_williamclay", handle: "@williamclay" },
			],
			recommendations: ["Bridge personal signal into project replies."],
		});
	});
});
