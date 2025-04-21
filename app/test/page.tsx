"use client"
import React, { useState } from 'react';

type Piece = '♜' | '♞' | '♝' | '♛' | '♚' | '♝' | '♞' | '♜' | 
             '♟' | '♙' | '♖' | '♘' | '♗' | '♕' | '♔' | '' ;

type Board = Piece[][];
type Position = [number, number];
type Player = 'white' | 'black';
type GameStatus = 'playing' | 'check' | 'checkmate' | 'stalemate';

interface CapturedPieces {
  white: Piece[];
  black: Piece[];
}

interface PieceMoves {
  moves: Position[];
  captures: Position[];
}

interface PieceRules {
  [key: string]: string;
}

const ChessGame: React.FC = () => {
  const initialBoard: Board = [
    ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'],
    ['♟', '♟', '♟', '♟', '♟', '♟', '♟', '♟'],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['♙', '♙', '♙', '♙', '♙', '♙', '♙', '♙'],
    ['♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖']
  ];

  const [board, setBoard] = useState<Board>(initialBoard);
  const [selectedPiece, setSelectedPiece] = useState<Position | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player>('white');
  const [possibleMoves, setPossibleMoves] = useState<Position[]>([]);
  const [captureMoves, setCaptureMoves] = useState<Position[]>([]);
  const [gameMessage, setGameMessage] = useState<string>('');
  const [capturedPieces, setCapturedPieces] = useState<CapturedPieces>({ white: [], black: [] });
  const [gameStatus, setGameStatus] = useState<GameStatus>('playing');

  const pieceRules: PieceRules = {
    '♙': 'Peão: Move-se uma casa para frente. Captura peças na diagonal.',
    '♟': 'Peão: Move-se uma casa para frente. Captura peças na diagonal.',
    '♖': 'Torre: Move-se e captura em linha reta horizontal ou vertical.',
    '♜': 'Torre: Move-se e captura em linha reta horizontal ou vertical.',
    '♘': 'Cavalo: Move-se em "L" e pode pular outras peças.',
    '♞': 'Cavalo: Move-se em "L" e pode pular outras peças.',
    '♗': 'Bispo: Move-se e captura na diagonal.',
    '♝': 'Bispo: Move-se e captura na diagonal.',
    '♕': 'Rainha: Move-se e captura em qualquer direção.',
    '♛': 'Rainha: Move-se e captura em qualquer direção.',
    '♔': 'Rei: Move-se e captura uma casa em qualquer direção.',
    '♚': 'Rei: Move-se e captura uma casa em qualquer direção.'
  };

  const isPieceWhite = (piece: Piece): boolean => {
    return '♔♕♖♗♘♙'.includes(piece);
  };

  const findKing = (isWhite: boolean): Position | null => {
    const kingPiece = isWhite ? '♔' : '♚';
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if (board[row][col] === kingPiece) {
          return [row, col];
        }
      }
    }
    return null;
  };

  const isKingInCheck = (testBoard: Board, isWhiteKing: boolean): boolean => {
    const kingPos = findKing(isWhiteKing);
    if (!kingPos) return false;

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = testBoard[row][col];
        if (piece && isPieceWhite(piece) !== isWhiteKing) {
          const { captures } = calculatePossibleMoves(row, col, testBoard);
          if (captures.some(([r, c]) => r === kingPos[0] && c === kingPos[1])) {
            return true;
          }
        }
      }
    }
    return false;
  };

  const simulateMove = (
    fromRow: number, 
    fromCol: number, 
    toRow: number, 
    toCol: number, 
    testBoard: Board
  ): Board => {
    const newBoard = testBoard.map(row => [...row]);
    newBoard[toRow][toCol] = newBoard[fromRow][fromCol];
    newBoard[fromRow][fromCol] = '';
    return newBoard;
  };

  const isCheckmate = (isWhitePlayer: boolean): boolean => {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece && isPieceWhite(piece) === isWhitePlayer) {
          const { moves, captures } = calculatePossibleMoves(row, col, board);
          const allMoves = [...moves, ...captures];
          
          for (const [newRow, newCol] of allMoves) {
            const testBoard = simulateMove(row, col, newRow, newCol, board);
            if (!isKingInCheck(testBoard, isWhitePlayer)) {
              return false; // Found at least one legal move
            }
          }
        }
      }
    }
    return true; // No legal moves found
  };

  const calculatePossibleMoves = (row: number, col: number, currentBoard: Board = board): PieceMoves => {
    const piece = currentBoard[row][col];
    const moves: Position[] = [];
    const captures: Position[] = [];
    const isWhite = isPieceWhite(piece);

    const isValidPosition = (r: number, c: number): boolean => 
      r >= 0 && r < 8 && c >= 0 && c < 8;

    const isEnemyPiece = (r: number, c: number): boolean => {
      if (!currentBoard[r][c]) return false;
      return isPieceWhite(currentBoard[r][c]) !== isWhite;
    };

    const addMove = (r: number, c: number): boolean => {
      if (isValidPosition(r, c)) {
        if (!currentBoard[r][c]) {
          moves.push([r, c]);
          return true;
        } else if (isEnemyPiece(r, c)) {
          captures.push([r, c]);
          return false;
        }
        return false;
      }
      return false;
    };

    switch (piece.toLowerCase()) {
      case '♙':
      case '♟': {
        const direction = isWhite ? -1 : 1;
        const startRow = isWhite ? 6 : 1;
        
        if (isValidPosition(row + direction, col) && !currentBoard[row + direction][col]) {
          moves.push([row + direction, col]);
          if (row === startRow && !currentBoard[row + 2 * direction][col]) {
            moves.push([row + 2 * direction, col]);
          }
        }
        
        [[direction, -1], [direction, 1]].forEach(([dr, dc]) => {
          const newRow = row + dr;
          const newCol = col + dc;
          if (isValidPosition(newRow, newCol) && isEnemyPiece(newRow, newCol)) {
            captures.push([newRow, newCol]);
          }
        });
        break;
      }
      case '♖':
      case '♜': {
        for (let i = col + 1; i < 8; i++) if (!addMove(row, i)) break;
        for (let i = col - 1; i >= 0; i--) if (!addMove(row, i)) break;
        for (let i = row + 1; i < 8; i++) if (!addMove(i, col)) break;
        for (let i = row - 1; i >= 0; i--) if (!addMove(i, col)) break;
        break;
      }
      case '♘':
      case '♞': {
        [[-2, -1], [-2, 1], [-1, -2], [-1, 2],
         [1, -2], [1, 2], [2, -1], [2, 1]].forEach(([dr, dc]) => {
          const newRow = row + dr;
          const newCol = col + dc;
          if (isValidPosition(newRow, newCol)) {
            if (isEnemyPiece(newRow, newCol)) {
              captures.push([newRow, newCol]);
            } else if (!currentBoard[newRow][newCol]) {
              moves.push([newRow, newCol]);
            }
          }
        });
        break;
      }
      case '♗':
      case '♝': {
        for (let i = 1; i < 8; i++) if (!addMove(row + i, col + i)) break;
        for (let i = 1; i < 8; i++) if (!addMove(row + i, col - i)) break;
        for (let i = 1; i < 8; i++) if (!addMove(row - i, col + i)) break;
        for (let i = 1; i < 8; i++) if (!addMove(row - i, col - i)) break;
        break;
      }
      case '♕':
      case '♛': {
        for (let i = col + 1; i < 8; i++) if (!addMove(row, i)) break;
        for (let i = col - 1; i >= 0; i--) if (!addMove(row, i)) break;
        for (let i = row + 1; i < 8; i++) if (!addMove(i, col)) break;
        for (let i = row - 1; i >= 0; i--) if (!addMove(i, col)) break;
        for (let i = 1; i < 8; i++) if (!addMove(row + i, col + i)) break;
        for (let i = 1; i < 8; i++) if (!addMove(row + i, col - i)) break;
        for (let i = 1; i < 8; i++) if (!addMove(row - i, col + i)) break;
        for (let i = 1; i < 8; i++) if (!addMove(row - i, col - i)) break;
        break;
      }
      case '♔':
      case '♚': {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const newRow = row + dr;
            const newCol = col + dc;
            if (isValidPosition(newRow, newCol)) {
              if (isEnemyPiece(newRow, newCol)) {
                captures.push([newRow, newCol]);
              } else if (!currentBoard[newRow][newCol]) {
                moves.push([newRow, newCol]);
              }
            }
          }
        }
        break;
      }
    }
    return { moves, captures };
  };

  const handleSquareClick = (row: number, col: number): void => {
    if (gameStatus === 'checkmate') {
      return; // Game is over
    }

    const piece = board[row][col];
    
    if (selectedPiece) {
      const [selectedRow, selectedCol] = selectedPiece;
      const selectedPieceType = board[selectedRow][selectedCol];
      
      const isValidMove = possibleMoves.some(([r, c]) => r === row && c === col);
      const isValidCapture = captureMoves.some(([r, c]) => r === row && c === col);
      
      if (isValidMove || isValidCapture) {
        const newBoard = simulateMove(selectedRow, selectedCol, row, col, board);

        if (isKingInCheck(newBoard, currentPlayer === 'white')) {
          setGameMessage('Este movimento deixaria seu rei em xeque!');
          setSelectedPiece(null);
          setPossibleMoves([]);
          setCaptureMoves([]);
          return;
        }

        if (isValidCapture) {
          const capturedPiece = board[row][col];
          const newCapturedPieces = { ...capturedPieces };
          if (isPieceWhite(selectedPieceType)) {
            newCapturedPieces.white.push(capturedPiece);
          } else {
            newCapturedPieces.black.push(capturedPiece);
          }
          setCapturedPieces(newCapturedPieces);
          
          if (capturedPiece === '♔' || capturedPiece === '♚') {
            setGameStatus('checkmate');
            setGameMessage(`${currentPlayer === 'white' ? 'Brancas' : 'Pretas'} venceram o jogo!`);
            setBoard(newBoard);
            setSelectedPiece(null);
            setPossibleMoves([]);
            setCaptureMoves([]);
            return;
          }
        }
        
        setBoard(newBoard);
        
        const nextPlayer = currentPlayer === 'white' ? 'black' : 'white';
        if (isKingInCheck(newBoard, currentPlayer === 'white' )) {
          if (isCheckmate(currentPlayer === 'white')) {
            setGameStatus('checkmate');
            setGameMessage(`Xeque-mate! ${currentPlayer === 'white' ? 'Brancas' : 'Pretas'} venceram!`);
          } else {
            setGameStatus('check');
            setGameMessage(`Xeque! ${nextPlayer === 'white' ? 'Brancas' : 'Pretas'} devem defender o rei!`);
          }
        } else if (isCheckmate(currentPlayer === 'white')) {
          setGameStatus('stalemate');
          setGameMessage('Empate por afogamento!');
        } else {
          setGameStatus('playing');
        }
        
        setCurrentPlayer(nextPlayer);
      } else {
        setGameMessage('Movimento inválido! Tente novamente.');
      }
      
      setSelectedPiece(null);
      setPossibleMoves([]);
      setCaptureMoves([]);
    } else if (piece) {
      const isWhitePiece = isPieceWhite(piece);
      if ((isWhitePiece && currentPlayer === 'white') || (!isWhitePiece && currentPlayer === 'black')) {
        setSelectedPiece([row, col]);
        const { moves, captures } = calculatePossibleMoves(row, col);
        setPossibleMoves(moves);
        setCaptureMoves(captures);
        setGameMessage(pieceRules[piece]);
      } else {
        setGameMessage(`Agora é a vez das ${currentPlayer === 'white' ? 'brancas' : 'pretas'}!`);
      }
    }
  };

  const resetGame = () => {
    setBoard(initialBoard);
    setSelectedPiece(null);
    setCurrentPlayer('white');
    setPossibleMoves([]);
    setCaptureMoves([]);
    setGameMessage('');
    setCapturedPieces({ white: [], black: [] });
    setGameStatus('playing');
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-4 space-y-2">
        <div className="text-xl font-bold">
          {gameStatus === 'checkmate' ? (
            <span className="text-red-600">Jogo Finalizado!</span>
          ) : (
            `Vez do jogador: ${currentPlayer === 'white' ? 'Brancas' : 'Pretas'}`
          )}
        </div>
        <div className={`text-lg ${gameStatus === 'check' ? 'text-red-600' : 'text-blue-600'}`}>
          {gameMessage}
        </div>
        
        <div className="flex gap-4">
          <div>
            <h3 className="font-bold">Peças capturadas (Brancas):</h3>
            <div className="text-2xl">{capturedPieces.white.join(' ')}</div>
          </div>
          <div>
            <h3 className="font-bold">Peças capturadas (Pretas):</h3>
            <div className="text-2xl">{capturedPieces.black.join(' ')}</div>
          </div>
        </div>

        {(gameStatus === 'checkmate' || gameStatus === 'stalemate') && (
          <button
            onClick={resetGame}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Novo Jogo
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-8 gap-0 border border-gray-800">
        {board.map((row, rowIndex) => (
          row.map((piece, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={`
                w-16 h-16 flex items-center justify-center text-4xl relative
                ${(rowIndex + colIndex) % 2 === 0 ? 'bg-white' : 'bg-gray-400'}
                ${selectedPiece && selectedPiece[0] === rowIndex && selectedPiece[1] === colIndex 
                  ? 'bg-yellow-200' 
                  : ''}
                ${possibleMoves.some(([r, c]) => r === rowIndex && c === colIndex)
                  ? 'bg-green-200'
                  : ''}
                ${captureMoves.some(([r, c]) => r === rowIndex && c === colIndex)
                  ? 'bg-red-200'
                  : ''}
                ${gameStatus === 'checkmate' ? 'cursor-not-allowed' : 'cursor-pointer'}
                hover:bg-yellow-100
              `}
              onClick={() => handleSquareClick(rowIndex, colIndex)}
            >
              {piece}
              {possibleMoves.some(([r, c]) => r === rowIndex && c === colIndex) && (
                <div className="absolute inset-0 border-4 border-green-500 opacity-50" />
              )}
              {captureMoves.some(([r, c]) => r === rowIndex && c === colIndex) && (
                <div className="absolute inset-0 border-4 border-red-500 opacity-50" />
              )}
            </div>
          ))
        ))}
      </div>
    </div>
  );
};

export default ChessGame;