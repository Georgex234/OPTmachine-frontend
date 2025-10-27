// Utility functions for OptMachine DApp

const Utils = {
  // Format Solana address for display
  formatAddress(address, startChars = 4, endChars = 4) {
    if (!address) return '';
    if (address.length <= startChars + endChars) return address;
    return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
  },

  // Format SOL amount
  formatSOL(lamports, decimals = 4) {
    return (lamports / 1e9).toFixed(decimals);
  },

  // Format USD amount
  formatUSD(amount, decimals = 2) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(amount);
  },

  // Format date for display
  formatDate(timestamp, includeTime = true) {
    const date = new Date(timestamp * 1000);
    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    };
    
    if (includeTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
    }
    
    return date.toLocaleDateString('en-US', options);
  },

  // Calculate time remaining
  timeRemaining(expirationTimestamp) {
    const now = Math.floor(Date.now() / 1000);
    const remaining = expirationTimestamp - now;
    
    if (remaining <= 0) return 'Expired';
    
    const days = Math.floor(remaining / (24 * 60 * 60));
    const hours = Math.floor((remaining % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((remaining % (60 * 60)) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  },

  // Copy text to clipboard
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    }
  },

  // Validate Solana address
  isValidSolanaAddress(address) {
    try {
      const pubkey = new solanaWeb3.PublicKey(address);
      return solanaWeb3.PublicKey.isOnCurve(pubkey);
    } catch {
      return false;
    }
  },

  // Create explorer URL
  getExplorerUrl(signature, cluster = 'devnet') {
    return `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`;
  },

  // Debounce function
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Local storage helpers
  storage: {
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (err) {
        console.warn('Failed to save to localStorage:', err);
      }
    },

    get(key, defaultValue = null) {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
      } catch (err) {
        console.warn('Failed to read from localStorage:', err);
        return defaultValue;
      }
    },

    remove(key) {
      try {
        localStorage.removeItem(key);
      } catch (err) {
        console.warn('Failed to remove from localStorage:', err);
      }
    }
  },

  // Error handling
  handleError(error, context = '') {
    console.error(`Error in ${context}:`, error);
    
    let message = 'An unexpected error occurred';
    
    if (error.message) {
      message = error.message;
    } else if (typeof error === 'string') {
      message = error;
    }
    
    // Clean up common error messages
    if (message.includes('User rejected')) {
      message = 'Transaction was rejected by user';
    } else if (message.includes('Blockhash not found')) {
      message = 'Transaction expired, please try again';
    } else if (message.includes('insufficient')) {
      message = 'Insufficient funds for transaction';
    }
    
    return message;
  },

  // Network status checker
  async checkNetworkStatus() {
    try {
      const connection = new solanaWeb3.Connection(CONFIG.RPC_ENDPOINTS[CONFIG.SOLANA_NETWORK]);
      const slot = await connection.getSlot();
      return { online: true, slot };
    } catch (error) {
      return { online: false, error: error.message };
    }
  },

  // Price formatting for different tokens
  formatTokenAmount(amount, decimals = 6, symbol = '') {
    const formatted = (amount / Math.pow(10, decimals)).toFixed(decimals);
    return symbol ? `${formatted} ${symbol}` : formatted;
  }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Utils;
} else if (typeof window !== 'undefined') {
  window.Utils = Utils;
}
