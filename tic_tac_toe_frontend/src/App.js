import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

/**
 * UTILITY — Backend URL for API calls
 * You might want to set this depending on deployment/dev environment.
 * Change to e.g. "/api" or use environment variable in a real setup.
 */
const BACKEND_BASE_URL = process.env.REACT_APP_TTT_BACKEND_URL || 'http://localhost:5000';

/**
 * PUBLIC_INTERFACE
 * Fetches the current game state from the backend.
 * @returns {Promise<Object>} The game state object.
 */
async function fetchGameState() {
  const res = await fetch(`${BACKEND_BASE_URL}/game`, { credentials: 'same-origin' });
  if (!res.ok) throw new Error('Failed to fetch game state');
  return res.json();
}

/**
 * PUBLIC_INTERFACE
 * Sends a move to the backend.
 * @param {number} row - Row index (0-2)
 * @param {number} col - Col index (0-2)
 * @returns {Promise<Object>} The updated game state.
 */
async function makeMove(row, col) {
  const res = await fetch(`${BACKEND_BASE_URL}/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ row, col })
  });
  if (!res.ok) throw new Error('Invalid move');
  return res.json();
}

/**
 * PUBLIC_INTERFACE
 * Resets/restarts the game on the backend.
 * @returns {Promise<Object>} The new (empty) game state.
 */
async function restartGame() {
  const res = await fetch(`${BACKEND_BASE_URL}/restart`, {
    method: 'POST',
    credentials: 'same-origin'
  });
  if (!res.ok) throw new Error('Failed to restart game');
  return res.json();
}

/**
 * PUBLIC_INTERFACE
 * Tic Tac Toe Game Board Component
 * @param {Object} props
 * @param {string[][]} props.board - 2D array [row][col] of 'X' | 'O' | ''
 * @param {boolean} props.canMove - If current player is allowed to move
 * @param {(row: number, col: number) => void} props.onMove
 * @param {boolean} props.disabled - If board is disabled (end state)
 */
function Board({ board, canMove, onMove, disabled }) {
  return (
    <div className="ttt-board" aria-label="Tic Tac Toe Board" role="grid">
      {board.map((rowArr, row) => (
        <div className="ttt-row" key={row} role="row">
          {rowArr.map((cell, col) => (
            <button
              key={col}
              className={`ttt-cell${cell ? ' filled' : ''}`}
              aria-label={`Row ${row + 1} Col ${col + 1}${cell ? `, ${cell}` : ''}`}
              disabled={!!cell || disabled || !canMove}
              onClick={() => onMove(row, col)}
              tabIndex={0}
              role="gridcell"
            >
              {cell}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * PUBLIC_INTERFACE
 * Main App Component.
 * Controls theming, game state, and UI.
 */
function App() {
  // Theme management
  const [theme, setTheme] = useState('light');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Game state
  const [game, setGame] = useState(null); // null | {board, current_player, winner, draw, ...}
  const [loading, setLoading] = useState(true);
  const [moveError, setMoveError] = useState('');
  const [polling, setPolling] = useState(true);

  // Fetch game state (once, and periodically)
  const pollGameState = useCallback(() => {
    setLoading(true);
    fetchGameState()
      .then(data => {
        setGame(data);
        setMoveError('');
        setLoading(false);
      })
      .catch(err => {
        setMoveError('Could not fetch game state');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    pollGameState();
    if (polling) {
      const timer = setInterval(pollGameState, 1200); // 1.2 sec polling
      return () => clearInterval(timer);
    }
  }, [polling, pollGameState]);

  // Make a move
  const handleMove = (row, col) => {
    setMoveError('');
    makeMove(row, col)
      .then(newState => {
        setGame(newState);
        setMoveError('');
      })
      .catch(() => {
        setMoveError('Invalid move – Try again!');
      });
  };

  // Restart game
  const handleRestart = () => {
    setMoveError('');
    restartGame()
      .then(newState => {
        setGame(newState);
        setMoveError('');
      })
      .catch(() => {
        setMoveError('Could not restart game');
      });
  };

  // Mechanism for pausing polling when game ends (win/draw), resume on restart:
  useEffect(() => {
    if (game && (game.winner || game.draw)) setPolling(false);
    else setPolling(true);
  }, [game]);

  // Status helper
  function renderStatus() {
    if (!game) return null;
    if (game.winner)
      return <div className="ttt-status win">🎉 Player <b>{game.winner}</b> wins!</div>;
    if (game.draw)
      return <div className="ttt-status draw">🤝 Draw Game!</div>;
    return (
      <div className="ttt-status turn">
        Player <span className={`player player-${game.current_player}`}>{game.current_player}</span>'s turn
      </div>
    );
  }

  // Board config
  const board = game?.board || [
    ['', '', ''],
    ['', '', ''],
    ['', '', ''],
  ];
  const canMove = !loading && !game?.winner && !game?.draw;

  return (
    <div className="App">
      <header className="App-header">
        <button
          className="theme-toggle"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>

        <div className="ttt-container">
          <h1 className="ttt-title">Tic Tac Toe</h1>
          {renderStatus()}

          {/* GAME BOARD */}
          <Board
            board={board}
            canMove={canMove}
            disabled={loading || !canMove}
            onMove={handleMove}
          />

          {/* Message/Error */}
          {moveError ? (
            <div className="ttt-message error">{moveError}</div>
          ) : null}

          {/* GAME RESTART */}
          <button className="ttt-restart-btn" onClick={handleRestart}>
            Restart Game
          </button>
        </div>
      </header>
    </div>
  );
}

export default App;
