declare global {
  interface CloudflareEnv {
    HYPERDRIVE?: {
      connectionString: string;
    };
  }
}

declare module 'cloudflare:sockets' {
  export type SocketOptions = {
    secureTransport?: 'off' | 'on' | 'starttls';
  };

  export interface Socket {
    readable: ReadableStream<Uint8Array>;
    writable: WritableStream<Uint8Array>;
    closed: Promise<unknown>;
    close(): void;
    startTls(options?: unknown): Socket;
  }

  export function connect(address: string, options?: SocketOptions): Socket;
}

export {};
