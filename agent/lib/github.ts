import type { SessionAuthContext } from "eve/context";
import type { GitHubAppAuthorizeRequest, GitHubCoAuthor, GitHubLeaseBroker } from "eve/extensions/git";
import type { VercelSandboxSession } from "eve/sandbox/vercel";
import { config } from "../../config.js";

export const SELF_REPOSITORY = "robherley/reb-bot";
export const GITHUB_CONNECTOR = "github/reb-bot";

export function developerFor(auth: SessionAuthContext | null) {

  if (!auth || auth.principalType !== "user") return null;
  if (auth.authenticator === "discord-interaction") {
    const guild = auth.attributes.guild_id;
    const user = auth.attributes.user_id;
    const valid = typeof guild === "string" && guild.length > 0
      && (!process.env.DISCORD_GUILD_ID || guild === process.env.DISCORD_GUILD_ID)
      && typeof user === "string" && auth.principalId === `discord:${guild}:${user}`;
    return valid ? config.developers.find((developer) => developer.discord === user) ?? null : null;
  }
  const valid = auth.authenticator === "github-webhook"
    && auth.attributes.repository === SELF_REPOSITORY
    && auth.attributes.user_type === "User"
    && typeof auth.attributes.user_login === "string";
  return valid ? config.developers.find(
    (developer) => developer.github.toLowerCase() === (auth.attributes.user_login as string).toLowerCase(),
  ) ?? null : null;
}

export function canImproveSelf(auth: SessionAuthContext | null): boolean {

  return developerFor(auth) !== null;
}

export async function coAuthorFor(
  auth: SessionAuthContext | null,
  request: typeof fetch = fetch,
): Promise<GitHubCoAuthor | null> {

  const developer = developerFor(auth);
  if (!developer) return null;

  // Resolve the numeric GitHub ID so credit uses GitHub's privacy-safe,
  // account-linked noreply address rather than an invented personal email.
  const response = await request(`https://api.github.com/users/${encodeURIComponent(developer.github)}`, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "reb-bot" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`GitHub co-author lookup failed (${response.status})`);
  const user = await response.json() as { id?: unknown; login?: unknown };
  if (typeof user.id !== "number" || !Number.isSafeInteger(user.id) || user.id <= 0
    || typeof user.login !== "string" || !/^[a-z\d-]+$/i.test(user.login)
    || user.login.toLowerCase() !== developer.github.toLowerCase()) {
    throw new Error("GitHub co-author lookup returned an unexpected account");
  }
  return { name: user.login, email: `${user.id}+${user.login}@users.noreply.github.com` };
}

export function authorizeGitHub(request: GitHubAppAuthorizeRequest): boolean {

  return request.repository?.toLowerCase() === SELF_REPOSITORY && canImproveSelf(request.auth);
}

// The base policy allows public network access. Add credentials only for the
// duration of Eve's serialized GitHub command lease, then restore that policy.
export const brokerGitHubLease: GitHubLeaseBroker = async (sandbox, rules) => {

  if (!("setNetworkPolicy" in sandbox) || typeof sandbox.setNetworkPolicy !== "function") {
    throw new Error("GitHub commands require a firewall-capable sandbox");
  }
  await (sandbox as VercelSandboxSession).setNetworkPolicy(
    rules ? { allow: { "*": [], ...rules } } : "allow-all",
  );
};
