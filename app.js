const { Connection, Transaction } = solanaWeb3;

let wallet = null;
let optionMintList = []; // 用于存储所有创建的 option mint 地址
let poolAccountList = [];

const connection = new Connection(
  "https://api.devnet.solana.com",
  {
    commitment: "confirmed",
    disableWebsocket: true,
    wsEndpoint: false
  }
);
// const connection = new Connection("https://api.devnet.solana.com"); // 你也可以换成本地或 RPC

// Add configurable API base so frontend works on GitHub Pages or production
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'https://api.optmachine.xyz'
  : 'https://api.optmachine.xyz'; // <-- replace with your real backend URL in production

// UI State Management
const UI = {
  connectBtn: null,
  createBtn: null,
  mintBtn: null,
  walletStatus: null,
  walletInfo: null,
  walletAddress: null,
  optionForm: null,
  logElement: null,
  exerciseBtn: null,
  createAmmBtn: null,
  firstAddLiquidityBtn: null,
  swapBtn: null,

  poolParserBtn: null,
  optionParserBtn: null,
  reclaimBtn: null,

  airdropBtn: null,
  depositABtn: null,
  init() {
    this.connectBtn = document.getElementById("connect");
    this.createBtn = document.getElementById("create");
    this.mintBtn = document.getElementById("mint");
    this.exerciseBtn = document.getElementById("exercise");
    this.createAmmBtn = document.getElementById("createAmm");
    this.firstAddLiquidityBtn = document.getElementById("firstAddLiquidity");
    this.swapBtn = document.getElementById("swap");
    this.poolParserBtn = document.getElementById("parse-pool");
    this.optionParserBtn = document.getElementById("parse-option");
    this.reclaimBtn = document.getElementById("reclaim-btn");
    this.airdropBtn = document.getElementById("airdrop-btn");
    this.depositABtn = document.getElementById("deposit-a-btn");
    this.addToCartBtn = document.getElementById("add-to-cart");
    this.walletStatus = document.getElementById("wallet-status");
    this.walletInfo = document.getElementById("wallet-info");
    this.walletAddress = document.getElementById("wallet-address");
    this.optionForm = document.getElementById("option-form");
    this.logElement = document.getElementById("log");
    // 初始化时调用
    updateMintHint('underlying-mint', 'underlying-mint-hint');
    updateMintHint('quote-mint', 'quote-mint-hint');
    setupMintInputJump('underlying-mint');
    setupMintInputJump('quote-mint');
    setupMintInputJump('option-mint');
    setupMintInputJump('exercise-option-mint');
    setupMintInputJump('amm-mint-a');
    setupMintInputJump('amm-mint-b');
    enforceInteger('contract-size');
    enforceInteger('strike-price');
    enforceInteger('mint-amount');
    this.setupEventListeners();
    this.setDefaultExpirationDate();
    this.updateButtonStates();
  },

  setupEventListeners() {
    this.connectBtn.onclick = throttle(connectWallet, 500);
    // this.optionForm.onsubmit = throttle(createOption, 2000);
    this.optionForm.onsubmit = createOption; // 不要加 throttle
    this.addToCartBtn.onclick = addToCart;   // 新增
    this.mintBtn.onclick = mintOption;
    this.exerciseBtn.onclick = exerciseOption;
    this.createAmmBtn.onclick = createAmmPool; // 绑定 createAmm 按钮
    this.firstAddLiquidityBtn.onclick = firstAddLiquidity; // 绑定 firstAddLiquidity 按钮
    this.swapBtn.onclick = swapAction;
    this.poolParserBtn.onclick = parsePoolAccount;
    this.optionParserBtn.onclick = parseOptionAccount;
    this.reclaimBtn.onclick = reclaimOption;
    this.airdropBtn.onclick = airdropAction;
    this.depositABtn.onclick = depositAAction;


    document.getElementById("clear-log").onclick = () => {
      this.logElement.textContent = "";
    };
  },

  // setDefaultExpirationDate() {
  //   const now = new Date();
  //   now.setDate(now.getDate() + 30); // 默认30天后到期
  //   const isoString = now.toISOString().slice(0, 16);
  //   document.getElementById("expiration-date").value = isoString;
  // },

  setDefaultExpirationDate() {
    const el = document.getElementById("expiration-date");
    if (!el) return;
    // 已有值则不覆盖（避免切换 tab 时重置）
    if (el.value && el.value.trim() !== "") return;

    const now = new Date();
    now.setDate(now.getDate() + 30); // 默认30天后到期（本地时间）
    const pad = (n) => String(n).padStart(2, '0');
    const value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;

    el.value = value;
  },

  updateWalletStatus(connected, address = null) {
    const statusIndicator = this.walletStatus.querySelector('.status-indicator');
    const statusText = document.getElementById('wallet-status-text');
    statusText.textContent = '';
    statusText.textContent = connected ? ' Connected' : ' Not Connected';
    if (connected) {
      statusIndicator.className = 'status-indicator status-connected';
      this.walletInfo.style.display = 'block';
      this.walletAddress.textContent = address;
      this.connectBtn.innerHTML =
        `<i class="fas fa-unlink me-2"></i>
        <span id="connect-text">Disconnect</span>
        <span id="connect-spinner" class="spinner-border spinner-border-sm ms-2" style="display: inline-block;"></span>`;
      this.createBtn.disabled = false;
      this.addToCartBtn.disabled = false;
    } else {
      statusIndicator.className = 'status-indicator status-disconnected';
      this.walletInfo.style.display = 'none';
      this.connectBtn.innerHTML =
        `<i class="fas fa-plug me-2"></i>
        <span id="connect-text">Connect Wallet</span>
        <span id="connect-spinner" class="spinner-border spinner-border-sm ms-2" style="display: inline-block;"></span>`;
      this.createBtn.disabled = true;
      this.addToCartBtn.disabled = true;
    }
  },

  showLoading(button, show = true) {
    const text = button.querySelector('[id$="-text"]');
    const spinner = button.querySelector('[id$="-spinner"]');

    if (show) {
      button.disabled = true;
      spinner.style.display = 'inline-block';
    } else {
      button.disabled = false;
      spinner.style.display = 'none';
    }
  },

  showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible alert-center`;
    // alertDiv.innerHTML = `
    //   ${message}
    //   <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    // `;
    alertDiv.innerHTML = `
      ${message}
      <button class="btn-close"></button>
    `;
    // 居中插入到container末尾
    document.querySelector('.container').appendChild(alertDiv);
    // 触发淡入
    setTimeout(() => {
      alertDiv.classList.add('show');
    }, 100);
    // 支持手动关闭动画
    const closeBtn = alertDiv.querySelector('.btn-close');
    closeBtn.onclick = (e) => {
      e.preventDefault();
      alertDiv.classList.remove('show');
      alertDiv.classList.add('hide');

      setTimeout(() => {
        if (alertDiv.parentNode) alertDiv.remove();
      }, 500);
    };
    // 自动淡出并移除
    setTimeout(() => {
      alertDiv.classList.remove('show');
      alertDiv.classList.add('hide');
      setTimeout(() => {
        if (alertDiv.parentNode) alertDiv.remove();
      }, 500);
    }, 1500);
  },
  updateButtonStates() {
    const walletConnected = wallet !== null;
    this.createBtn.disabled = !walletConnected;
    this.mintBtn.disabled = !walletConnected || optionMintList.length === 0; // 禁用 mint 按钮条件
    this.exerciseBtn.disabled = !walletConnected || optionMintList.length === 0;
    this.createAmmBtn.disabled = !walletConnected || optionMintList.length === 0; // 与 exercise 一致
    this.firstAddLiquidityBtn.disabled = !walletConnected || poolAccountList.length === 0; // 只要钱包连接即可
    this.swapBtn.disabled = !walletConnected || poolAccountList.length === 0; // 只要钱包连接即可
    this.depositABtn.disabled = !walletConnected || poolAccountList.length === 0; // 只要钱包连接即可
  }
};

