import { z } from "zod";
import { slugSchema, isoDateSchema } from "./primitives.ts";
import { categorySchema } from "./specimen.ts";
import { tierSchema } from "./build.ts";

// The demand layer + the observatory time-series. The Wanted queue is the keystone
// missing user pattern (a WNPP-style ledger); snapshots are the one day-one decision
// that makes trends exist at all — most registries overwrite and can't show them.

/** A WNPP-style demand request: request → intent → in-progress → listed. */
export const wantedRequestSchema = z
  .object({
    id: z.string().min(1),
    workload: z.string().min(1),
    category: categorySchema.optional(),
    votes: z.number().int().min(0).default(0),
    origin: z.enum(["request", "search-miss"]),
    state: z.enum(["requested", "intent", "in-progress", "listed"]),
    integrationId: slugSchema.optional(), // set once it lists
  })
  .strict();
export type WantedRequest = z.infer<typeof wantedRequestSchema>;

/** A persisted catalog snapshot — the diff between snapshots IS the time-series. */
export const catalogSnapshotSchema = z
  .object({
    takenAt: isoDateSchema,
    counts: z
      .object({
        total: z.number().int(),
        byTier: z.record(z.string(), z.number().int()),
        byCategory: z.record(z.string(), z.number().int()),
        fresh: z.number().int(),
        stale: z.number().int(),
      })
      .strict(),
    roster: z.array(z.object({ id: slugSchema, tier: tierSchema }).strict()), // for diffing the next snapshot
    additions: z.array(z.string()),
    promotions: z.array(z.object({ id: z.string(), to: tierSchema }).strict()),
    churned: z.array(z.string()),
  })
  .strict();
export type CatalogSnapshot = z.infer<typeof catalogSnapshotSchema>;
