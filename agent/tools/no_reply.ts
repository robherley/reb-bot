import { noReply } from "eve/tools/no_reply";

/**
 * Lets a turn end without posting anything, which is the only way a watch-style
 * schedule ("only tell me if it drops below X") can stay quiet. Eve has no other
 * channel-level switch: whatever the model writes as its reply gets posted.
 */
export default noReply;
