export type Direction = 'up' | 'down' | 'left' | 'right';
export type GameStatus = 'running' | 'paused' | 'gameover' | 'completed';
export type RNG = () => number;

export interface Point {
  x: number;
  y: number;
}

export interface GameConfig {
  rows: number;
  cols: number;
  startLength: number;
  pointsPerLetter: number;
}

export interface GameState {
  snake: Point[];
  direction: Direction;
  pendingDirection: Direction | null;
  phrase: string;
  letterIndex: number;
  food: LetterFood | null;
  score: number;
  status: GameStatus;
}

export interface LetterFood {
  position: Point;
  char: string;
}

export type GameAction =
  | { type: 'setDirection'; direction: Direction }
  | { type: 'tick'; rng?: RNG }
  | { type: 'restart'; rng?: RNG; phrase?: string }
  | { type: 'togglePause' };

const VECTORS: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 }
};

const pointsEqual = (a: Point, b: Point) => a.x === b.x && a.y === b.y;

export const pointKey = (point: Point) => `${point.x},${point.y}`;

const DEFAULT_PHRASE = 'MAE-IN LOVES YOU';
const PLAYABLE_CHAR = /^[A-Z0-9]$/;

export const normalizePhrase = (phrase: string) =>
  phrase.trim().replace(/\s+/g, ' ').toUpperCase();

export const isPlayableChar = (char: string) => PLAYABLE_CHAR.test(char);

export const getNextPlayableIndex = (phrase: string, startIndex: number) => {
  for (let i = startIndex; i < phrase.length; i += 1) {
    if (isPlayableChar(phrase[i])) {
      return i;
    }
  }
  return -1;
};

export const isOpposite = (a: Direction, b: Direction) =>
  (a === 'up' && b === 'down') ||
  (a === 'down' && b === 'up') ||
  (a === 'left' && b === 'right') ||
  (a === 'right' && b === 'left');

export const createInitialSnake = (config: GameConfig): Point[] => {
  const headX = Math.max(config.startLength - 1, Math.floor(config.cols / 2));
  const headY = Math.floor(config.rows / 2);
  const snake: Point[] = [];

  for (let i = 0; i < config.startLength; i += 1) {
    snake.push({ x: headX - i, y: headY });
  }

  return snake;
};

export const placeFood = (snake: Point[], config: GameConfig, rng: RNG = Math.random): Point => {
  const occupied = new Set(snake.map(pointKey));
  const available: Point[] = [];

  for (let y = 0; y < config.rows; y += 1) {
    for (let x = 0; x < config.cols; x += 1) {
      const candidate = { x, y };
      if (!occupied.has(pointKey(candidate))) {
        available.push(candidate);
      }
    }
  }

  if (available.length === 0) {
    return snake[0];
  }

  const index = Math.floor(rng() * available.length);
  return available[index];
};

export const placeLetterFood = (
  snake: Point[],
  config: GameConfig,
  char: string,
  rng: RNG = Math.random
): LetterFood => ({
  position: placeFood(snake, config, rng),
  char
});

export const createInitialState = (
  config: GameConfig,
  phraseInput: string,
  rng: RNG = Math.random
): GameState => {
  const snake = createInitialSnake(config);
  const normalized = normalizePhrase(phraseInput);
  const phrase = normalized.length > 0 ? normalized : DEFAULT_PHRASE;
  const firstIndex = getNextPlayableIndex(phrase, 0);
  const hasTarget = firstIndex !== -1;
  return {
    snake,
    direction: 'right',
    pendingDirection: null,
    phrase,
    letterIndex: hasTarget ? firstIndex : phrase.length,
    food: hasTarget ? placeLetterFood(snake, config, phrase[firstIndex], rng) : null,
    score: 0,
    status: hasTarget ? 'running' : 'completed'
  };
};

export const queueDirection = (state: GameState, direction: Direction): GameState => {
  if (state.status === 'gameover' || state.status === 'completed') {
    return state;
  }

  const current = state.pendingDirection ?? state.direction;
  if (isOpposite(current, direction)) {
    return state;
  }

  return {
    ...state,
    pendingDirection: direction
  };
};

export const step = (state: GameState, config: GameConfig, rng: RNG = Math.random): GameState => {
  if (state.status !== 'running') {
    return state;
  }

  const nextDirection = state.pendingDirection && !isOpposite(state.pendingDirection, state.direction)
    ? state.pendingDirection
    : state.direction;

  const head = state.snake[0];
  const vector = VECTORS[nextDirection];
  const nextHead = { x: head.x + vector.x, y: head.y + vector.y };

  const outOfBounds =
    nextHead.x < 0 ||
    nextHead.x >= config.cols ||
    nextHead.y < 0 ||
    nextHead.y >= config.rows;

  const willGrow = state.food ? pointsEqual(nextHead, state.food.position) : false;
  const bodyToCheck = willGrow ? state.snake : state.snake.slice(0, -1);
  const hitsSelf = bodyToCheck.some(segment => pointsEqual(segment, nextHead));

  if (outOfBounds || hitsSelf) {
    return {
      ...state,
      status: 'gameover',
      pendingDirection: null
    };
  }

  const nextSnake = [nextHead, ...state.snake];
  if (!willGrow) {
    nextSnake.pop();
  }

  if (!willGrow) {
    return {
      ...state,
      snake: nextSnake,
      direction: nextDirection,
      pendingDirection: null
    };
  }

  const nextLetterIndex = getNextPlayableIndex(state.phrase, state.letterIndex + 1);
  const completed = nextLetterIndex === -1;
  const updatedLetterIndex = completed ? state.phrase.length : nextLetterIndex;

  return {
    ...state,
    snake: nextSnake,
    direction: nextDirection,
    pendingDirection: null,
    letterIndex: updatedLetterIndex,
    food: completed ? null : placeLetterFood(nextSnake, config, state.phrase[nextLetterIndex], rng),
    score: state.score + config.pointsPerLetter,
    status: completed ? 'completed' : state.status
  };
};

export const createGameReducer = (config: GameConfig) =>
  (state: GameState, action: GameAction): GameState => {
    switch (action.type) {
      case 'setDirection':
        return queueDirection(state, action.direction);
      case 'tick':
        return step(state, config, action.rng ?? Math.random);
      case 'restart':
        return createInitialState(config, action.phrase ?? state.phrase, action.rng ?? Math.random);
      case 'togglePause':
        if (state.status === 'gameover' || state.status === 'completed') {
          return state;
        }
        return {
          ...state,
          status: state.status === 'paused' ? 'running' : 'paused'
        };
      default:
        return state;
    }
  };
