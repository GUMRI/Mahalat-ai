# Local-first data

TanStack DB owns the domain schema, collections, and queries used by Angular.
RxDB remains an implementation detail for local persistence and Firestore
replication. `LocalFirstUsersService.open(shopId)` is the first domain
collection and synchronizes memberships from the existing
`shops/{shopId}/members` Firestore collection. Each membership's document ID is
its `uid`; the local collection exposes it as `id` while retaining `uid`.

Define Angular queries with `injectLiveQuery()` over the returned TanStack
collection:

```ts
const usersQuery = injectLiveQuery((q) =>
  q.from({ users: usersCollection }).select(({ users }) => ({
    id: users.id,
    email: users.email,
    role: users.role,
  })),
);
```

The TanStack `SHOP_USER_SCHEMA` validates collection rows. A separate RxDB JSON
schema exists only because RxDB requires one to persist and replicate the
documents; application query and collection code should use the TanStack
collection, not the RxDB collection.

Other remote collections use
`shops/{shopId}/branches/{branchId}/local-first-{collectionName}` to keep them
separate from operational data. RxDB's Firestore replication expects a document
ID matching the schema primary key and manages its `_deleted` and
`serverTimestamp` metadata. Existing membership documents must have these
replication metadata fields before they can be pulled; newly registered owner
memberships include them. Use this flow consistently for every writer to a
replicated collection, and grant access to the membership and local-first paths
in Firestore rules.

The starter uses RxDB's built-in LocalStorage storage. It persists locally for
offline use and is appropriate for getting started, but has browser storage
limits; choose a larger RxDB storage before moving substantial operational
data into it.