function log(msg, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const icon = {
    'info': 'ℹ️',
    'success': '✅',
    'error': '❌',
    'warning': '⚠️'
  }[type] || 'ℹ️';

  // 检查是否是“Transaction sent: ”开头的消息
  let htmlMsg = msg;
  const txMatch = msg.match(/^Transaction sent: (\w+)/);
  if (txMatch) {
    const sig = txMatch[1];
    const url = `https://solscan.io/tx/${sig}?cluster=devnet`;
    htmlMsg = `Transaction sent: <a href="${url}" target="_blank" class="text-info text-decoration-underline">${sig}</a>`;
  }
  const tokenMatch = msg.match(/^Option Token Mint: (\w+)/);
  if (tokenMatch) {
    const mint = tokenMatch[1];
    const url = `https://solscan.io/token/${mint}?cluster=devnet`;
    htmlMsg = `Option Token Mint: <a href="${url}" target="_blank" class="text-info text-decoration-underline">${mint}</a>`;
  }
  const sent_tx_match = msg.match(/^Sent tx: (\w+)/);
  if (sent_tx_match) {
    const sig = sent_tx_match[1];
    const url = `https://solscan.io/tx/${sig}?cluster=devnet`;
    htmlMsg = `Sent tx: <a href="${url}" target="_blank" class="text-info text-decoration-underline">${sig}</a>`;
  }

  // 用 innerHTML 追加（注意：此处不再用 textContent）
  UI.logElement.innerHTML += `[${timestamp}] ${icon} ${htmlMsg}<br>`;
  document.querySelector('.log-container').scrollTop =
    document.querySelector('.log-container').scrollHeight;
}

async function connectWallet() {
  UI.showLoading(UI.connectBtn);

  try {
    if (!window.solana) {
      throw new Error("Please install Phantom, Backpack, or another Solana wallet");
    }

    if (wallet) {
      // Disconnect
      await window.solana.disconnect();
      wallet = null;
      UI.updateWalletStatus(false);
      log("Wallet disconnected", 'info');
      UI.showAlert('<i class="fas fa-info-circle me-2"></i>Wallet disconnected successfully', 'info');
    } else {
      // Connect
      const resp = await window.solana.connect();
      wallet = window.solana;
      const address = resp.publicKey.toString();

      // UI.updateWalletStatus(true, address);

      // Check wallet balance
      try {
        const balance = await connection.getBalance(resp.publicKey);
        const solBalance = (balance / 1e9).toFixed(4);
        log(`Connected wallet: ${address}`, 'success');
        UI.showAlert(`<i class="fas fa-check-circle me-2"></i>Successfully connected to wallet`, 'success');
        log(`Wallet balance: ${solBalance} SOL`, 'info');
      } catch (balanceError) {
        console.warn("Could not fetch balance:", balanceError);
      }
      UI.updateWalletStatus(true, address);
      updateCartButtons();
      UI.updateButtonStates();
    }
  } catch (err) {
    console.error("Wallet connection error:", err);
    log(`Connection failed: ${err.message}`, 'error');
    UI.showAlert(`<i class="fas fa-exclamation-triangle me-2"></i>Failed to connect wallet: ${err.message}`, 'danger');
  } finally {
    UI.showLoading(UI.connectBtn, false);
    console.log("Option cart length:", optionCart.length);
  }
}


function isValidSolanaAddress(address) {
  try {
    const pubkey = new solanaWeb3.PublicKey(address.trim());
    return pubkey.toBytes().length === 32;
  } catch (e) {
    return false;
  }
}
// 新增一个函数用于统一校验并控制按钮状态
function updateCreateAndCartBtnState() {
  const underlying = document.getElementById('underlying-mint').value.trim();
  const quote = document.getElementById('quote-mint').value.trim();
  const valid = isValidSolanaAddress(underlying) && isValidSolanaAddress(quote) && wallet;
  UI.createBtn.disabled = !valid;
  UI.addToCartBtn.disabled = !valid;
  // UI.addToCartBtn.disabled = false;
}

// 提示是否合法地址
function updateMintHint(inputId, hintId) {
  const input = document.getElementById(inputId);
  const hint = document.getElementById(hintId);
  input.addEventListener('input', function () {
    if (!input.value.trim()) {
      hint.textContent = '';
      hint.className = 'form-text text-muted';
    } else if (isValidSolanaAddress(input.value)) {
      hint.textContent = '✔️ Valid Solana address';
      hint.className = 'form-text text-success';
    } else {
      hint.textContent = '❌ Invalid Solana address';
      hint.className = 'form-text text-danger';
    }
    // 每次输入时都校验按钮状态
    updateCreateAndCartBtnState();
  });
  // 初始化时也校验一次
  input.dispatchEvent(new Event('input'));
}


// 跳转对应网址(自动检测可用性)
function setupMintInputJump(inputId, cluster = 'devnet') {
  const input = document.getElementById(inputId);
  let ctrlDown = false;

  input.addEventListener('keydown', function (e) {
    const mint = input.value.trim();
    if (e.ctrlKey && !ctrlDown && isValidSolanaAddress(mint)) {
      ctrlDown = true;
      input.classList.add('ctrl-active');
      // input.style.color = 'red';
    }
  });
  input.addEventListener('keyup', function (e) {
    if (!e.ctrlKey && ctrlDown) {
      ctrlDown = false;
      input.classList.remove('ctrl-active');
    }
  });
  // 监听焦点离开事件
  input.addEventListener('blur', function () {
    ctrlDown = false;
    input.classList.remove('ctrl-active');
  });
  input.addEventListener('input', function () {
    // 输入变化时，如果不合法，移除高亮
    if (!isValidSolanaAddress(input.value)) {
      input.classList.remove('ctrl-active');
      ctrlDown = false;
    }
  });
  input.addEventListener('click', function (e) {
    const mint = input.value.trim();
    if (ctrlDown && isValidSolanaAddress(mint) && (inputId == 'underlying-mint' || inputId == 'quote-mint')) {
      window.open(`https://solscan.io/token/${mint}?cluster=${cluster}`, '_blank');
      e.preventDefault();
      ctrlDown = false;
      input.classList.remove('ctrl-active');
    }
    if (ctrlDown && isValidSolanaAddress(mint) && (inputId == 'option-mint' || inputId == 'exercise-option-mint' || inputId == 'amm-mint-a' || inputId == 'amm-mint-b')) {
      window.open(`https://solscan.io/token/${mint}?cluster=${cluster}`, '_blank');
      e.preventDefault();
      ctrlDown = false;
      input.classList.remove('ctrl-active');
    }
  });
}

