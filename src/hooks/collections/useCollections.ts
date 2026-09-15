import { useResource } from '../useResource';
import { fetchCollections, Collection, CollectionType } from '../../services/slopbop';

export function useCollections(artistId: string, type?: CollectionType) {
  const key = artistId ? `collections-${artistId}${type ? `-${type}` : ''}` : '';
  const { data, loading, refetch } = useResource(
    () => fetchCollections(artistId, type),
    key,
    { onError: () => {} },
  );
  const collections: Collection[] = data ?? [];
  return { collections, loading, refetch };
}
