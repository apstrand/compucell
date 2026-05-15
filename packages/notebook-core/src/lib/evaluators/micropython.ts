import type { Evaluator, EvaluationResult } from './types';

export interface MicroPythonConfig {
  url: string;
  password?: string;
}

/**
 * A remote MicroPython evaluator using the WebREPL protocol over WebSockets.
 */
export class MicroPythonRemoteEvaluator implements Evaluator {
  private socket: WebSocket | null = null;
  private config: MicroPythonConfig;
  private outputBuffer: string = '';
  private resolveEvaluate: ((res: EvaluationResult) => void) | null = null;

  constructor(config: MicroPythonConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) return;

    return new Promise((resolve, reject) => {
      console.log(`MicroPython: Connecting to ${this.config.url}...`);
      this.socket = new WebSocket(this.config.url);
      this.socket.binaryType = 'arraybuffer';

      this.socket.onopen = () => {
        console.log('MicroPython: Connected.');
        // WebREPL usually asks for password immediately on connect
      };

      this.socket.onmessage = (event) => {
        const data = typeof event.data === 'string' ? event.data : new TextDecoder().decode(event.data);
        this.outputBuffer += data;

        // Simple password handshake simulation
        if (data.includes('Password:')) {
          this.socket?.send((this.config.password || 'python') + '\n');
        }

        // Check if we are waiting for a result and see the REPL prompt '>>>'
        if (this.resolveEvaluate && this.outputBuffer.endsWith('>>> ')) {
          const res = this.outputBuffer;
          this.outputBuffer = '';
          this.resolveEvaluate({
            stdout: res.replace('>>> ', ''),
            stderr: '',
            result: 'OK'
          });
          this.resolveEvaluate = null;
        }
        
        if (this.outputBuffer.includes('Access denied')) {
            reject(new Error('WebREPL access denied'));
        }
        
        if (this.outputBuffer.includes('WebREPL connected')) {
            resolve();
        }
      };

      this.socket.onerror = (err) => {
        console.error('MicroPython WebSocket error:', err);
        reject(err);
      };

      this.socket.onclose = () => {
        console.log('MicroPython: Connection closed.');
      };

      // Timeout if connection takes too long
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });
  }

  async evaluate(code: string): Promise<EvaluationResult> {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      await this.initialize();
    }

    return new Promise((resolve) => {
      this.outputBuffer = '';
      this.resolveEvaluate = resolve;
      // Send code to MicroPython
      this.socket?.send(code + '\n');
    });
  }
  
  disconnect() {
      this.socket?.close();
      this.socket = null;
  }
}