// 追加到 Transaction Sent Log
function logTxSent(sig, tokenMint = null, cluster = 'devnet') {
  const txLog = document.getElementById('tx-log');
  const time = new Date().toLocaleTimeString();
  const txUrl = `https://solscan.io/tx/${sig}?cluster=${cluster}`;
  // 先记录交易链接
  let entry = `[${time}] ✅ Transaction sent: <a href="${txUrl}" target="_blank" class="text-info text-decoration-underline">${sig}</a>\n`;
  // 如果有 option token mint，追加一行可跳转到 token 页面
  if (tokenMint) {
    const tokenUrl = `https://solscan.io/token/${tokenMint}?cluster=${cluster}`;
    entry += `[${time}] 🪙 Option Token Mint: <a href="${tokenUrl}" target="_blank" class="text-info text-decoration-underline">${tokenMint}</a>\n`;
  }
  txLog.innerHTML += entry;
  // 滚动到底部保持可见
  const container = document.querySelector('.log-container');
  if (container) container.scrollTop = container.scrollHeight;
}
function logPoolAccount(sig, tokenMint = null, cluster = 'devnet') {
  const txLog = document.getElementById('tx-log');
  const time = new Date().toLocaleTimeString();
  // const txUrl = `https://solscan.io/tx/${sig}?cluster=${cluster}`;
  // 先记录交易链接
  let entry = `[${time}] ✅ Pool Account: ${sig}\n`;
  // 如果有 option token mint，追加一行可跳转到 token 页面
  // if (tokenMint) {
  //   const tokenUrl = `https://solscan.io/token/${tokenMint}?cluster=${cluster}`;
  //   entry += `[${time}] 🪙 Option Token Mint: <a href="${tokenUrl}" target="_blank" class="text-info text-decoration-underline">${tokenMint}</a>\n`;
  // }
  txLog.innerHTML += entry;
  // 滚动到底部保持可见
  const container = document.querySelector('.log-container');
  if (container) container.scrollTop = container.scrollHeight;
}
// 清空按钮
document.getElementById('clear-tx-log').onclick = function () {
  document.getElementById('tx-log').innerHTML = '';
};

async function createOption(event) {
  event.preventDefault();

  if (!wallet) {
    UI.showAlert('<i class="fas fa-exclamation-triangle me-2"></i>Please connect your wallet first', 'warning');
    return;
  }

  UI.showLoading(UI.createBtn);

  try {
    // Get form values
    const underlyingMint = document.getElementById("underlying-mint").value.trim();
    const quoteMint = document.getElementById("quote-mint").value.trim();
    const strikePrice = parseFloat(document.getElementById("strike-price").value);
    const contractSize = parseInt(document.getElementById("contract-size").value);
    const expirationDate = document.getElementById("expiration-date").value;

    // Validate inputs
    if (!strikePrice || !contractSize || !expirationDate) {
      throw new Error("Please fill in all required fields");
    }

    const unixExpiration = Math.floor(new Date(expirationDate).getTime() / 1000);

    if (unixExpiration <= Math.floor(Date.now() / 1000)) {
      throw new Error("Expiration date must be in the future");
    }

    log(`Creating option: Strike=${strikePrice}, Size=${contractSize}, Expires=${new Date(expirationDate).toLocaleString()}`, 'info');

    // 使用智能 API 调用 (自动检测后端可用性)
    const data = await callCreateAPI({
      creator: wallet.publicKey.toString(),
      underlying_mint: underlyingMint,
      quote_mint: quoteMint,
      strike_price: Math.floor(strikePrice * 1e6), // Convert to micro units
      unix_expiration: unixExpiration,
      contract_size: contractSize
    });

    if (data.option_token_mint) {
      log(`Option Token Mint: ${data.option_token_mint}`, 'success');
      optionMintList.push(data.option_token_mint); // 保存到内存
      localStorage.setItem('optionMintList', JSON.stringify(optionMintList)); // 保存到 localStorage
      updateOptionMintDropdown(); // 更新下拉列表
    }

    console.log("API Response:", data);



    // Deserialize transaction
    if (!data.unsigned_tx) {
      throw new Error("No unsigned transaction received from API");
    }

    const txBytes = Uint8Array.from(atob(data.unsigned_tx), c => c.charCodeAt(0));
    const tx = Transaction.from(txBytes);

    console.log("Decoded Transaction:", tx);
    log(`Transaction prepared (blockhash: ${tx.recentBlockhash || "unknown"})`, 'info');

    // Sign transaction
    log("Requesting wallet signature...", 'info');
    const signedTx = await wallet.signTransaction(tx);
    log("Transaction signed successfully", 'success');

    // Broadcast transaction
    log("Broadcasting transaction to Solana network...", 'info');
    const sig = await connection.sendRawTransaction(signedTx.serialize(), {
      skipPreflight: true,
      preflightCommitment: 'confirmed'
    });

    log(`Transaction sent: ${sig}`, 'success');

    // 记录到日志，若 API 返回了 option_token_mint 则一并记录（并生成 token 跳转）
    logTxSent(sig, data && data.option_token_mint ? data.option_token_mint : null);

    // // Confirm transaction
    // log("Waiting for confirmation...", 'info');
    // const confirmation = await connection.confirmTransaction(sig, 'confirmed');

    // if (confirmation.value.err) {
    //   throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
    // }

    // log(`✨ Option created successfully! Transaction: ${sig}`, 'success');
    UI.showAlert(`<i class="fas fa-check-circle me-2"></i>Option created successfully! <a href="https://explorer.solana.com/tx/${sig}?cluster=devnet" target="_blank" class="text-decoration-none">View on Explorer</a>`, 'success');

    // Reset form
    UI.optionForm.reset();
    UI.setDefaultExpirationDate();

  } catch (err) {
    console.error("Create option error:", err);
    log(`❌ Error: ${err.message}`, 'error');
    UI.showAlert(`<i class="fas fa-exclamation-triangle me-2"></i>Failed to create option: ${err.message}`, 'danger');
  } finally {
    UI.showLoading(UI.createBtn, false);
    updateOptionMintDropdown();
    UI.updateButtonStates();
  }
}


let optionCart = [];
// 3. 新增 addToCart 函数
function addToCart() {
  // 获取表单数据
  const underlying = document.getElementById('underlying-mint').value.trim();
  const quote = document.getElementById('quote-mint').value.trim();
  const strike = parseFloat(document.getElementById('strike-price').value);
  const size = parseInt(document.getElementById('contract-size').value);
  const expires = document.getElementById('expiration-date').value;
  // 简单校验
  if (!isValidSolanaAddress(underlying) || !isValidSolanaAddress(quote) || isNaN(strike) || isNaN(size) || !expires) {
    UI.showAlert('Please fill in complete and valid option parameters', 'warning');
    return;
  }
  optionCart.push({ underlying, quote, strike, size, expires });
  renderCart();
}

