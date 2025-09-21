# 🃏 Privacy Poker

基于Zama FHE(完全同态加密)技术的隐私扑克游戏，实现真正的隐私保护德州扑克体验。

## ✨ 特性

- **🔒 完全隐私**: 所有底牌、下注金额都是加密的，对手无法得知
- **🎲 公平随机**: 使用Zama FHE随机数生成器确保游戏公平性
- **💰 真实价值**: 使用ETH进行游戏，所有交易链上执行
- **🛡️ 防作弊**: 基于区块链的透明规则，无法操纵
- **⚡ 实时体验**: React前端提供流畅的游戏体验

## 🏗️ 技术架构

### 智能合约
- **框架**: Hardhat + TypeScript
- **加密库**: Zama FHEVM Solidity
- **网络**: Sepolia Testnet (支持本地测试)

### 前端
- **框架**: React + TypeScript + Vite
- **钱包**: RainbowKit + wagmi + viem
- **加密**: Zama Relayer SDK
- **样式**: 原生CSS (无TailwindCSS)

## 🚀 快速开始

### 1. 环境准备

```bash
# 克隆项目
git clone <repository-url>
cd PrivacyPoker

# 安装依赖
npm install

# 安装前端依赖
npm run frontend:install
```

### 2. 配置环境变量

```bash
# 设置Hardhat变量
npx hardhat vars setup

# 需要设置的变量：
# MNEMONIC: 您的钱包助记词
# INFURA_API_KEY: Infura API密钥
# ETHERSCAN_API_KEY: Etherscan API密钥 (可选，用于验证合约)
```

### 3. 编译和测试

```bash
# 编译智能合约
npm run compile

# 运行测试
npm test

# 运行演示脚本
npm run demo
```

### 4. 部署合约

```bash
# 部署到本地网络
npm run deploy:local

# 部署到Sepolia测试网
npm run deploy:sepolia
```

### 5. 启动前端

```bash
# 开发模式启动前端
npm run frontend:dev

# 构建前端
npm run frontend:build
```

## 🎮 游戏说明

### 游戏流程

1. **创建游戏**: 部署PrivacyPoker合约
2. **玩家加入**: 支付ante(盲注)加入游戏 (2-6人)
3. **开始游戏**: 游戏创建者开始游戏，系统发放底牌
4. **公共牌**: 分三轮发放5张公共牌
5. **玩家行动**: 加密下注(弃牌/跟注/加注)
6. **结算**: 游戏结束，获胜者获得奖池

### 隐私保护

- **底牌**: 每位玩家的2张底牌完全加密
- **下注**: 所有下注金额都是加密的
- **余额**: 玩家余额始终保密
- **随机性**: FHE随机数确保发牌公平

## 📋 任务命令

### 合约操作

```bash
# 获取游戏信息
npx hardhat privacy-poker:game-info --contract 0x...

# 加入游戏
npx hardhat privacy-poker:join-game --contract 0x... --ante 0.01

# 开始游戏 (仅owner)
npx hardhat privacy-poker:start-game --contract 0x...

# 发放公共牌
npx hardhat privacy-poker:deal-cards --contract 0x...

# 玩家行动
npx hardhat privacy-poker:player-action --contract 0x... --action 0 # 弃牌
npx hardhat privacy-poker:player-action --contract 0x... --action 1 # 跟注  
npx hardhat privacy-poker:player-action --contract 0x... --action 2 --amount 20 # 加注

# 结束游戏
npx hardhat privacy-poker:end-game --contract 0x...

# 查看余额
npx hardhat privacy-poker:get-balance --contract 0x...
```

### 开发命令

```bash
# 代码检查
npm run lint

# 格式化代码  
npm run prettier:write

# 清理构建文件
npm run clean

# 生成类型
npm run typechain
```

## 📁 项目结构

```
PrivacyPoker/
├── contracts/           # 智能合约
│   ├── PrivacyPoker.sol # 主游戏合约
│   └── FHECounter.sol   # 示例合约
├── deploy/              # 部署脚本
├── tasks/               # Hardhat任务
├── test/                # 测试文件
├── scripts/             # 工具脚本
├── frontend/            # React前端
│   ├── src/
│   │   ├── components/  # React组件
│   │   ├── hooks/       # 自定义Hooks
│   │   ├── utils/       # 工具函数
│   │   └── types/       # TypeScript类型
│   └── package.json
└── docs/                # 文档
```

## 📄 License

This project is licensed under the BSD-3-Clause-Clear License. See the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/zama-ai/fhevm/issues)
- **Documentation**: [FHEVM Docs](https://docs.zama.ai)
- **Community**: [Zama Discord](https://discord.gg/zama)

---

**Built with ❤️ by the Zama team**
