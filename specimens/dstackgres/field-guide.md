---
description: >
  A confidential Postgres cluster node. Answers only over mutual RA-TLS, seals its
  data to an encrypted disk whose key only ever exists in enclave memory, and ships
  its write-ahead log to encrypted backups under operator-held keys.
fieldNote: It answers only attested callers; its disk is sealed; what little leaves, leaves encrypted.
---

dstackgres runs standard Postgres 17 inside an Intel TDX enclave: every connection is
RA-TLS verified, storage is encrypted to a KMS-derived key that only exists in TEE
memory, and the WAL is archived to encrypted off-box backups. It is a working example
of the hard part — drawing the boundary for a stateful database that must still take
backups and follow on-chain control.
