// Configuration file for OptMachine DApp
const CONFIG = {
  // Network settings
  SOLANA_NETWORK: 'devnet',
  RPC_ENDPOINTS: {
    devnet: 'https://api.devnet.solana.com',
    mainnet: 'https://api.mainnet-beta.solana.com',
    local: 'http://127.0.0.1:8899'
  },
  
  // API settings
  API_BASE_URL: 'http://api.optmachine.xyz',
  
  // Default token addresses (devnet)
  DEFAULT_TOKENS: {
    underlying_mint: '7TGGc34BHydnkHtEw2LSGq6FWRbUjzuDsZ1uYuoWK4ND',
    quote_mint: 'Fo9qqxhckVQaobFRdLszwy5KnnjzDmdQsWryH5wNPYY8'
  },
  
  // UI settings
  DEFAULT_EXPIRATION_DAYS: 30,
  MAX_LOG_ENTRIES: 100,
  
  // Transaction settings
  TRANSACTION_TIMEOUT: 30000,
  CONFIRMATION_COMMITMENT: 'confirmed',
  
  // Supported wallets
  SUPPORTED_WALLETS: [
    { name: 'Phantom', adapter: 'phantom' },
    { name: 'Backpack', adapter: 'backpack' },
    { name: 'Solflare', adapter: 'solflare' }
  ]
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
} else if (typeof window !== 'undefined') {
  window.CONFIG = CONFIG;
}
