import { createFileRoute } from "@tanstack/react-router";
import { getAnalyticsSummary } from "#/lib/analytics";
import { maybeAutoUpdateBackup } from "#/lib/backup";

export const Route = createFileRoute("/api/analytics")({
	server: {
		handlers: {
			GET: async () => {
				await maybeAutoUpdateBackup();
				return new Response(JSON.stringify(getAnalyticsSummary()), {
					headers: {
						"content-type": "application/json",
					},
				});
			},
		},
	},
});
