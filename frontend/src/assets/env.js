// Runtime configuration. In the Docker image, this file is regenerated at container
// startup (envsubst) from the API_BASE_URL env var. Left as-is, it has no effect
// outside Docker — environment.prod.ts falls back to its own default when unset.
window.__env = {
  apiBaseUrl: '${API_BASE_URL}',
};