function renderCart() {
  const tbody = document.querySelector('#cart-table tbody');
  tbody.innerHTML = '';
  optionCart.forEach((item, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="checkbox" class="cart-select" data-idx="${idx}"></td>
      <td class="cart-address-cell">
        <a href="https://solscan.io/token/${item.underlying}?cluster=devnet" 
          target="_blank" 
          class="text-decoration-underline cart-address"
          title="${item.underlying}">
          ${item.underlying}
        </a>
      </td>
      <td class="cart-address-cell">
        <a href="https://solscan.io/token/${item.quote}?cluster=devnet" 
          target="_blank" 
          class="text-decoration-underline cart-address"
          title="${item.quote}">
          ${item.quote}
        </a>
      </td>
      <td>
        <input type="number" class="form-control form-control-sm cart-strike" data-idx="${idx}" value="${item.strike}" min="0" step="0.01" style="width:90px;">
      </td>
      <td>
        <input type="number" class="form-control form-control-sm cart-size" data-idx="${idx}" value="${item.size}" min="1" style="width:70px;">
      </td>
      <td>
        <input type="datetime-local" class="form-control form-control-sm cart-expires" data-idx="${idx}" value="${item.expires}" style="width:180px;">
      </td>
      <td>
        <button class="btn btn-sm btn-danger cart-remove" data-idx="${idx}"><i class="fas fa-trash"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  updateCartButtons();

  // 监听 strike、size、expires 的修改
  tbody.querySelectorAll('.cart-strike').forEach(input => {
    input.addEventListener('change', function () {
      const idx = Number(this.dataset.idx);
      optionCart[idx].strike = parseFloat(this.value);
    });
  });
  tbody.querySelectorAll('.cart-size').forEach(input => {
    input.addEventListener('change', function () {
      const idx = Number(this.dataset.idx);
      optionCart[idx].size = parseInt(this.value);
    });
  });
  tbody.querySelectorAll('.cart-expires').forEach(input => {
    input.addEventListener('change', function () {
      const idx = Number(this.dataset.idx);
      optionCart[idx].expires = this.value;
    });
  });
}
document.getElementById('remove-all').onclick = function () {
  if (optionCart.length === 0) return;
  if (confirm('确定要删除所有预备 Option 吗？')) {
    optionCart = [];
    renderCart();
  }
};
function updateCartButtons() {
  const selected = document.querySelectorAll('.cart-select:checked');
  document.getElementById('execute-selected').disabled = selected.length === 0 || wallet === null;
  document.getElementById('remove-selected').disabled = selected.length === 0 || wallet === null;
  document.getElementById('execute-all').disabled = optionCart.length === 0 || wallet === null;
  document.getElementById('remove-all').disabled = optionCart.length === 0 || wallet === null;
}

document.getElementById('cart-table').addEventListener('click', function (e) {
  if (e.target.closest('.cart-remove')) {
    const idx = e.target.closest('.cart-remove').dataset.idx;
    optionCart.splice(idx, 1);
    renderCart();
  }
});

document.getElementById('cart-table').addEventListener('change', function (e) {
  if (e.target.classList.contains('cart-select')) {
    updateCartButtons();
  }
});

document.getElementById('remove-selected').onclick = function () {
  const selected = document.querySelectorAll('.cart-select:checked');
  const idxs = Array.from(selected).map(cb => Number(cb.dataset.idx)).sort((a, b) => b - a);
  idxs.forEach(idx => optionCart.splice(idx, 1));
  renderCart();
};

document.getElementById('execute-all').onclick = async function () {
  for (const option of optionCart) {
    await createOptionFromCart(option);
  }
  optionCart = [];
  renderCart();
};

document.getElementById('execute-selected').onclick = async function () {
  const selected = document.querySelectorAll('.cart-select:checked');
  const idxs = Array.from(selected).map(cb => Number(cb.dataset.idx));
  // 只执行选中的
  for (const idx of idxs) {
    await createOptionFromCart(optionCart[idx]);
  }
  // 删除已执行的
  idxs.sort((a, b) => b - a).forEach(idx => optionCart.splice(idx, 1));
  renderCart();
};

// 用于执行购物车中的option
async function createOptionFromCart(option) {
  if (!option) {
    log('Error: Option is undefined', 'error');
    return;
  }
  // 类型转换和校验
  const strike = parseFloat(option.strike);
  const size = parseInt(option.size);
  const expires = option.expires;
  if (!isValidSolanaAddress(option.underlying) || !isValidSolanaAddress(option.quote) || isNaN(strike) || isNaN(size) || !expires) {
    log('Error: Option parameters invalid', 'error');
    UI.showAlert('Option parameters invalid, cannot execute', 'danger');
    return;
  }
  if (!wallet) {
    UI.showAlert('<i class="fas fa-exclamation-triangle me-2"></i>Please connect your wallet first', 'warning');
    return;
  }
  try {
    log(`Creating option: Strike=${option.strike}, Size=${option.size}, Expires=${new Date(option.expires).toLocaleString()}`, 'info');
    const unixExpiration = Math.floor(new Date(option.expires).getTime() / 1000);
    const data = await callCreateAPI({
      creator: wallet.publicKey.toString(),
      underlying_mint: option.underlying,
      quote_mint: option.quote,
      strike_price: Math.floor(option.strike * 1e6),
      unix_expiration: unixExpiration,
      contract_size: option.size
    });
    if (data.option_token_mint) {
      log(`Option Token Mint: ${data.option_token_mint}`, 'success');
      optionMintList.push(data.option_token_mint); // 保存到内存
      localStorage.setItem('optionMintList', JSON.stringify(optionMintList)); // 保存到 localStorage
      updateOptionMintDropdown(); // 更新下拉列表
    }
    // ...后续与 createOption 相同
    // 你可以复用 createOption 里的后续逻辑
    console.log("API Response:", data);



    // Deserialize transaction
    if (!data.unsigned_tx) {
      throw new Error("No unsigned transaction received from API");
    }

    const txBytes = Uint8Array.from(atob(data.unsigned_tx), c => c.charCodeAt(0));
    const tx = Transaction.from(txBytes);

    console.log("Decoded Transaction:", tx);
    log(`Transaction prepared (blockhash: ${tx.recentBlockhash || "unknown"})`, 'info');

    // Sign transaction
    log("Requesting wallet signature...", 'info');
    const signedTx = await wallet.signTransaction(tx);
    log("Transaction signed successfully", 'success');

    // Broadcast transaction
    log("Broadcasting transaction to Solana network...", 'info');
    const sig = await connection.sendRawTransaction(signedTx.serialize(), {
      skipPreflight: true,
      preflightCommitment: 'confirmed'
    });

    log(`Transaction sent: ${sig}`, 'success');

    // 记录到日志，若 API 返回了 option_token_mint 则一并记录（并生成 token 跳转）
    logTxSent(sig, data && data.option_token_mint ? data.option_token_mint : null);

    // 获取并打印当前 block height
    const currentBlockHeight = await connection.getBlockHeight();
    console.log("Current block height before sendRawTransaction:", currentBlockHeight);

    // Confirm transaction
    log("Waiting for confirmation...", 'info');

    const latestBlockhash = await connection.getLatestBlockhash();
    console.log("Latest lastValidBlockHeight:", latestBlockhash.lastValidBlockHeight);

    // const confirmation = await connection.confirmTransaction(
    //   {
    //     signature: sig,
    //     blockhash: latestBlockhash.blockhash,
    //     lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
    //   },
    //   'processed'
    // );

    // if (confirmation.value && confirmation.value.err) {
    //   throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
    // }
    log(`✨ Option created successfully! Transaction: ${sig}`, 'success');
    UI.showAlert(`<i class="fas fa-check-circle me-2"></i>Option created successfully! <a href="https://explorer.solana.com/tx/${sig}?cluster=devnet" target="_blank" class="text-decoration-none">View on Explorer</a>`, 'success');


    // Reset form
    // UI.optionForm.reset();
    UI.setDefaultExpirationDate();
  } catch (err) {
    log(`❌ Error: ${err.message}`, 'error');
    UI.showAlert(`<i class="fas fa-exclamation-triangle me-2"></i>Failed to create option: ${err.message}`, 'danger');
  } finally {
    updateOptionMintDropdown();
    UI.updateButtonStates();
  }
}

function throttle(fn, delay = 500) {
  let lastCall = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      return fn.apply(this, args);
    }
  };
}
// 确保输入为整数
function enforceInteger(id) {
  const cs = document.getElementById(id);
  if (!cs) return;

  // 失焦时如果是小数则向下取整并提示
  cs.addEventListener('blur', () => {
    const v = cs.value.trim();
    if (v === '') return;
    const n = Number(v);
    if (isNaN(n)) {
      cs.value = '';
      return;
    }
    if (!Number.isInteger(n)) {
      const intVal = Math.max(1, Math.floor(n));
      cs.value = intVal;
      showWarning('Value must be an integer');
    }
  });

  function showWarning(msg) {
    let warn = document.getElementById(`${id}-warning`);
    if (!warn) {
      warn = document.createElement('div');
      warn.id = `${id}-warning`;
      warn.className = 'form-text text-danger mt-1';
      cs.parentNode.parentNode.appendChild(warn);
    }
    warn.textContent = msg;
    warn.style.display = 'block';
    clearTimeout(warn._timeout);
    warn._timeout = setTimeout(() => { warn.textContent = ''; }, 3000);
  }
}

