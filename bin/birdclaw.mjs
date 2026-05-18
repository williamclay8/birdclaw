#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const require = createRequire(import.meta.url);
const tsxCli = require.resolve("tsx/cli");
const birdclawCli = join(packageRoot, "src", "cli.ts");

function major(version) {
	return Number.parseInt(String(version).replace(/^v/, "").split(".")[0] ?? "", 10);
}

function readExpectedNodeVersion() {
	try {
		return fs.readFileSync(join(packageRoot, ".node-version"), "utf8").trim();
	} catch {
		return null;
	}
}

function preflight() {
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
					`birdclaw: Node version mismatch.`,
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

	try {
		require("better-sqlite3");
	} catch (error) {
		const expectedNode = readExpectedNodeVersion();
		const message = error instanceof Error ? error.message : String(error);
		console.error(
			[
				`birdclaw: Failed to load the native \`better-sqlite3\` addon.`,
				`  node: ${process.version}`,
				expectedNode ? `  expected (from .node-version): ${expectedNode}` : null,
				``,
				`Fix: switch Node and reinstall native deps (or rebuild for your current Node).`,
				expectedNode ? `  fnm use ${expectedNode}` : `  (switch to the project Node version)`,
				`  corepack pnpm install`,
				``,
				`Original error: ${message}`,
			]
				.filter(Boolean)
				.join("\n"),
		);
		process.exit(1);
	}
}

preflight();

const result = spawnSync(
	process.execPath,
	[tsxCli, birdclawCli, ...process.argv.slice(2)],
	{
		stdio: "inherit",
		env: process.env,
	},
);

if (result.error) {
	console.error(result.error.message);
	process.exit(1);
}

if (result.signal) {
	process.kill(process.pid, result.signal);
}

process.exit(result.status ?? 0);
