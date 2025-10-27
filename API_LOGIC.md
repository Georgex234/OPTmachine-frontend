// 前端 API 调用逻辑详解

// 1. 从表单获取用户输入
const strikePrice = parseFloat(document.getElementById("strike-price").value); // 100
const contractSize = parseInt(document.getElementById("contract-size").value); // 1
const expirationDate = document.getElementById("expiration-date").value; // "2024-12-31T23:59"

// 2. 数据处理和验证
const unixExpiration = Math.floor(new Date(expirationDate).getTime() / 1000); // 转为时间戳
const strikePriceInMicroUnits = Math.floor(strikePrice * 1e6); // 转为微单位

// 3. 构建请求体
const requestBody = {
  creator: wallet.publicKey.toString(),                           // 当前连接的钱包地址
  underlying_mint: "7TGGc34BHydnkHtEw2LSGq6FWRbUjzuDsZ1uYuoWK4ND", // 固定的标的资产
  quote_mint: "Fo9qqxhckVQaobFRdLszwy5KnnjzDmdQsWryH5wNPYY8",      // 固定的报价资产
  strike_price: strikePriceInMicroUnits,                          // 行权价格
  unix_expiration: unixExpiration,                                // 到期时间
  contract_size: contractSize                                     // 合约大小
};

// 4. 发送 HTTP 请求
const response = await fetch("http://127.0.0.1:3000/create", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(requestBody)
});

// 5. 处理响应
const data = await response.json();
console.log("API 返回:", data);

// 6. 反序列化交易
const txBytes = Uint8Array.from(atob(data.unsigned_tx), c => c.charCodeAt(0));
const transaction = Transaction.from(txBytes);

// 7. 钱包签名
const signedTx = await wallet.signTransaction(transaction);

// 8. 广播到区块链
const signature = await connection.sendRawTransaction(signedTx.serialize());

// 9. 等待确认
await connection.confirmTransaction(signature);
