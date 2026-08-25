export function createRetryableInitializer<T>(
  initialize: () => Promise<T>,
): () => Promise<T> {
  let initialization: Promise<T> | undefined;

  return () => {
    if (!initialization) {
      initialization = (async () => initialize())().catch((error) => {
        initialization = undefined;
        throw error;
      });
    }

    return initialization;
  };
}
