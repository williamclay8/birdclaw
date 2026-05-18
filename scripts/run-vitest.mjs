import path from "node:path";
import fs from "node:fs";
import { spawn } from "node:child_process";
import { withSanitizedNodeOptions } from "./sanitize-node-options.mjs";

const cwd = process.cwd();
const vitestBin = path.join(cwd, "node_modules", "vitest", "vitest.mjs");

function readExpectedNodeVersion() {
	try {
		const expectedPath = path.join(cwd, ".node-version");
		return fs.readFileSync(expectedPath, "utf8").trim();
	} catch {
		return null;
	}
}

function major(version) {
	return Number.parseInt(
		String(version).replace(/^v/, "").split(".")[0] ?? "",
		10,
	);
}

const expectedNode = readExpectedNodeVersion();
if (expectedNode) {
	const actualMajor = major(process.version);
	const expectedMajor = major(expectedNode);
	if (
		Number.isFinite(actualMajor) &&
		Number.isFinite(expectedMajor) &&
		actualMajor !== expectedMajor
	) {
		console.error(
			[
				`birdclaw: Node version mismatch for tests.`,
				`  expected (from .node-version): ${expectedNode}`,
				`  actual: ${process.version}`,
				``,
				`Fix: switch Node then reinstall native deps (better-sqlite3), e.g.:`,
				`  fnm use ${expectedNode}`,
				`  corepack pnpm install`,
			].join("\n"),
		);
		process.exit(1);
	}
}

const child = spawn(process.execPath, [vitestBin, ...process.argv.slice(2)], {
	cwd,
	stdio: "inherit",
	env: withSanitizedNodeOptions(process.env),
});

child.on("exit", (code, signal) => {
	if (signal) {
		process.kill(process.pid, signal);
		return;
	}

	process.exit(code ?? 0);
});
