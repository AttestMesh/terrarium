export interface Explainer {
  slug: string;
  title: string;
  keyword: string;
  description: string;
  body: string[];
}

// "What is X" explainers that rank on the concept and link to the specimens. Each
// states what the guarantee does and does not cover.
export const EXPLAINERS: Explainer[] = [
  {
    slug: "attestation",
    title: "What is remote attestation?",
    keyword: "remote attestation",
    description:
      "Remote attestation lets a client verify what code is running inside a confidential VM before sending it any data — by checking a hardware-signed measurement.",
    body: [
      "Remote attestation is how a confidential VM proves what it is running. The CPU measures the launched image into a register (an MRTD/RTMR on Intel TDX) and signs that measurement with a hardware key. A remote client checks the signature and compares the measurement to one it trusts.",
      "In Terrarium the trust anchor is exactly that measurement — a reproducible compose-hash. Because the build is reproducible, anyone can rebuild from source and confirm the measurement independently; you are not asked to trust the registry. RA-TLS binds the attestation to a TLS channel, so a client knows which code it is talking to before sending plaintext.",
      "What attestation does NOT give you: it proves identity and integrity of the code, not that the code is bug-free or that every byte is confidential. That judgement — where the boundary is drawn — is what certification adds on top.",
    ],
  },
  {
    slug: "reproducible-builds",
    title: "What is a reproducible build, and why does it matter here?",
    keyword: "reproducible build",
    description:
      "A reproducible build produces a bit-for-bit identical artifact from the same source, so its measurement can be independently verified by anyone.",
    body: [
      "A build is reproducible when the same source and recipe always yield the same bytes — and therefore the same measurement. Reproducibility is the floor for the whole registry: a build that does not reproduce to its claimed measurement is uncheckable, so nothing about it is verifiable, and it cannot be listed at any tier.",
      "Terrarium verifies this trustlessly: at least two independent rebuilders must converge on one measurement. A recipe that smuggles in a timestamp, hostname, or other environment-dependent input diverges across rebuilders and fails by construction — our CI is never a trusted oracle.",
      "This is also what keeps the registry open-source by construction: a closed or non-reproducible image has an uncheckable measurement, so it simply cannot be attested.",
    ],
  },
  {
    slug: "tdx",
    title: "Intel TDX vs SGX: confidential VMs explained",
    keyword: "Intel TDX",
    description:
      "Intel TDX runs a whole VM inside a hardware-isolated trust domain with memory encryption, attested by a measurement — the substrate Terrarium specimens run on.",
    body: [
      "Intel TDX (Trust Domain Extensions) isolates an entire virtual machine in an encrypted, integrity-protected trust domain, so the host and hypervisor cannot read its memory. It measures the launched image (MRTD) plus runtime extensions (RTMRs), which a client verifies via attestation.",
      "SGX, by contrast, isolates a process-level enclave with a small trusted computing base — powerful, but it requires re-architecting an app around enclave boundaries. TDX lifts confidentiality to the whole-VM level, which is why it is practical to package existing workloads like Postgres or vLLM confidentially.",
      "Terrarium specimens target TDX on dstack. The same limit applies to both: they protect memory confidentiality and enforce boundaries, but not against every covert or side channel.",
    ],
  },
];

export const getExplainer = (slug: string): Explainer | undefined => EXPLAINERS.find((e) => e.slug === slug);
