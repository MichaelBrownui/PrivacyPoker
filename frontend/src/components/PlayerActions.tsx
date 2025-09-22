import React, { useState } from 'react';
import type { GameState } from './PokerGame';
import type { FhevmInstance } from '@zama-fhe/relayer-sdk/bundle';
import '../styles/PlayerActions.css';

interface PlayerActionsProps {
  gameState: GameState;
  instance: FhevmInstance | null;
  onPlayerAction: (action: number, encryptedAmount: string, inputProof: string) => Promise<void>;
  onEndGame: () => Promise<void>;
}

export const PlayerActions: React.FC<PlayerActionsProps> = ({
  gameState,
  instance,
  onPlayerAction,
  onEndGame
}) => {
  const [betAmount, setBetAmount] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handleAction = async (action: number) => {
    if (!instance) {
      alert('Zama instance not initialized');
      return;
    }

    setIsProcessing(true);

    try {
      let encryptedAmount = '0x0000000000000000000000000000000000000000000000000000000000000000';
      let inputProof = '0x';

      // For raise action, encrypt the bet amount
      if (action === 2) { // Raise
        if (!betAmount || isNaN(Number(betAmount)) || Number(betAmount) <= 0) {
          alert('Please enter a valid bet amount');
          setIsProcessing(false);
          return;
        }

        // Create encrypted input for the bet amount
        const input = instance.createEncryptedInput(
          '0xaD15e9Fb1f2bbbFAb9D48DdE7DFEEC1Aa54571F1', // Contract address
          gameState.gameOwner // User address - simplified, should be current user
        );

        input.add32(BigInt(Number(betAmount)));
        const encryptedInput = await input.encrypt();

        encryptedAmount = encryptedInput.handles[0] as unknown as string;
        inputProof = `0x${Buffer.from(encryptedInput.inputProof as Uint8Array).toString('hex')}`;
      }

      await onPlayerAction(action, encryptedAmount, inputProof);
      setBetAmount('');
    } catch (error) {
      console.error('Error performing action:', error);
      alert('Failed to perform action');
    } finally {
      setIsProcessing(false);
    }
  };


  const canPerformAction = (): boolean => {
    return gameState.isActivePlayer && !gameState.hasFolded && !isProcessing;
  };

  return (
    <div className="player-actions">
      <div className="actions-header">
        <h3>Your Actions</h3>
        {gameState.isActivePlayer ? (
          <span className="turn-indicator active">Your Turn</span>
        ) : (
          <span className="turn-indicator waiting">
            {gameState.hasFolded ? 'You have folded' : 'Waiting for other players'}
          </span>
        )}
      </div>

      <div className="actions-content">
        {canPerformAction() ? (
          <div className="action-buttons">
            <button
              onClick={() => handleAction(0)}
              className="action-button fold-button"
              disabled={isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Fold'}
            </button>

            <button
              onClick={() => handleAction(1)}
              className="action-button call-button"
              disabled={isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Call (0.001 ETH)'}
            </button>

            <div className="raise-section">
              <input
                type="number"
                placeholder="Bet amount (ETH)"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                className="bet-input"
                disabled={isProcessing}
                min="1"
                step="1"
              />
              <button
                onClick={() => handleAction(2)}
                className="action-button raise-button"
                disabled={isProcessing || !betAmount}
              >
                {isProcessing ? 'Processing...' : 'Raise'}
              </button>
            </div>
          </div>
        ) : (
          <div className="waiting-actions">
            {gameState.hasFolded ? (
              <p>You have folded and are out of this round.</p>
            ) : (
              <p>Wait for your turn to make an action.</p>
            )}
          </div>
        )}

        {gameState.isGameOwner && (
          <div className="owner-actions">
            <h4>Game Owner Actions</h4>
            <button
              onClick={onEndGame}
              className="action-button end-game-button"
              disabled={isProcessing}
            >
              {isProcessing ? 'Processing...' : 'End Game'}
            </button>
          </div>
        )}
      </div>

      <div className="action-help">
        <h4>Action Guide</h4>
        <ul>
          <li><strong>Fold:</strong> Give up your hand and exit the round</li>
          <li><strong>Call:</strong> Match the current bet (0.001 ETH)</li>
          <li><strong>Raise:</strong> Increase the bet by the amount you specify</li>
        </ul>
      </div>

      <div className="encryption-info">
        <div className="info-box">
          <h4>🔒 Privacy Protection</h4>
          <p>Your bet amounts are encrypted using Zama FHE technology. Other players cannot see your exact bet amounts until the end of the game.</p>
        </div>
      </div>
    </div>
  );
};