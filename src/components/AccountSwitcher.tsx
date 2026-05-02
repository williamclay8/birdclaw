import {
	accountRoleBadgeClass,
	accountRoleBadgePersonalClass,
	accountSwitchButtonActiveClass,
	accountSwitchButtonClass,
	accountSwitcherClass,
	cx,
} from "#/lib/ui";

export type AccountOption = {
	id: string;
	handle: string;
	name?: string;
	label?: string;
	disabled?: boolean;
};

type AccountKind = "Project" | "Personal" | null;

const ACCOUNT_KINDS = {
	"@vantaprivacy": "Project",
	"@williamclay": "Personal",
} as const satisfies Record<string, NonNullable<AccountKind>>;
const ACCOUNT_KIND_LOOKUP: Record<string, AccountKind> = ACCOUNT_KINDS;

function normalizeHandle(handle: string) {
	const trimmed = handle.trim().toLowerCase();
	return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

function accountKind(account: AccountOption): AccountKind {
	return ACCOUNT_KIND_LOOKUP[normalizeHandle(account.handle)] ?? null;
}

function accountText(account: AccountOption) {
	return account.label ?? account.name ?? account.handle;
}

export function AccountSwitcher({
	accounts,
	current,
	onChange,
	disabled = false,
	ariaLabel = "Account selector",
}: {
	accounts: AccountOption[];
	current: string;
	onChange: (account: AccountOption) => void;
	disabled?: boolean;
	ariaLabel?: string;
}) {
	return (
		<div aria-label={ariaLabel} className={accountSwitcherClass} role="group">
			{accounts.map((account) => {
				const active = account.id === current || account.handle === current;
				const kind = accountKind(account);
				const text = accountText(account);

				return (
					<button
						key={account.id}
						type="button"
						aria-pressed={active}
						className={cx(
							accountSwitchButtonClass,
							active && accountSwitchButtonActiveClass,
						)}
						disabled={disabled || account.disabled}
						onClick={() => onChange(account)}
					>
						<span className="grid gap-0.5">
							<span className="font-medium text-[var(--ink)]">{text}</span>
							<span className="text-[0.82rem] text-[var(--ink-soft)]">
								{account.handle}
							</span>
						</span>
						{kind ? (
							<span
								className={cx(
									accountRoleBadgeClass,
									kind === "Personal" && accountRoleBadgePersonalClass,
								)}
							>
								{kind}
							</span>
						) : null}
					</button>
				);
			})}
		</div>
	);
}
