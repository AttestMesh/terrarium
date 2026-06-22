import { z } from "zod";
import { ed25519PubKeySchema, isoDateSchema } from "./primitives.ts";

// reviewers/<id>.yaml — privileged-authored (CODEOWNERS: first-party only).
// In v1 the only registered key is first-party; `auditor` + suspension/revocation
// + bonding are the deferred federation layer.
export const reviewerSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    kind: z.enum(["first-party", "auditor"]),
    signingKey: ed25519PubKeySchema,
    accreditedAt: isoDateSchema,
    status: z.enum(["active", "suspended", "revoked"]).default("active"),
  })
  .strict();
export type Reviewer = z.infer<typeof reviewerSchema>;
