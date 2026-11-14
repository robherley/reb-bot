import { connectGitHubCredentials } from "@vercel/connect/eve";
import { githubChannel, defaultGitHubAuth } from "eve/channels/github";
import { canImproveSelf, GITHUB_CONNECTOR } from "../lib/github.js";

export default githubChannel({
  botName: "reb-bot",
  credentials: connectGitHubCredentials(GITHUB_CONNECTOR),
  onComment(ctx, comment) {

    const auth = defaultGitHubAuth(ctx);
    if (!canImproveSelf(auth) || !/(?:^|\s)@reb-bot\b/i.test(comment.body)) return null;
    return { auth };
  },
  onIssue(ctx, issue) {

    const auth = defaultGitHubAuth(ctx);
    if (issue.action !== "opened" || !canImproveSelf(auth)) return null;
    return { auth };
  },
});
