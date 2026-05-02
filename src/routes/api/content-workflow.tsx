import { createFileRoute } from "@tanstack/react-router";
import { getAnalyticsSummary } from "#/lib/analytics";
import { maybeAutoUpdateBackup } from "#/lib/backup";
import { buildProjectContentWorkflow } from "#/lib/content-workflow";

function json(data: unknown) {
	return new Response(JSON.stringify(data), {
		headers: {
			"content-type": "application/json",
		},
	});
}

export const Route = createFileRoute("/api/content-workflow")({
	server: {
		handlers: {
			GET: async () => {
				await maybeAutoUpdateBackup();
				return json(buildProjectContentWorkflow(getAnalyticsSummary()));
			},
		},
	},
});