// Mint Option 逻辑

// Mint Option 逻辑
async function mintOption() {
  if (!wallet) {
    UI.showAlert('<i class="fas fa-exclamation-triangle me-2"></i>Please connect your wallet first', 'warning');
    log("❌ Mint blocked: wallet not connected", 'error');
    return;
  }

  const optionMint = document.getElementById("option-mint").value.trim();
  if (!isValidSolanaAddress(optionMint)) {
    UI.showAlert('<i class="fas fa-exclamation-triangle me-2"></i>Invalid Option Mint address', 'danger');
    log("❌ Mint blocked: invalid Option Mint address", 'error');
    return;
  }

  try {
    const mintAmount = parseInt(document.getElementById("mint-amount").value);
    if (isNaN(mintAmount) || mintAmount <= 0) {
      throw new Error("Invalid mint amount");
    }

    log(`Minting ${mintAmount} options for mint: ${optionMint}`, 'info');
    UI.showLoading(UI.mintBtn); // 显示加载效果

    const res = await fetch(`${API_BASE}/mint`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        minter: wallet.publicKey.toString(),
        option_mint: optionMint,
        // option_mint: 'BdMTb2HGETwqJoveP3VRenHyzRgMbALRsPvkqnThETVB',
        mint_amount: mintAmount
      })
    });

    const data = await res.json();
    console.log("API Response:", data);

    if (!data.unsigned_tx) {
      log("❌ No unsigned_tx in response");
      return;
    }

    const txBytes = Uint8Array.from(atob(data.unsigned_tx), c => c.charCodeAt(0));
    const tx = Transaction.from(txBytes);

    log("📝 Mint Transaction decoded", 'info');


    const signedTx = await wallet.signTransaction(tx);
    log("✍️ Transaction signed", 'success');

    // const sig = await connection.sendRawTransaction(signedTx.serialize());
    const sig = await connection.sendRawTransaction(signedTx.serialize(), {
      skipPreflight: true,
      preflightCommitment: 'confirmed'
    });
    log(`Sent tx: ${sig}`, 'success');

    logTxSent(sig, data && data.option_token_mint ? data.option_token_mint : null);
    // await connection.confirmTransaction(sig);



    // log(`🎉 Mint Confirmed: ${sig}`);
    // UI.showAlert(`<i class="fas fa-check-circle me-2"></i>Mint successful! <a href="https://explorer.solana.com/tx/${sig}?cluster=devnet" target="_blank" class="text-decoration-none">View on Explorer</a>`, 'success');

  } catch (err) {
    console.error("Mint option error:", err);
    log(`❌ Error: ${err.message}`, 'error');
    // UI.showAlert(`<i class="fas fa-exclamation-triangle me-2"></i>Failed to mint option: ${err.message}`, 'danger');
  } finally {
    UI.showLoading(UI.mintBtn, false); // 隐藏加载效果
    updateOptionMintDropdown();
  }
}


async function exerciseOption() {
  if (!wallet) {
    UI.showAlert('<i class="fas fa-exclamation-triangle me-2"></i>Please connect your wallet first', 'warning');
    log("❌ Exercise blocked: wallet not connected", 'error');
    return;
  }

  const optionMint = document.getElementById("exercise-option-mint").value.trim();
  if (!isValidSolanaAddress(optionMint)) {
    UI.showAlert('<i class="fas fa-exclamation-triangle me-2"></i>Invalid Option Mint address', 'danger');
    log("❌ Exercise blocked: invalid Option Mint address", 'error');
    return;
  }

  try {
    const exerciseAmount = parseInt(document.getElementById("exercise-amount").value);
    if (isNaN(exerciseAmount) || exerciseAmount <= 0) {
      throw new Error("Invalid exercise amount");
    }

    log(`Exercising ${exerciseAmount} options for mint: ${optionMint}`, 'info');
    UI.showLoading(UI.exerciseBtn); // 显示加载效果

    const res = await fetch(`${API_BASE}/exercise`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        exerciser: wallet.publicKey.toString(),
        option_mint: optionMint,
        exercise_amount: exerciseAmount
      })
    });


    const data = await res.json();
    console.log("Exercise API Response:", data);
    log("Exercise " + data.exercise_amount + " options...");

    if (!data.unsigned_tx) {
      log("❌ No unsigned_tx in response");
      UI.showAlert('<i class="fas fa-exclamation-triangle me-2"></i>No unsigned transaction from API', 'danger');
      return;
    }

    const txBytes = Uint8Array.from(atob(data.unsigned_tx), c => c.charCodeAt(0));
    const tx = Transaction.from(txBytes);

    log("📝 Exercise Transaction decoded", 'info');



    const signedTx = await wallet.signTransaction(tx);
    log("✍️ Transaction signed", 'success');

    // 发送上链
    const sig = await connection.sendRawTransaction(signedTx.serialize());
    log("Sent tx: " + sig, 'success');
    logTxSent(sig, data && data.option_token_mint ? data.option_token_mint : null);
    // await connection.confirmTransaction(sig);
    // log("🎉 Exercise Confirmed: " + sig);

  } catch (err) {
    console.error("Exercise option error:", err);
    log(`Error: ${err.message}`, 'error');
    UI.showAlert(`<i class="fas fa-exclamation-triangle me-2"></i>Failed to exercise option: ${err.message}`, 'danger');
  } finally {
    UI.showLoading(UI.exerciseBtn, false);
    // 根据需要更新本地状态
  }
}

