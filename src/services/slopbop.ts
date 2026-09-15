// The session store is exported by hand rather than with `export *`: its
// mutators (setCredentials, setArtists, beginSignIn…) exist for `auth.ts` and
// `client.ts` alone. Widening them to every importer is how a second writer
// appears and the single source of truth quietly stops being one.
export { subscribe, getSnapshot, getToken, getUserId, signOut } from './slopbop/session';
export type { SessionSnapshot } from './slopbop/session';

export * from './slopbop/client';
export * from './slopbop/artists';
export * from './slopbop/collections';
export * from './slopbop/opencall';
export * from './slopbop/jams';
export * from './slopbop/albums';
export * from './slopbop/songs';
export * from './slopbop/credit';
export * from './slopbop/sim';
export * from './slopbop/auth';
export * from './slopbop/application';
export * from './slopbop/requests';
export * from './slopbop/visuals';
export * from './slopbop/transactions';
