import { createFileRoute } from "@tanstack/react-router";
import { getAnalyticsSummary } from "#/lib/analytics";
import { maybeAutoUpdateBackup } from "#/lib/backup";

function json(data: unknown, init?: { status?: number }) {
	return new Response(JSON.stringify(data), {
		status: init?.status,
		headers: {
			"content-type": "application/json",
		},
	});
}

export const Route = createFileRoute("/api/analytics")({
	server: {
		handlers: {
			GET: async () => {
				try {
					await maybeAutoUpdateBackup();
					return json(getAnalyticsSummary());
				} catch (error) {
					const message =
						error instanceof Error ? error.message : String(error);
					return json(
						{
							ok: false,
							error: {
								kind: "analytics_unavailable",
								message,
							},
						},
						{ status: 503 },
					);
				}
			},
		},
	},
});