async function createAmmPool() {
  if (!wallet) {
    UI.showAlert('<i class="fas fa-exclamation-triangle me-2"></i>Please connect your wallet first', 'warning');
    log("❌ Create AMM blocked: wallet not connected", 'error');
    return;
  }

  const mintA = document.getElementById("amm-mint-a").value.trim();
  const mintB = document.getElementById("amm-mint-b").value.trim();

  if (!isValidSolanaAddress(mintA) || !isValidSolanaAddress(mintB)) {
    UI.showAlert('<i class="fas fa-exclamation-triangle me-2"></i>Invalid mint address', 'danger');
    log("❌ Create AMM blocked: invalid mint address", 'error');
    return;
  }

  try {
    log(`Creating AMM pool: A=${mintA} B=${mintB}`, 'info');
    UI.showLoading(UI.createAmmBtn, true);

    const res = await fetch(`${API_BASE}/create_amm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creator: wallet.publicKey.toString(),
        mint_a: mintA,
        mint_b: mintB
      })
    });

    const data = await res.json();
    console.log("AMM API Response:", data);
    log("🌀 Pool Account: " + data.pool_account);
    logPoolAccount(data.pool_account);
    // 如果后端返回 pool_account，则保存到 poolAccountList（并持久化）
    if (data.pool_account) {
      // 避免重复保存
      if (!poolAccountList.includes(data.pool_account)) {
        poolAccountList.push(data.pool_account);
        localStorage.setItem('poolAccountList', JSON.stringify(poolAccountList));
        updateOptionMintDropdown(); // 更新 datalist，方便下拉选择 pool 地址
      }
    }
    if (!data.unsigned_tx) {
      UI.showAlert('<i class="fas fa-exclamation-triangle me-2"></i>No unsigned transaction from API', 'danger');
      log("❌ No unsigned_tx in response");
      return;
    }

    const txBytes = Uint8Array.from(atob(data.unsigned_tx), c => c.charCodeAt(0));
    const tx = Transaction.from(txBytes);
    log("📝 AMM Transaction decoded", 'info');

    const signedTx = await wallet.signTransaction(tx);
    log("✍️ Transaction signed", 'success');

    const sig = await connection.sendRawTransaction(signedTx.serialize(), {
      skipPreflight: true,
      preflightCommitment: 'confirmed'
    });
    log("Sent tx: " + sig, 'success');
    logTxSent(sig, data && data.option_token_mint ? data.option_token_mint : null);
    // await connection.confirmTransaction(sig);
    // log("🎉 AMM Pool Created: " + sig);
  } catch (err) {
    console.error("Create AMM error:", err);
    log("❌ Error: " + err.message);
  } finally {
    UI.showLoading(UI.createAmmBtn, false);
    updateOptionMintDropdown();
    UI.updateButtonStates();
  }
}
// 新增：firstAddLiquidity 实现
async function firstAddLiquidity() {
  if (!wallet) {
    UI.showAlert('<i class="fas fa-exclamation-triangle me-2"></i>Please connect your wallet first', 'warning');
    log('❌ Add liquidity blocked: wallet not connected', 'error');
    return;
  }

  const pool_Account = document.getElementById('pool-address').value.trim();
  const amountA = parseFloat(document.getElementById('add-amount-a').value);
  const amountB = parseFloat(document.getElementById('add-amount-b').value);

  if (!isValidSolanaAddress(pool_Account)) {
    UI.showAlert('Invalid pool account address', 'danger');
    log('❌ Invalid pool account', 'error');
    return;
  }
  if (isNaN(amountA) || amountA <= 0 || isNaN(amountB) || amountB <= 0) {
    UI.showAlert('Invalid token amounts', 'danger');
    log('❌ Invalid liquidity amounts', 'error');
    return;
  }

  try {
    log(`🌀 Building initial liquidity tx for pool ${pool_Account}`, 'info');
    UI.showLoading(UI.firstAddLiquidityBtn, true);

    const res = await fetch(`${API_BASE}/firstadd`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: wallet.publicKey.toString(),
        pool: pool_Account,
        amount_a: amountA,
        amount_b: amountB
      })
    });

    const data = await res.json();
    console.log("AddLiquidity API Response:", data);
    log("🌀 Building liquidity tx...");

    if (!data.unsigned_tx) {
      log("❌ No unsigned_tx in response");
      return;
    }

    const txBytes = Uint8Array.from(atob(data.unsigned_tx), c => c.charCodeAt(0));
    const tx = Transaction.from(txBytes);

    const signedTx = await wallet.signTransaction(tx);
    log("✍️ Transaction signed");

    const sig = await connection.sendRawTransaction(signedTx.serialize(), {
      skipPreflight: true,
      preflightCommitment: 'confirmed'
    });

    log("Sent tx: " + sig, 'success');
    logTxSent(sig, data && data.option_token_mint ? data.option_token_mint : null);
    // await connection.confirmTransaction(sig);
    // log("🎉 Liquidity Added: " + sig);

  } catch (err) {
    console.error("Add liquidity error:", err);
    log("❌ Error: " + err.message);
  } finally {
    UI.showLoading(UI.firstAddLiquidityBtn, false);
    updateOptionMintDropdown();
    UI.updateButtonStates();
  }
}

function initSwapUI() {
  const btn = document.getElementById('swap-toggle-btn');
  const aEl = document.getElementById('swap-mint-a');
  const bEl = document.getElementById('swap-mint-b');
  // const hidden = document.getElementById('swap-direction');
  // if (!btn || !hidden) return;

  // // 确保 hidden 有合法初始值
  // if (hidden.value !== 'true' && hidden.value !== 'false') hidden.value = 'true';
  // btn.setAttribute('aria-pressed', hidden.value === 'false' ? 'true' : 'false');

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    // 视觉类切换
    btn.classList.toggle('swapped');

    // // 反转隐藏值（true <-> false）
    // hidden.value = hidden.value === 'true' ? 'false' : 'true';

    // 交换显示文本（如果元素存在）
    if (aEl && bEl) {
      const ta = aEl.textContent;
      aEl.textContent = bEl.textContent;
      bEl.textContent = ta;
    }

    // 更新无障碍/提示
    // btn.setAttribute('aria-pressed', hidden.value === 'false' ? 'true' : 'false');
    // btn.title = hidden.value === 'true' ? 'Toggle swap direction (A → B)' : 'Toggle swap direction (B → A)';
  });

  // 支持键盘操作
  btn.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      btn.click();
    }
  });
}

// 新增：Swap 处理函数
async function swapAction() {
  if (!wallet) {
    UI.showAlert && UI.showAlert('Connect wallet first', 'warning');
    return;
  }

  const pool = document.getElementById('swap-pool').value.trim();
  const amountIn = parseFloat(document.getElementById('swap-amount').value);
  const aToB = document.getElementById('swap-direction').value === 'true';

  if (!isValidSolanaAddress(pool)) {
    UI.showAlert && UI.showAlert('Invalid pool account address', 'danger');
    log('❌ Invalid pool account for swap', 'error');
    return;
  }
  if (isNaN(amountIn) || amountIn <= 0) {
    UI.showAlert && UI.showAlert('Invalid amount for swap', 'danger');
    log('❌ Invalid swap amount', 'error');
    return;
  }

  try {
    log(`💱 Preparing swap: pool=${pool} amount=${amountIn} a_to_b=${aToB}`, 'info');
    UI.showLoading && UI.showLoading(UI.swapBtn, true);

    const res = await fetch(`${API_BASE}/swap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: wallet.publicKey.toString(),
        pool: pool,
        amount_in: amountIn,
        a_to_b: aToB
      })
    });

    const data = await res.json();
    console.log("Swap API Response:", data);
    log("💱 Preparing swap transaction...");

    if (!data.unsigned_tx) {
      log("❌ No unsigned_tx in response");
      return;
    }

    // Base64 → Uint8Array
    const txBytes = Uint8Array.from(atob(data.unsigned_tx), (c) => c.charCodeAt(0));
    const tx = Transaction.from(txBytes);

    log("📝 Swap Transaction decoded");

    // 钱包签名
    const signedTx = await wallet.signTransaction(tx);
    log("✍️ Transaction signed");

    // 上链广播
    const sig = await connection.sendRawTransaction(signedTx.serialize(), {
      skipPreflight: true,
      preflightCommitment: 'confirmed'
    });

    log("✅ Sent tx: " + sig);
    logTxSent(sig, data && data.option_token_mint ? data.option_token_mint : null);
    // await connection.confirmTransaction(sig);
    // log("🎉 Swap Confirmed: " + sig);

  } catch (err) {
    console.error("Swap error:", err);
    log("❌ Error: " + err.message);
  } finally {
    UI.showLoading(UI.swapBtn, false);
    updateOptionMintDropdown();
    UI.updateButtonStates();
  }
}

