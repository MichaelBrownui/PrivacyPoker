// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, euint8, ebool, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Privacy Poker - 基于Zama FHE的加密扑克游戏
/// @author PrivacyPoker
/// @notice 一个保护隐私的德州扑克游戏，使用完全同态加密技术
contract PrivacyPoker is SepoliaConfig {
    // 游戏状态枚举
    enum GameState {
        WaitingForPlayers, // 等待玩家加入
        GameActive, // 游戏进行中
        GameEnded // 游戏结束
    }

    // 玩家下注行为
    enum BetAction {
        Fold, // 弃牌
        Call, // 跟注
        Raise // 加注
    }

    // 游戏配置
    uint8 public constant MAX_PLAYERS = 6;
    uint8 public constant MIN_PLAYERS = 2;
    uint32 public constant ANTE_AMOUNT = 1; // 盲注金额 (0.001 ether)

    // 游戏状态
    GameState public gameState;
    uint8 public playerCount;
    uint8 public activePlayerIndex;
    address public gameOwner;
    uint256 public gameId;

    // 玩家相关
    address[] public players;
    mapping(address => uint8) public playerIndex;
    mapping(address => bool) public hasJoined;
    mapping(address => euint32) public playerBalances;
    mapping(address => euint8) public playerCards1; // 第一张底牌
    mapping(address => euint8) public playerCards2; // 第二张底牌
    mapping(address => euint32) public playerBets; // 当前轮下注金额
    mapping(address => bool) public hasFolded; // 是否已弃牌

    // 公共牌池和奖池
    euint8[] public communityCards; // 公共牌，最多5张
    euint32 public totalPot; // 奖池总金额

    // 随机数生成用的nonce
    uint256 private cardNonce;

    // 事件定义
    event GameCreated(uint256 indexed gameId, address indexed creator);
    event PlayerJoined(address indexed player, uint8 playerIndex);
    event GameStarted(uint256 indexed gameId);
    event CardsDealt();
    event CommunityCardRevealed(uint8 cardIndex);
    event PlayerAction(address indexed player, BetAction action);
    event GameEnded(uint256 indexed gameId, address indexed winner);

    // 修饰符
    modifier onlyGameOwner() {
        require(msg.sender == gameOwner, "Only game owner can call this");
        _;
    }

    modifier onlyPlayer() {
        require(hasJoined[msg.sender], "Only joined players can call this");
        _;
    }

    modifier gameInState(GameState state) {
        require(gameState == state, "Invalid game state for this action");
        _;
    }

    modifier isActivePlayer() {
        require(players[activePlayerIndex] == msg.sender, "Not your turn");
        _;
    }

    constructor() {
        gameOwner = msg.sender;
        gameState = GameState.WaitingForPlayers;
        gameId = block.timestamp;
        cardNonce = 0;

        // 初始化奖池为0
        totalPot = FHE.asEuint32(0);
        FHE.allowThis(totalPot);

        emit GameCreated(gameId, gameOwner);
    }

    /// @notice 玩家加入游戏
    /// @dev 玩家需要支付ante金额加入游戏
    function joinGame() external payable gameInState(GameState.WaitingForPlayers) {
        require(!hasJoined[msg.sender], "Player already joined");
        require(playerCount < MAX_PLAYERS, "Game is full");
        require(msg.value >= ANTE_AMOUNT * 0.001 ether, "Insufficient ante amount");

        // 添加玩家
        players.push(msg.sender);
        hasJoined[msg.sender] = true;
        playerIndex[msg.sender] = playerCount;

        // 初始化玩家余额
        playerBalances[msg.sender] = FHE.asEuint32(uint32(msg.value / 0.001 ether));
        FHE.allowThis(playerBalances[msg.sender]);
        FHE.allow(playerBalances[msg.sender], msg.sender);

        // 初始化玩家下注为ante
        euint32 ante = FHE.asEuint32(ANTE_AMOUNT);
        playerBets[msg.sender] = ante;
        FHE.allowThis(playerBets[msg.sender]);
        FHE.allow(playerBets[msg.sender], msg.sender);

        // 更新奖池
        totalPot = FHE.add(totalPot, ante);
        FHE.allowThis(totalPot);

        playerCount++;

        emit PlayerJoined(msg.sender, playerCount - 1);
    }

    /// @notice 开始游戏 (只有游戏创建者可以调用)
    function startGame() external onlyGameOwner gameInState(GameState.WaitingForPlayers) {
        require(playerCount >= MIN_PLAYERS, "Not enough players");

        gameState = GameState.GameActive;
        activePlayerIndex = 0;

        // 为每个玩家发放底牌
        _dealPlayerCards();

        emit GameStarted(gameId);
        emit CardsDealt();
    }

    /// @notice 发放公共牌
    /// @dev 按德州扑克规则，分三轮发放：翻牌圈(3张)、转牌圈(1张)、河牌圈(1张)
    function dealCommunityCards() external onlyGameOwner gameInState(GameState.GameActive) {
        require(communityCards.length < 5, "All community cards already dealt");

        uint8 cardsToDeal;
        if (communityCards.length == 0) {
            cardsToDeal = 3; // 翻牌圈
        } else {
            cardsToDeal = 1; // 转牌圈或河牌圈
        }

        for (uint8 i = 0; i < cardsToDeal; i++) {
            euint8 newCard = _generateRandomCard();
            communityCards.push(newCard);
            FHE.allowThis(newCard);

            emit CommunityCardRevealed(uint8(communityCards.length - 1));
        }
    }

    /// @notice 玩家下注行动
    /// @param action 下注行为 (弃牌/跟注/加注)
    /// @param encryptedAmount 加密的下注金额 (仅在加注时需要)
    /// @param inputProof 输入证明
    function playerAction(
        BetAction action,
        externalEuint32 encryptedAmount,
        bytes calldata inputProof
    ) external onlyPlayer isActivePlayer gameInState(GameState.GameActive) {
        require(!hasFolded[msg.sender], "Player has already folded");

        if (action == BetAction.Fold) {
            // 弃牌
            hasFolded[msg.sender] = true;
        } else if (action == BetAction.Call) {
            // 跟注 - 这里简化处理，假设跟注金额固定
            euint32 callAmount = FHE.asEuint32(ANTE_AMOUNT);
            _processBet(callAmount);
        } else if (action == BetAction.Raise) {
            // 加注
            euint32 raiseAmount = FHE.fromExternal(encryptedAmount, inputProof);
            _processBet(raiseAmount);
        }

        emit PlayerAction(msg.sender, action);

        // 移动到下一个活跃玩家
        _nextPlayer();
    }

    /// @notice 结束游戏并分配奖池
    /// @dev 这里简化处理，假设有胜负判定逻辑
    function endGame() external onlyGameOwner gameInState(GameState.GameActive) {
        gameState = GameState.GameEnded;

        // 简化的胜负判定：选择第一个未弃牌的玩家作为胜者
        address winner = address(0);
        for (uint8 i = 0; i < playerCount; i++) {
            if (!hasFolded[players[i]]) {
                winner = players[i];
                break;
            }
        }

        require(winner != address(0), "No winner found");

        // 将奖池分配给获胜者
        playerBalances[winner] = FHE.add(playerBalances[winner], totalPot);
        FHE.allowThis(playerBalances[winner]);
        FHE.allow(playerBalances[winner], winner);

        // 重置奖池
        totalPot = FHE.asEuint32(0);
        FHE.allowThis(totalPot);

        emit GameEnded(gameId, winner);
    }

    /// @notice 获取玩家余额
    function getPlayerBalance() external view onlyPlayer returns (euint32) {
        return playerBalances[msg.sender];
    }

    /// @notice 获取玩家底牌
    function getPlayerCards() external view onlyPlayer returns (euint8, euint8) {
        return (playerCards1[msg.sender], playerCards2[msg.sender]);
    }

    /// @notice 获取公共牌数量
    function getCommunityCardCount() external view returns (uint256) {
        return communityCards.length;
    }

    /// @notice 获取特定索引的公共牌
    function getCommunityCard(uint8 index) external view returns (euint8) {
        require(index < communityCards.length, "Card index out of bounds");
        return communityCards[index];
    }

    /// @notice 获取奖池总额
    function getTotalPot() external view returns (euint32) {
        return totalPot;
    }

    // 内部函数：为玩家发放底牌
    function _dealPlayerCards() internal {
        for (uint8 i = 0; i < playerCount; i++) {
            address player = players[i];

            // 生成两张随机底牌
            playerCards1[player] = _generateRandomCard();
            playerCards2[player] = _generateRandomCard();

            // 设置权限
            FHE.allowThis(playerCards1[player]);
            FHE.allow(playerCards1[player], player);
            FHE.allowThis(playerCards2[player]);
            FHE.allow(playerCards2[player], player);
        }
    }

    // 内部函数：生成随机卡牌 (1-52)
    function _generateRandomCard() internal returns (euint8) {
        cardNonce++;
        // 使用Zama的随机数生成，范围1-52
        euint8 card = FHE.randEuint8();
        // 将随机数映射到1-52的范围
        return FHE.rem(card, 52);
    }

    // 内部函数：处理玩家下注
    function _processBet(euint32 betAmount) internal {
        // 检查玩家余额是否足够
        ebool hasSufficientFunds = FHE.ge(playerBalances[msg.sender], betAmount);

        // 条件性扣除余额
        euint32 actualBet = FHE.select(hasSufficientFunds, betAmount, FHE.asEuint32(0));
        playerBalances[msg.sender] = FHE.sub(playerBalances[msg.sender], actualBet);

        // 更新玩家当前下注
        playerBets[msg.sender] = FHE.add(playerBets[msg.sender], actualBet);

        // 更新奖池
        totalPot = FHE.add(totalPot, actualBet);

        // 设置权限
        FHE.allowThis(playerBalances[msg.sender]);
        FHE.allow(playerBalances[msg.sender], msg.sender);
        FHE.allowThis(playerBets[msg.sender]);
        FHE.allow(playerBets[msg.sender], msg.sender);
        FHE.allowThis(totalPot);
    }

    // 内部函数：移动到下一个活跃玩家
    function _nextPlayer() internal {
        do {
            activePlayerIndex = (activePlayerIndex + 1) % playerCount;
        } while (hasFolded[players[activePlayerIndex]]);
    }

    /// @notice 允许玩家提取余额
    function withdraw() external onlyPlayer gameInState(GameState.GameEnded) {
        // 这里需要实现解密和提取逻辑
        // 由于涉及到将加密余额转换为实际ETH，需要请求解密
        // 这部分在实际实现中需要使用Zama的解密Oracle
        revert("Withdrawal not implemented - requires decryption oracle");
    }
}
