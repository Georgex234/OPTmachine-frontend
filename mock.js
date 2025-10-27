// 模拟模式 - 用于前端独立测试
// 当后端不可用时，使用模拟数据测试前端功能

const MockAPI = {
  // 模拟后端响应
  async createOption(requestData) {
    console.log("🧪 模拟模式: 创建期权请求", requestData);
    
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 模拟成功响应
    return {
      unsigned_tx: "bW9ja19kYXRhX2Zvcl90ZXN0aW5n", // 模拟的 base64 数据
      option_token_mint: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM" // 模拟的代币地址
    };
  },

  // 检查后端是否可用
  async checkBackendStatus() {
    try {
      const response = await fetch("https://api.optmachine.xyz", { 
        method: 'GET',
        timeout: 3000 
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
};

// 增强的 API 调用函数
async function callCreateAPI(requestData) {
  // 首先检查后端是否可用
  const backendAvailable = await MockAPI.checkBackendStatus();
  
  if (backendAvailable) {
    // 使用真实后端
    console.log("🌐 使用真实后端 API");
    const response = await fetch("https://api.optmachine.xyz/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestData)
    });
    
    if (!response.ok) {
      throw new Error(`后端错误: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } else {
    // 使用模拟模式
    console.log("🧪 后端不可用，使用模拟模式");
    UI.showAlert('🧪 后端服务不可用，当前为模拟模式演示', 'warning');
    return await MockAPI.createOption(requestData);
  }
}

// 模拟钱包交互 (用于演示)
const MockWallet = {
  async signTransaction(transaction) {
    console.log("🧪 模拟钱包签名");
    UI.showAlert('🧪 模拟模式：跳过钱包签名步骤', 'info');
    
    // 模拟签名延迟
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // 返回模拟的签名交易
    return {
      serialize: () => new Uint8Array([1, 2, 3, 4, 5]) // 模拟序列化数据
    };
  }
};

// 模拟区块链交互
const MockConnection = {
  async sendRawTransaction(serializedTx) {
    console.log("🧪 模拟发送交易到区块链");
    UI.showAlert('🧪 模拟模式：跳过区块链广播', 'info');
    
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 返回模拟的交易签名
    return "5j7s8f9w2k3l4m5n6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d1e2f3g4h5i6j7k8l9m0n1p2";
  },
  
  async confirmTransaction(signature) {
    console.log("🧪 模拟确认交易");
    UI.showAlert('🧪 模拟模式：交易已"确认"', 'success');
    
    // 模拟确认延迟
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return { value: { err: null } }; // 模拟成功确认
  }
};

// 导出模拟功能
if (typeof window !== 'undefined') {
  window.MockAPI = MockAPI;
  window.MockWallet = MockWallet;
  window.MockConnection = MockConnection;
  window.callCreateAPI = callCreateAPI;
}