async function parsePoolAccount() {
  const poolAccount = document.getElementById('pool-account').value.trim();
  console.log("Parsing pool account:", poolAccount);
  if (!isValidSolanaAddress(poolAccount)) {
    UI.showAlert && UI.showAlert('Invalid pool account address', 'danger');
    log('❌ Invalid pool account for parsing', 'error');
    return;
  }

  try {
    log(`🔍 Fetching pool info for account: ${poolAccount}`, 'info');
    const res = await fetch(`${API_BASE}/pool/parser`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pool_account: poolAccount })
    });

    const data = await res.json();
    console.log("Pool Parser API Response:", data);
    // 填充页面字段（确保这些 id 在 index.html 中存在）
    const setText = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value != null ? String(value) : '';
    };

    setText('pp-creator', data.creator || '');
    setText('pp-token-a-mint', data.mint_a || '');
    setText('pp-token-b-mint', data.mint_b || '');
    setText('pp-expiration', data.expiration_human || '');

    // —— 新增：把解析结果同步到 Swap 区域 —— //
    // swap-mint-a 显示 mint_a
    const swapA = document.getElementById('swap-mint-a');
    if (swapA) swapA.textContent = data.mint_a || '';

    // swap-mint-b 显示 mint_b
    const swapB = document.getElementById('swap-mint-b');
    if (swapB) swapB.textContent = data.mint_b || '';

    // swap-pool input 填入 data.creator（若无则回退为解析的 poolAccount）
    const swapPoolInput = document.getElementById('swap-pool');
    if (swapPoolInput) swapPoolInput.value = poolAccount || '';

    // 显示结果区域（默认可能已显示）
    const resultBox = document.getElementById('pool-parser-result');
    if (resultBox) resultBox.style.display = 'block';


    log(`Pool parsed: ${poolAccount}`, 'success');
  } catch (error) {
    console.error('Error fetching pool info:', error);
  } finally {
    UI.showLoading && UI.showLoading(UI.poolParserBtn, false);
    UI.updateButtonStates();
    updateOptionMintDropdown();
  }
}

// ========= 新增函数：parseOptionMint ============
async function parseOptionAccount() {
  const input = document.getElementById('option-mint-input');
  const mint = input ? input.value.trim() : '';
  if (!mint) { UI.showAlert && UI.showAlert('Please enter Option Mint', 'warning'); return; }
  if (!isValidSolanaAddress(mint)) { UI.showAlert && UI.showAlert('Invalid option mint address', 'danger'); return; }

  // 显示 loading
  if (UI.optionParserBtn) UI.showLoading(UI.optionParserBtn, true);
  try {
    log(`🔍 Fetching option info for: ${mint}`, 'info');
    const res = await fetch(`${API_BASE}/option/parser`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ option_mint: mint })
    });
    if (!res.ok) throw new Error(`Parser API returned ${res.status}`);
    const d = await res.json();
    console.log('Option Parser API Response:', d);

    const setText = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = v != null ? String(v) : '';
    };

    setText('op-creator', d.creator || '');
    setText('op-underlying', d.underlying_mint || '');
    setText('op-quote', d.quote_mint || '');
    setText('op-option-mint', d.option_mint || mint);
    setText('op-expiration', d.expiration_human || '');
    setText('op-contract-size', d.contract_size_human || d.contract_size || '');
    setText('op-strike-price', d.strike_price_human || d.strike_price || '');
    setText('op-total-supply', d.total_supply != null ? String(d.total_supply) : '');

    const box = document.getElementById('option-parser-result');
    if (box) box.style.display = 'block';
    log(`Parsed option: ${mint}`, 'success');

    // 可选：将 underlying/quote/option_mint 填回 create 表单或 datalist
    if (d.underlying_mint && !optionMintList.includes(d.option_mint || mint)) {
      // 不自动 push option mint 到 optionMintList，除非你需要
    }
  } catch (err) {
    console.error('Option parser error:', err);
    UI.showAlert && UI.showAlert(`Parse failed: ${err.message || err}`, 'danger');
    log(`Option parser error: ${err.message || err}`, 'error');
  } finally {
    if (UI.optionParserBtn) UI.showLoading(UI.optionParserBtn, false);
    UI.updateButtonStates();
    updateOptionMintDropdown();
  }
}

async function reclaimOption() {
  const input = document.getElementById('reclaim-option-mint');
  const btn = document.getElementById('reclaim-btn');
  const resultBox = document.getElementById('reclaim-result');
  const unsignedEl = document.getElementById('reclaim-unsigned-tx');

  if (!input) return;
  const optionMint = input.value.trim();
  if (!optionMint) { UI.showAlert && UI.showAlert('Please enter Option Mint', 'warning'); return; }
  if (!isValidSolanaAddress(optionMint)) { UI.showAlert && UI.showAlert('Invalid option mint address', 'danger'); return; }

  // 确定 reclaimer：优先使用已连接钱包地址
  let reclaimer = (wallet && wallet.publicKey) ? wallet.publicKey.toString() : null;
  // 若页面显示 walletAddress，则尝试读取
  if (!reclaimer) {
    const wa = document.getElementById('wallet-address');
    if (wa && wa.textContent) reclaimer = wa.textContent.trim();
  }

  // 若仍没有，提示用户输入（也可以允许后端使用空 reclaimer，根据后端要求）
  if (!reclaimer) {
    const p = prompt('Please enter reclaimer public key (or cancel to let server handle):');
    if (!p) {
      UI.showAlert && UI.showAlert('No reclaimer specified, cancelled', 'warning');
      return;
    }
    if (!isValidSolanaAddress(p)) { UI.showAlert && UI.showAlert('Reclaimer address is invalid', 'danger'); return; }
    reclaimer = p;
  }

  try {
    if (btn && UI.showLoading) UI.showLoading(btn, true);
    log(`🔍 Requesting reclaim unsigned tx for ${optionMint}`, 'info');

    const res = await fetch(`${API_BASE}/reclaim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reclaimer, option_mint: optionMint })
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => '<no body>');
      throw new Error(`Server returned ${res.status}: ${txt}`);
    }

    const data = await res.json();
    console.log('Reclaim API Response:', data);

    if (!data.unsigned_tx) {
      log("No unsigned_tx in response", 'error');
      return;
    }

    // Base64 → Uint8Array
    const txBytes = Uint8Array.from(atob(data.unsigned_tx), (c) => c.charCodeAt(0));
    const tx = Transaction.from(txBytes);

    log("📝 Reclaim decoded");

    // 钱包签名
    const signedTx = await wallet.signTransaction(tx);
    log("✍️ Transaction signed");

    // 上链广播
    const sig = await connection.sendRawTransaction(signedTx.serialize(), {
      skipPreflight: true,
      preflightCommitment: 'confirmed'
    });

    log("✅ Sent tx: " + sig);
    logTxSent(sig);

    // if (unsignedEl) unsignedEl.textContent = data.unsigned_tx || JSON.stringify(data, null, 2);
    // if (resultBox) resultBox.style.display = 'block';
    // UI.showAlert && UI.showAlert('Reclaim unsigned tx received', 'success');
    log('Reclaim unsigned tx received', 'success');
  } catch (err) {
    console.error('Reclaim error:', err);
    UI.showAlert && UI.showAlert(`Reclaim failed: ${err.message || err}`, 'danger');
    log(`Reclaim error: ${err.message || err}`, 'error');
  } finally {
    if (btn && UI.showLoading) UI.showLoading(btn, false);
    UI.updateButtonStates();
    updateOptionMintDropdown();
  }
}

async function airdropAction() {
  //先进行空投

  const btn = document.getElementById('airdrop-btn');
  const spinner = document.getElementById('airdrop-spinner');
  // 优先使用已连接钱包地址作为接收者
  let user = (wallet && wallet.publicKey) ? wallet.publicKey.toString() : null;
  if (!user) {
    user = prompt('Please enter the recipient public key for the airdrop:');
    if (!user) return;
  }
  if (!isValidSolanaAddress(user)) {
    UI.showAlert && UI.showAlert('Invalid Solana address', 'danger');
    log('❌ Airdrop attempt with invalid address', 'error');
    return;
  }

  try {
    if (UI.showLoading) UI.showLoading(btn, true);
    // 先调用 Devnet RPC requestAirdrop 接口
    // log(`🔔 Calling RPC requestAirdrop for ${user}`, 'info');
    // const rpcRes = await fetch('https://api.devnet.solana.com', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     jsonrpc: '2.0',
    //     id: 1,
    //     method: 'requestAirdrop',
    //     params: [
    //       user,
    //       1000000000,
    //       { commitment: 'finalized' }
    //     ]
    //   })
    // });

    // if (!rpcRes.ok) {
    //   const txt = await rpcRes.text().catch(() => '<no body>');
    //   throw new Error(`RPC returned ${rpcRes.status}: ${txt}`);
    // }
    // const rpcData = await rpcRes.json();
    // if (rpcData.error) throw new Error(rpcData.error.message || JSON.stringify(rpcData.error));
    // log(`RPC airdrop tx sig: ${rpcData.result}`, 'success');

    log(`🔔 Requesting airdrop for ${user}`, 'info');

    const res = await fetch(`${API_BASE}/airdrop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user })
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => '<no body>');
      throw new Error(`Server returned ${res.status}: ${txt}`);
    }

    const data = await res.json();
    console.log('Airdrop response:', data);


    UI.showAlert && UI.showAlert('Airdrop requested successfully', 'success');
    log(`Airdrop requested: ${JSON.stringify(data)}`, 'success');
  } catch (err) {
    console.error('Airdrop error:', err);
    UI.showAlert && UI.showAlert(`Airdrop failed: ${err.message || err}`, 'danger');
    log(`❌ Airdrop error: ${err.message || err}`, 'error');
  } finally {
    if (UI.showLoading) UI.showLoading(btn, false);
  }
}

