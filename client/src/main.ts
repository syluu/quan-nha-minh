import './style.css';
import { startGame } from './game/gameLoop';
import { showLobby } from './lobby';
import type { GameConnection } from './net';

const root = document.getElementById('app')!;

function enterGame(conn: GameConnection) {
  root.innerHTML = '<div class="game" id="game"></div>';
  startGame(conn, document.getElementById('game')!);
}

showLobby(root, enterGame);
