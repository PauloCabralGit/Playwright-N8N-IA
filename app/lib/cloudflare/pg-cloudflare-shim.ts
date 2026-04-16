type SocketConnectOptions = {
  secureTransport?: 'off' | 'on' | 'starttls';
};

type CloudflareNativeSocket = {
  readable: ReadableStream<Uint8Array>;
  writable: WritableStream<Uint8Array>;
  closed: Promise<unknown>;
  close: () => void;
  startTls: (options?: unknown) => CloudflareNativeSocket;
};

type CloudflareSocketsModule = {
  connect: (address: string, options?: SocketConnectOptions) => CloudflareNativeSocket;
};

type Listener = (...args: unknown[]) => void;

class MiniEventEmitter {
  private listeners = new Map<string, Listener[]>();

  on(event: string, listener: Listener) {
    const listeners = this.listeners.get(event) || [];
    listeners.push(listener);
    this.listeners.set(event, listeners);
    return this;
  }

  once(event: string, listener: Listener) {
    const wrapped: Listener = (...args) => {
      this.off(event, wrapped);
      listener(...args);
    };

    return this.on(event, wrapped);
  }

  off(event: string, listener: Listener) {
    const listeners = this.listeners.get(event) || [];
    this.listeners.set(
      event,
      listeners.filter((candidate) => candidate !== listener)
    );
    return this;
  }

  emit(event: string, ...args: unknown[]) {
    const listeners = this.listeners.get(event) || [];
    for (const listener of listeners) {
      listener(...args);
    }
    return listeners.length > 0;
  }
}

async function loadCloudflareSockets(): Promise<CloudflareSocketsModule> {
  // workerd provides this built-in at runtime; TypeScript does not resolve it reliably here.
  // @ts-expect-error Cloudflare Workers built-in module
  return import('cloudflare:sockets').catch((error) => {
    throw new Error(
      `Unable to load cloudflare:sockets at runtime: ${error instanceof Error ? error.message : String(error)}`
    );
  }) as Promise<CloudflareSocketsModule>;
}

export class CloudflareSocket extends MiniEventEmitter {
  writable = false;
  destroyed = false;

  private readonly ssl: boolean;
  private upgrading = false;
  private upgraded = false;
  private socket: CloudflareNativeSocket | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

  constructor(ssl?: boolean) {
    super();
    this.ssl = Boolean(ssl);
  }

  setNoDelay() {
    return this;
  }

  setKeepAlive() {
    return this;
  }

  ref() {
    return this;
  }

  unref() {
    return this;
  }

  async connect(port: number, host: string, connectListener?: Listener) {
    try {
      if (connectListener) {
        this.once('connect', connectListener);
      }

      const options = this.ssl ? { secureTransport: 'starttls' as const } : undefined;
      const { connect } = await loadCloudflareSockets();
      this.socket = connect(`${host}:${port}`, options);
      this.writer = this.socket.writable.getWriter();
      this.reader = this.socket.readable.getReader();
      this.attachClosedHandler();

      if (this.ssl) {
        this.listenOnce().catch((error) => this.emit('error', error));
      } else {
        this.listen().catch((error) => this.emit('error', error));
      }

      await this.writer.ready;
      this.writable = true;
      this.emit('connect');
      return this;
    } catch (error) {
      this.emit('error', error);
      return this;
    }
  }

  write(data: Uint8Array | string, encoding: BufferEncoding = 'utf8', callback: (error?: Error | null) => void = () => {}) {
    if (!data || (typeof data !== 'string' && data.length === 0)) {
      callback();
      return true;
    }

    if (!this.writer) {
      callback(new Error('Socket writer is unavailable.'));
      return false;
    }

    const chunk = typeof data === 'string' ? Buffer.from(data, encoding) : data;
    this.writer.write(chunk).then(
      () => callback(),
      (error) => callback(error instanceof Error ? error : new Error(String(error)))
    );

    return true;
  }

  end(data: Uint8Array | string = Buffer.alloc(0), encoding: BufferEncoding = 'utf8', callback: (error?: Error | null) => void = () => {}) {
    this.write(data, encoding, (error) => {
      this.socket?.close();
      callback(error || undefined);
    });
    return this;
  }

  destroy() {
    this.destroyed = true;
    return this.end();
  }

  startTls(options?: unknown) {
    if (!this.socket || !this.writer || !this.reader) {
      this.emit('error', new Error('Socket is not connected.'));
      return;
    }

    if (this.upgraded) {
      this.emit('error', new Error('Cannot call startTls() more than once on a socket.'));
      return;
    }

    this.writer.releaseLock();
    this.reader.releaseLock();
    this.upgrading = true;
    this.socket = this.socket.startTls(options);
    this.writer = this.socket.writable.getWriter();
    this.reader = this.socket.readable.getReader();
    this.attachClosedHandler();
    this.listen().catch((error) => this.emit('error', error));
  }

  private async listen() {
    if (!this.reader) return;

    while (true) {
      const { done, value } = await this.reader.read();
      if (done) break;
      if (value) {
        this.emit('data', Buffer.from(value));
      }
    }
  }

  private async listenOnce() {
    if (!this.reader) return;

    const { value } = await this.reader.read();
    if (value) {
      this.emit('data', Buffer.from(value));
    }
  }

  private attachClosedHandler() {
    if (!this.socket) return;

    this.socket.closed
      .then(() => {
        if (!this.upgrading) {
          this.socket = null;
          this.emit('close');
        } else {
          this.upgrading = false;
          this.upgraded = true;
        }
      })
      .catch((error) => this.emit('error', error));
  }
}

export default { CloudflareSocket };