async function depositAAction() {
  if (!wallet) {
    UI.showAlert('Please connect your wallet first', 'warning');
    return;
  }

  const btn = document.getElementById('deposit-a-btn');
  const pool = document.getElementById('deposit-pool').value.trim();
  const depositRaw = Number(document.getElementById('deposit-amount-a').value);

  if (!isValidSolanaAddress(pool)) {
    UI.showAlert('Invalid pool account address', 'danger');
    log('❌ Invalid pool account for deposit', 'error');
    return;
  }
  if (isNaN(depositRaw) || depositRaw <= 0) {
    UI.showAlert('Invalid deposit amount', 'danger');
    log('❌ Invalid deposit amount', 'error');
    return;
  }

  try {
    if (UI.showLoading) UI.showLoading(btn, true);
    log(`🔁 Depositing A to pool ${pool}, amount=${depositRaw}`, 'info');

    const payload = {
      provider: wallet.publicKey.toString(),
      pool: pool,
      deposit_a: depositRaw
    };

    const res = await fetch(`${API_BASE}/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => '<no body>');
      throw new Error(`Server returned ${res.status}: ${txt}`);
    }

    const data = await res.json();
    console.log('Deposit API response:', data);

    // 若后端返回 unsigned_tx，则按通用流程签名并发送
    if (data.unsigned_tx) {
      const txBytes = Uint8Array.from(atob(data.unsigned_tx), c => c.charCodeAt(0));
      const tx = Transaction.from(txBytes);
      log('📝 Deposit transaction decoded', 'info');

      const signedTx = await wallet.signTransaction(tx);
      log('✍️ Transaction signed', 'success');

      const sig = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: true,
        preflightCommitment: 'confirmed'
      });
      log(`Sent tx: ${sig}`, 'success');
      logTxSent(sig);
      // document.getElementById('deposit-a-message').textContent = `Transaction sent: ${sig}`;
    } else {
      // 后端可能直接返回执行结果
      // document.getElementById('deposit-a-message').textContent = `Result: ${JSON.stringify(data)}`;
      log(`Deposit result: ${JSON.stringify(data)}`, 'success');
    }

    // const box = document.getElementById('deposit-a-result');
    // if (box) box.style.display = 'block';
  } catch (err) {
    console.error('Deposit error:', err);
    UI.showAlert && UI.showAlert(`Deposit failed: ${err.message || err}`, 'danger');
    log(`❌ Deposit error: ${err.message || err}`, 'error');
  } finally {
    if (UI.showLoading) UI.showLoading(btn, false);
    UI.updateButtonStates();
    updateOptionMintDropdown();
  }
}
// 更新 Option Mint 下拉列表
function updateOptionMintDropdown() {
  const optionDatalistId = 'option-mint-datalist';
  const poolDatalistId = 'pool-account-datalist';

  // 创建或获取 datalist（option）
  let optionDatalist = document.getElementById(optionDatalistId);
  if (!optionDatalist) {
    optionDatalist = document.createElement('datalist');
    optionDatalist.id = optionDatalistId;
    document.body.appendChild(optionDatalist);
  }

  // 创建或获取 datalist（pool）
  let poolDatalist = document.getElementById(poolDatalistId);
  if (!poolDatalist) {
    poolDatalist = document.createElement('datalist');
    poolDatalist.id = poolDatalistId;
    document.body.appendChild(poolDatalist);
  }

  // 关联各自的 input 到对应 datalist
  const optionInputIds = ['option-mint', 'exercise-option-mint', 'option-mint-input', 'reclaim-option-mint'];
  optionInputIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.setAttribute('list', optionDatalistId);
  });

  const poolInputIds = ['pool-address', 'swap-pool', 'pool-account', 'deposit-pool'];
  poolInputIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.setAttribute('list', poolDatalistId);
  });

  // 填充 option datalist（仅 optionMintList）
  optionDatalist.innerHTML = '';
  (optionMintList || []).forEach(mint => {
    const opt = document.createElement('option');
    opt.value = mint;
    optionDatalist.appendChild(opt);
  });

  // 填充 pool datalist（仅 poolAccountList）
  poolDatalist.innerHTML = '';
  (poolAccountList || []).forEach(pool => {
    const opt = document.createElement('option');
    opt.value = pool;
    poolDatalist.appendChild(opt);
  });
}
// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  UI.init();
  initSwapUI(); // 初始化方向按钮行为

  log("OptMachine DApp initialized", 'success');

  // 从 localStorage 加载 option mint 列表
  const storedMints = localStorage.getItem('optionMintList');
  if (storedMints) {
    optionMintList = JSON.parse(storedMints);
  }
  // 从 localStorage 加载 pool account 列表
  const storedPools = localStorage.getItem('poolAccountList');
  if (storedPools) {
    poolAccountList = JSON.parse(storedPools);
  }
  updateOptionMintDropdown();
  // Check if wallet is already connected
  if (window.solana && window.solana.isConnected) {
    window.solana.connect({ onlyIfTrusted: true })
      .then(resp => {
        wallet = window.solana;
        UI.updateWalletStatus(true, resp.publicKey.toString());
        log(`Auto-connected to wallet: ${resp.publicKey.toString()}`, 'success');
      })
      .catch(err => {
        console.log("Auto-connect failed:", err);
      });
  }
});

