import React from 'react';
import type { GameState } from './PokerGame';
import '../styles/GameLobby.css';

interface GameLobbyProps {
  gameState: GameState;
  onJoinGame: () => Promise<void>;
  onStartGame: () => Promise<void>;
}

export const GameLobby: React.FC<GameLobbyProps> = ({
  gameState,
  onJoinGame,
  onStartGame
}) => {
  const ANTE_AMOUNT = 0.001; // ETH amount required to join
  const MAX_PLAYERS = 6;
  const MIN_PLAYERS = 2;

  return (
    <div className="game-lobby">
      <div className="lobby-header">
        <h1>Privacy Poker Lobby</h1>
        <p>Encrypted Texas Hold'em on the blockchain</p>
      </div>

      <div className="game-info">
        <div className="game-details">
          <h3>Game Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="label">Game ID:</span>
              <span className="value">{gameState.gameId}</span>
            </div>
            <div className="info-item">
              <span className="label">Players:</span>
              <span className="value">{gameState.playerCount}/{MAX_PLAYERS}</span>
            </div>
            <div className="info-item">
              <span className="label">Ante Amount:</span>
              <span className="value">{ANTE_AMOUNT} ETH</span>
            </div>
            <div className="info-item">
              <span className="label">Game Owner:</span>
              <span className="value address">{gameState.gameOwner}</span>
            </div>
          </div>
        </div>

        <div className="player-status">
          <h3>Your Status</h3>
          <div className="status-content">
            {gameState.hasJoined ? (
              <div className="joined-status">
                <div className="status-badge joined">✓ Joined</div>
                <p>Waiting for {gameState.isGameOwner ? 'you to start' : 'game owner to start'} the game...</p>
                <p>Minimum {MIN_PLAYERS} players required to start.</p>
              </div>
            ) : (
              <div className="not-joined-status">
                <div className="status-badge not-joined">Not Joined</div>
                <p>Join the game to participate. You'll need to pay the ante amount of {ANTE_AMOUNT} ETH.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="lobby-actions">
        {!gameState.hasJoined && (
          <button
            onClick={onJoinGame}
            className="join-button"
            disabled={gameState.playerCount >= MAX_PLAYERS}
          >
            {gameState.playerCount >= MAX_PLAYERS ? 'Game Full' : `Join Game (${ANTE_AMOUNT} ETH)`}
          </button>
        )}

        {gameState.hasJoined && gameState.isGameOwner && (
          <button
            onClick={onStartGame}
            className="start-button"
            disabled={gameState.playerCount < MIN_PLAYERS}
          >
            {gameState.playerCount < MIN_PLAYERS
              ? `Need ${MIN_PLAYERS - gameState.playerCount} more players`
              : 'Start Game'
            }
          </button>
        )}

        {gameState.hasJoined && !gameState.isGameOwner && (
          <div className="waiting-message">
            <p>Waiting for game owner to start the game...</p>
            <div className="loading-dots">
              <span>.</span>
              <span>.</span>
              <span>.</span>
            </div>
          </div>
        )}
      </div>

      <div className="game-rules">
        <h3>Game Rules</h3>
        <ul>
          <li>Texas Hold'em rules apply</li>
          <li>All cards are encrypted using Zama FHE technology</li>
          <li>Your cards remain private throughout the game</li>
          <li>Ante: {ANTE_AMOUNT} ETH per player</li>
          <li>2-{MAX_PLAYERS} players per game</li>
          <li>Winner takes the entire pot</li>
        </ul>
      </div>
    </div>
  );
};