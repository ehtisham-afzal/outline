import { TeamPreference } from "@shared/types";
import { ApiKey, User, Team } from "@server/models";
import { allow } from "./cancan";
import {
  and,
  isCloudHosted,
  isOwner,
  isTeamModel,
  isTeamMutable,
  or,
} from "./utils";

allow(User, "createApiKey", Team, (actor, team) =>
  and(
    isTeamModel(actor, team),
    isTeamMutable(actor),
    !actor.isViewer,
    !actor.isGuest,
    !actor.isSuspended,
    actor.isAdmin ||
      !!team?.getPreference(TeamPreference.MembersCanCreateApiKey)
  )
);

allow(User, "listApiKeys", Team, (actor, team) =>
  and(
    //
    isCloudHosted(),
    isTeamModel(actor, team),
    actor.isAdmin
  )
);

allow(User, "listApiKeys", User, (actor, user) =>
  and(
    //
    isTeamModel(actor, user),
    or(actor.isAdmin, actor.id === user?.id)
  )
);

allow(User, ["read", "update", "delete"], ApiKey, (actor, apiKey) =>
  and(
    isOwner(actor, apiKey),
    actor.isAdmin ||
      !!actor.team?.getPreference(TeamPreference.MembersCanCreateApiKey)
  )
);
