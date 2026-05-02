import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SyncToolbar, type SyncTarget } from "./SyncToolbar";

afterEach(() => {
	cleanup();
});

describe("SyncToolbar", () => {
	it("renders expected sync actions with 40px hit areas", () => {
		render(<SyncToolbar onSync={() => undefined} />);

		for (const label of ["Mentions", "Likes", "Bookmarks", "DMs"]) {
			const button = screen.getByRole("button", { name: `Sync ${label}` });
			expect(button).toHaveClass("min-h-10");
			expect(button).toHaveClass("min-w-10");
		}
	});

	it("calls onSync with the selected target", () => {
		const onSync = vi.fn();

		render(<SyncToolbar onSync={onSync} />);

		fireEvent.click(screen.getByRole("button", { name: "Sync Bookmarks" }));

		expect(onSync).toHaveBeenCalledWith("bookmarks");
	});

	it("disables all actions and labels loading targets", () => {
		render(
			<SyncToolbar
				disabled
				loadingTargets={["mentions"] satisfies SyncTarget[]}
				onSync={() => undefined}
			/>,
		);

		expect(
			screen.getByRole("button", { name: "Syncing Mentions" }),
		).toBeDisabled();
		expect(screen.getByRole("button", { name: "Sync Likes" })).toBeDisabled();
	});
});
