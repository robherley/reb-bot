import git from "eve/extensions/git";
import { authorizeGitHub, brokerGitHubLease, coAuthorFor, GITHUB_CONNECTOR } from "../lib/github.js";

export default git({
  github: {
    connector: GITHUB_CONNECTOR,
    principalType: "app",
    permissions: ["contents:write", "pull_requests:write", "issues:write", "checks:read", "actions:read"],
    authorize: authorizeGitHub,
    broker: brokerGitHubLease,
    attribution: (ctx) => coAuthorFor(ctx.session.auth.current),
  },
});
