import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AccountSwitcher, type AccountOption } from "./AccountSwitcher";

const accounts = [
	{ id: "project", handle: "@vantaprivacy", name: "Vanta Privacy" },
	{ id: "personal", handle: "@williamclay", name: "Clay" },
	{ id: "other", handle: "@other", name: "Other" },
] satisfies AccountOption[];

afterEach(() => {
	cleanup();
});

describe("AccountSwitcher", () => {
	it("distinguishes project and personal accounts by matching handles", () => {
		render(
			<AccountSwitcher
				accounts={accounts}
				current="project"
				onChange={() => undefined}
			/>,
		);

		expect(
			screen.getByRole("button", { name: /Vanta Privacy/ }),
		).toHaveTextContent("Project");
		expect(screen.getByRole("button", { name: /Clay/ })).toHaveTextContent(
			"Personal",
		);
		expect(screen.getByRole("button", { name: /Other/ })).not.toHaveTextContent(
			"Project",
		);
	});

	it("marks the current account and reports the selected account", () => {
		const onChange = vi.fn();

		render(
			<AccountSwitcher
				accounts={accounts}
				current="project"
				onChange={onChange}
			/>,
		);

		expect(
			screen.getByRole("button", { name: /Vanta Privacy/ }),
		).toHaveAttribute("aria-pressed", "true");

		fireEvent.click(screen.getByRole("button", { name: /Clay/ }));

		expect(onChange).toHaveBeenCalledWith(accounts[1]);
	});
});
