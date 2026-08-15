export interface SatisfactoryApiResponse<T> {
  data?: T;
  errorCode?: string;
  errorMessage?: string;
}

export interface CommandResult {
  ok: boolean;
  output: string;
  provider: string;
}

export interface CommandProvider {
  name: string;
  available: boolean;
  run(command: string): Promise<CommandResult>;
}

export interface GameMessageProvider {
  readonly name: string;
  readonly available: boolean;
  send(message: string): Promise<void>;
}

export interface ServerStateResponse {
  serverGameState?: {
    activeSessionName?: string;
    numConnectedPlayers?: number;
    playerLimit?: number;
    techTier?: number;
  };
}
