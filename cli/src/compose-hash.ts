// Ported verbatim from dstack's reference implementation so Terrarium computes
// byte-identical measurements to what dstack/Phala compute at deploy time:
//   /home/ubuntu/dstack/sdk/js/src/get-compose-hash.ts  (Apache-2.0, © Phala Network)
//
// This is the v1 "measurement": sha256 over the canonical (key-sorted, compact)
// JSON of an AppCompose. The control plane allowlists exactly this value via
// ClusterDiamond.addComposeHash, so it MUST stay in lockstep with dstack — the
// cross-language reference vector in compose-hash.test.ts is the guard.

import { sha256 } from "@noble/hashes/sha2";
import { bytesToHex } from "@noble/hashes/utils";

type SortableValue = string | number | boolean | null | undefined | SortableObject | SortableArray;
interface SortableObject {
  [key: string]: SortableValue;
}
interface SortableArray extends Array<SortableValue> {}

/** Recursively sorts object keys lexicographically (deterministic JSON.stringify). */
function sortObject(obj: SortableValue): SortableValue {
  if (obj === undefined || obj === null) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sortObject);
  } else if (obj && typeof obj === "object" && obj.constructor === Object) {
    return Object.keys(obj)
      .sort()
      .reduce((result: SortableObject, key) => {
        result[key] = sortObject((obj as SortableObject)[key]);
        return result;
      }, {});
  }
  return obj;
}

export type KeyProviderKind = "none" | "kms" | "local" | "tpm";

export interface DockerConfig extends SortableObject {
  registry?: string;
  username?: string;
  token_key?: string;
}

export interface AppCompose extends SortableObject {
  manifest_version?: number;
  name?: string;
  features?: string[]; // deprecated
  runner: string;
  docker_compose_file?: string;
  docker_config?: DockerConfig;
  public_logs?: boolean;
  public_sysinfo?: boolean;
  public_tcbinfo?: boolean;
  kms_enabled?: boolean;
  gateway_enabled?: boolean;
  tproxy_enabled?: boolean; // back-compat with gateway_enabled
  local_key_provider_enabled?: boolean;
  key_provider?: KeyProviderKind;
  key_provider_id?: string; // hex string
  allowed_envs?: string[];
  no_instance_id?: boolean;
  secure_time?: boolean;
  bash_script?: string; // legacy
  pre_launch_script?: string; // legacy
}

function preprocessAppCompose(dic: AppCompose): AppCompose {
  const obj: AppCompose = { ...dic };
  if (obj.runner === "bash" && "docker_compose_file" in obj) {
    delete obj.docker_compose_file;
  } else if (obj.runner === "docker-compose" && "bash_script" in obj) {
    delete obj.bash_script;
  }
  if ("pre_launch_script" in obj && !obj.pre_launch_script) {
    delete obj.pre_launch_script;
  }
  return obj;
}

/**
 * Deterministic JSON serialization following cross-language standards:
 * recursively key-sorted, compact, NaN/Infinity → null, UTF-8.
 */
function toDeterministicJson(dic: AppCompose): string {
  const ordered = sortObject(dic);
  return JSON.stringify(ordered, (_key, value) => {
    if (typeof value === "number" && (isNaN(value) || !isFinite(value))) {
      return null;
    }
    return value;
  });
}

/**
 * The compose-hash measurement: bare lowercase 64-char hex (no `0x`), matching
 * dstack. `normalize` applies dstack's runner-specific field preprocessing.
 */
export function getComposeHash(appCompose: AppCompose, normalize = false): string {
  const app = normalize ? preprocessAppCompose(appCompose) : appCompose;
  return bytesToHex(sha256(new TextEncoder().encode(toDeterministicJson(app))));
}
