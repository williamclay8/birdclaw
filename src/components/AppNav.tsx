import { Link, useRouterState } from "@tanstack/react-router";
import {
	brandMarkClass,
	cx,
	eyebrowClass,
	navClass,
	navLinkActiveClass,
	navLinkClass,
	navLinksClass,
} from "#/lib/ui";
import { ThemeSlider } from "./ThemeSlider";

const links = [
	{ to: "/content", label: "Today" },
	{ to: "/inbox", label: "Inbox" },
	{ to: "/", label: "Home" },
	{ to: "/mentions", label: "Mentions" },
	{ to: "/dms", label: "DMs" },
	{ to: "/likes", label: "Likes" },
	{ to: "/bookmarks", label: "Bookmarks" },
	{ to: "/blocks", label: "Blocks" },
] as const;

export function AppNav() {
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});

	return (
		<nav className={navClass}>
			<div>
				<p className={eyebrowClass}>birdclaw</p>
				<h1 className={brandMarkClass}>
					Quiet signal from your Twitter memory.
				</h1>
			</div>
			<div className={navLinksClass}>
				{links.map((link) => {
					const active = pathname === link.to;
					return (
						<Link
							key={link.to}
							to={link.to}
							aria-current={active ? "page" : undefined}
							className={cx(navLinkClass, active && navLinkActiveClass)}
						>
							{link.label}
						</Link>
					);
				})}
				<ThemeSlider />
			</div>
		</nav>
	);
}
