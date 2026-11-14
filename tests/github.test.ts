import assert from "node:assert/strict";
import { test } from "node:test";
import type { SessionAuthContext } from "eve/context";
import type { GitHubAppAuthorizeRequest } from "eve/extensions/git";
import type { VercelSandboxSession } from "eve/sandbox/vercel";
import type { SandboxNetworkPolicy } from "eve/sandbox";
import { authorizeGitHub, brokerGitHubLease, canImproveSelf, coAuthorFor, developerFor } from "../agent/lib/github.js";
import { config } from "../config.js";

test("GitHub publishing requires an authorized caller and the exact repository", async (t) => {

  const previous = { ...config };
  const previousGuild = process.env.DISCORD_GUILD_ID;
  delete process.env.DISCORD_GUILD_ID;
  t.after(() => {

    Object.assign(config, previous);
    if (previousGuild === undefined) delete process.env.DISCORD_GUILD_ID;
    else process.env.DISCORD_GUILD_ID = previousGuild;
  });
  config.developers = [{ github: "robherley", discord: "482301967369109505" }];
  const discord: SessionAuthContext = {
    authenticator: "discord-interaction",
    principalId: "discord:123:482301967369109505",
    principalType: "user",
    attributes: { guild_id: "123", user_id: "482301967369109505" },
  };
  const github: SessionAuthContext = {
    authenticator: "github-webhook",
    principalId: "github:123",
    principalType: "user",
    attributes: { repository: "robherley/reb-bot", user_login: "robherley", user_type: "User" },
  };
  const request = (auth: SessionAuthContext | null, repository: string | null): GitHubAppAuthorizeRequest => ({
    auth, repository, owner: "robherley", token: "not-a-real-token", argv: ["gh", "pr", "list"],
  });
  assert.equal(authorizeGitHub(request(discord, "robherley/reb-bot")), true);
  assert.equal(authorizeGitHub(request(github, "robherley/reb-bot")), true);
  assert.equal(developerFor(discord), developerFor(github));
  const lookup: typeof fetch = async (url) => {

    assert.equal(url, "https://api.github.com/users/robherley");
    return Response.json({ id: 123, login: "robherley" });
  };
  const credit = { name: "robherley", email: "123+robherley@users.noreply.github.com" };
  assert.deepEqual(await coAuthorFor(discord, lookup), credit);
  assert.deepEqual(await coAuthorFor(github, lookup), credit);
  // Discord-provided GitHub attributes cannot override the configured link.
  assert.deepEqual(await coAuthorFor({
    ...discord, attributes: { ...discord.attributes, user_login: "someone-else" },
  }, lookup), credit);
  await assert.rejects(coAuthorFor(discord, async () => Response.json({
    id: 999, login: "someone-else",
  })), /unexpected account/);
  await assert.rejects(coAuthorFor(discord, async () => new Response(null, { status: 403 })), /lookup failed/);
  assert.equal(await coAuthorFor(null, async () => {

    throw new Error("must not fetch");
  }), null);
  assert.equal(authorizeGitHub(request(discord, null)), false);
  assert.equal(authorizeGitHub(request(discord, "robherley/other")), false);
  assert.equal(authorizeGitHub(request(null, "robherley/reb-bot")), false);
  assert.equal(canImproveSelf({ ...discord, principalId: "discord:123:999" }), false);
  assert.equal(canImproveSelf({ ...discord, attributes: { guild_id: "other", user_id: "482301967369109505" } }), false);
  assert.equal(canImproveSelf({ ...discord, attributes: { guild_id: "123", user_id: "999" } }), false);
  assert.equal(canImproveSelf({ ...github, attributes: { ...github.attributes, user_login: "stranger" } }), false);
  assert.equal(canImproveSelf({ ...github, principalType: "service" }), false);
  assert.equal(canImproveSelf({ ...github, authenticator: "unverified" }), false);
  assert.equal(canImproveSelf({
    ...discord,
    principalId: "discord:other:482301967369109505",
    attributes: { guild_id: "other", user_id: "482301967369109505" },
  }), true);
  process.env.DISCORD_GUILD_ID = "other";
  assert.equal(canImproveSelf(discord), false);
  process.env.DISCORD_GUILD_ID = "123";
  assert.equal(canImproveSelf(discord), true);
  config.developers = [];
  assert.equal(canImproveSelf(discord), false);
  assert.equal(canImproveSelf(github), false);
});

test("GitHub credential leases preserve public access and remove credentials afterward", async () => {

  const policies: SandboxNetworkPolicy[] = [];
  const sandbox = {
    setNetworkPolicy: async (policy: SandboxNetworkPolicy) => {

      policies.push(policy);
    },
  } as VercelSandboxSession;
  const rules = { "api.github.com": [{ transform: [{ headers: { authorization: "test-token" } }] }] };
  await brokerGitHubLease(sandbox, rules);
  await brokerGitHubLease(sandbox, null);
  assert.deepEqual(policies, [{ allow: { "*": [], ...rules } }, "allow-all"]);
  await assert.rejects(brokerGitHubLease({} as VercelSandboxSession, rules), /firewall-capable/);
});
