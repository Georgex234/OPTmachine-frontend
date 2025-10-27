// Advanced features and components for OptMachine DApp

class OptionManager {
  constructor() {
    this.options = [];
    this.loadSavedOptions();
  }

  // Load options from localStorage
  loadSavedOptions() {
    this.options = Utils.storage.get('user_options', []);
  }

  // Save options to localStorage
  saveOptions() {
    Utils.storage.set('user_options', this.options);
  }

  // Add a new option
  addOption(optionData) {
    const option = {
      id: Date.now().toString(),
      ...optionData,
      createdAt: Date.now()
    };
    this.options.unshift(option);
    this.saveOptions();
    return option;
  }

  // Get user's options
  getUserOptions(userPubkey) {
    return this.options.filter(option => option.creator === userPubkey);
  }

  // Update option status
  updateOptionStatus(optionId, status) {
    const option = this.options.find(opt => opt.id === optionId);
    if (option) {
      option.status = status;
      option.updatedAt = Date.now();
      this.saveOptions();
    }
  }
}

class NotificationManager {
  constructor() {
    this.notifications = [];
    this.init();
  }

  init() {
    this.createNotificationContainer();
  }

  createNotificationContainer() {
    if (document.getElementById('notifications-container')) return;
    
    const container = document.createElement('div');
    container.id = 'notifications-container';
    container.className = 'position-fixed top-0 end-0 p-3';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
  }

  show(message, type = 'info', duration = 5000) {
    const notification = this.createNotification(message, type);
    const container = document.getElementById('notifications-container');
    container.appendChild(notification);

    // Auto remove
    setTimeout(() => {
      this.remove(notification);
    }, duration);

    return notification;
  }

  createNotification(message, type) {
    const id = `notification-${Date.now()}`;
    const icons = {
      success: 'fas fa-check-circle',
      error: 'fas fa-exclamation-triangle',
      warning: 'fas fa-exclamation-circle',
      info: 'fas fa-info-circle'
    };

    const notification = document.createElement('div');
    notification.id = id;
    notification.className = `toast show align-items-center text-white bg-${type} border-0`;
    notification.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">
          <i class="${icons[type]} me-2"></i>
          ${message}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" onclick="notificationManager.remove(this.closest('.toast'))"></button>
      </div>
    `;

    return notification;
  }

  remove(notification) {
    if (notification && notification.parentNode) {
      notification.classList.add('fade');
      setTimeout(() => {
        notification.remove();
      }, 150);
    }
  }
}

class WalletManager {
  constructor() {
    this.supportedWallets = CONFIG.SUPPORTED_WALLETS;
    this.currentWallet = null;
  }

  async detectWallets() {
    const available = [];
    
    for (const wallet of this.supportedWallets) {
      if (window[wallet.adapter]) {
        available.push({
          ...wallet,
          detected: true,
          installed: true
        });
      } else {
        available.push({
          ...wallet,
          detected: false,
          installed: false
        });
      }
    }
    
    return available;
  }

  async connectWallet(walletName = 'phantom') {
    try {
      const walletAdapter = window[walletName];
      if (!walletAdapter) {
        throw new Error(`${walletName} wallet not found. Please install it first.`);
      }

      const response = await walletAdapter.connect();
      this.currentWallet = {
        name: walletName,
        adapter: walletAdapter,
        publicKey: response.publicKey
      };

      return this.currentWallet;
    } catch (error) {
      throw new Error(`Failed to connect to ${walletName}: ${error.message}`);
    }
  }

  async disconnectWallet() {
    if (this.currentWallet && this.currentWallet.adapter.disconnect) {
      await this.currentWallet.adapter.disconnect();
    }
    this.currentWallet = null;
  }

  isConnected() {
    return this.currentWallet !== null;
  }

  getPublicKey() {
    return this.currentWallet?.publicKey || null;
  }
}

class TransactionManager {
  constructor() {
    this.pendingTransactions = new Map();
  }

  async sendAndConfirm(transaction, wallet, connection) {
    const txId = `tx_${Date.now()}`;
    
    try {
      this.pendingTransactions.set(txId, {
        status: 'signing',
        timestamp: Date.now()
      });

      // Sign transaction
      const signedTx = await wallet.signTransaction(transaction);
      
      this.pendingTransactions.set(txId, {
        status: 'sending',
        timestamp: Date.now()
      });

      // Send transaction
      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: CONFIG.CONFIRMATION_COMMITMENT
      });

      this.pendingTransactions.set(txId, {
        status: 'confirming',
        signature,
        timestamp: Date.now()
      });

      // Confirm transaction
      const confirmation = await connection.confirmTransaction(signature, CONFIG.CONFIRMATION_COMMITMENT);
      
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      this.pendingTransactions.set(txId, {
        status: 'confirmed',
        signature,
        timestamp: Date.now()
      });

      return { signature, txId };
    } catch (error) {
      this.pendingTransactions.set(txId, {
        status: 'failed',
        error: error.message,
        timestamp: Date.now()
      });
      throw error;
    }
  }

  getTransactionStatus(txId) {
    return this.pendingTransactions.get(txId);
  }

  clearOldTransactions(maxAge = 24 * 60 * 60 * 1000) {
    const now = Date.now();
    for (const [txId, tx] of this.pendingTransactions.entries()) {
      if (now - tx.timestamp > maxAge) {
        this.pendingTransactions.delete(txId);
      }
    }
  }
}

// Initialize managers
let optionManager, notificationManager, walletManager, transactionManager;

document.addEventListener('DOMContentLoaded', () => {
  optionManager = new OptionManager();
  notificationManager = new NotificationManager();
  walletManager = new WalletManager();
  transactionManager = new TransactionManager();
  
  // Make them globally available
  window.optionManager = optionManager;
  window.notificationManager = notificationManager;
  window.walletManager = walletManager;
  window.transactionManager = transactionManager;
});
