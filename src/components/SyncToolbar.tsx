import { AtSign, Bookmark, Heart, Mail } from "lucide-react";
import { cx, syncToolbarButtonClass, syncToolbarClass } from "#/lib/ui";

export type SyncTarget = "mentions" | "likes" | "bookmarks" | "dms";

const SYNC_ACTIONS = [
	{ key: "mentions", label: "Mentions", icon: AtSign },
	{ key: "likes", label: "Likes", icon: Heart },
	{ key: "bookmarks", label: "Bookmarks", icon: Bookmark },
	{ key: "dms", label: "DMs", icon: Mail },
] as const satisfies Array<{
	key: SyncTarget;
	label: string;
	icon: typeof AtSign;
}>;

export function SyncToolbar({
	onSync,
	loadingTargets = [],
	disabled = false,
	className,
}: {
	onSync: (target: SyncTarget) => void;
	loadingTargets?: readonly SyncTarget[];
	disabled?: boolean;
	className?: string;
}) {
	const loading = new Set(loadingTargets);

	return (
		<div
			aria-label="Sync actions"
			className={cx(syncToolbarClass, className)}
			role="toolbar"
		>
			{SYNC_ACTIONS.map((action) => {
				const Icon = action.icon;
				const isLoading = loading.has(action.key);

				return (
					<button
						key={action.key}
						type="button"
						aria-label={`${isLoading ? "Syncing" : "Sync"} ${action.label}`}
						className={syncToolbarButtonClass}
						disabled={disabled || isLoading}
						onClick={() => onSync(action.key)}
					>
						<Icon aria-hidden="true" className="size-4" strokeWidth={1.9} />
						<span>{isLoading ? "Syncing" : action.label}</span>
					</button>
				);
			})}
		</div>
	);
}
