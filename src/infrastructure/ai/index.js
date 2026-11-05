// Cổng AI: một giao diện chung cho mọi nhà cung cấp. Tầng application chỉ biết hàm chat/listModels này.
import { PROVIDERS, ProviderError, openaiCompatChat, geminiChat, listRemoteModels } from './rest.js';
import { anthropicChat, anthropicModels } from './anthropic.js';

export { PROVIDERS };

// config: { provider, key, model, baseUrl }
export function createAIGateway() {
  return {
    providers: PROVIDERS,
    async chat(config, { system, messages, onText, signal }) {
      const args = { ...config, settings: { customBaseUrl: config.baseUrl }, system, messages, onText, signal };
      try {
        if (config.provider === 'anthropic') return await anthropicChat(args);
        if (config.provider === 'gemini') return await geminiChat(args);
        return await openaiCompatChat(args);
      } catch (err) {
        if (err?.name === 'AbortError') return '';
        throw new Error(err instanceof ProviderError ? err.message : 'Lỗi: ' + (err?.message || String(err)));
      }
    },
    async listModels(config) {
      try {
        if (config.provider === 'anthropic') return await anthropicModels(config.key);
        return await listRemoteModels(config.provider, { customBaseUrl: config.baseUrl }, config.key);
      } catch (err) {
        throw new Error(err?.message || String(err));
      }
    },
  };
}
