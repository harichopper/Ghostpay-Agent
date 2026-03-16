// GhostPay Agent — Ollama AI Agent Config
// Set OLLAMA_BASE_URL to your machine IP when testing on device (e.g. http://192.168.1.5:11434)
// Models: llama3.2, mistral, glm-5:cloud, etc.

export const OLLAMA = {
  baseUrl: 'http://localhost:11434',
  model: 'llama3.2', // or 'glm-5:cloud' if available in your Ollama
  timeout: 30000,
  enabled: true,
};
