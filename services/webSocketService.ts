type WebSocketMessage = {
  type: string;
  [key: string]: any;
};

type MessageHandler = (data: WebSocketMessage) => void;
type ConnectionHandler = (connected: boolean) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts: number = 0;
  private readonly maxReconnectAttempts: number = 5;
  private readonly reconnectInterval: number = 3000;
  private readonly heartbeatInterval: number = 30000;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  
  private messageHandlers: MessageHandler[] = [];
  private connectionHandlers: ConnectionHandler[] = [];
  private currentUserId: string | null = null;

  constructor() {
    this.setupHeartbeat();
  }

  connect(userId: string): void {
    try {
      // Clean up existing connection
      this.cleanup();
      
      this.currentUserId = userId;
      const WS_URL = 'ws://ekco-tracking.co.za:3004';
      
      console.log(`🔗 Connecting to WebSocket: ${WS_URL}`);
      this.ws = new WebSocket(WS_URL);

      this.setupEventHandlers();
      
    } catch (error) {
      console.error('❌ Error creating WebSocket connection:', error);
      this.handleConnectionFailure();
    }
  }

  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = (): void => {
      console.log('✅ WebSocket connected successfully');
      this.reconnectAttempts = 0;
      
      // Register user with WebSocket server
      this.send({
        type: 'register',
        userId: this.currentUserId
      });

      this.notifyConnectionHandlers(true);
      this.startHeartbeat();
    };

    this.ws.onping = (): void => {
      console.log('❤️ Server ping received');
      // WebSocket automatically responds with pong
    };

    this.ws.onpong = (): void => {
      console.log('❤️ Server pong received');
    };

    this.ws.onmessage = (event: MessageEvent): void => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);
        console.log('📨 WebSocket message:', data);
        
        this.handleIncomingMessage(data);
      } catch (error) {
        console.error('❌ Error parsing WebSocket message:', error, event.data);
      }
    };

    this.ws.onclose = (event: CloseEvent): void => {
      console.log(`🔴 WebSocket disconnected: ${event.code} - ${event.reason}`);
      this.cleanup();
      this.notifyConnectionHandlers(false);
      
      if (this.currentUserId) {
        this.attemptReconnect();
      }
    };

    this.ws.onerror = (error: Event): void => {
      console.error('💥 WebSocket error:', error);
      this.handleConnectionFailure();
    };
  }

  private handleIncomingMessage(data: WebSocketMessage): void {
    // Handle specific message types
    switch (data.type) {
      case 'registered':
        console.log('✅ Successfully registered with WebSocket server');
        break;
      case 'new_alert':
        console.log('🚨 New alert received:', data.alert);
        break;
      default:
        console.log('📨 Received message:', data);
    }
    
    // Notify all message handlers
    this.messageHandlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error('❌ Error in message handler:', error);
      }
    });
  }

  private handleConnectionFailure(): void {
    this.cleanup();
    this.notifyConnectionHandlers(false);
    
    if (this.currentUserId) {
      this.attemptReconnect();
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.currentUserId) {
      this.reconnectAttempts++;
      const delay = this.reconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1);
      
      console.log(`🔄 Reconnecting in ${Math.round(delay/1000)}s... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        if (this.currentUserId) {
          this.connect(this.currentUserId);
        }
      }, delay);
    } else {
      console.error('❌ Maximum reconnection attempts reached');
      this.notifyConnectionHandlers(false);
    }
  }

  private setupHeartbeat(): void {
    // Global heartbeat setup if needed
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        // You can send custom heartbeat messages if needed
        // this.send({ type: 'heartbeat', timestamp: Date.now() });
      }
    }, this.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  send(message: WebSocketMessage): boolean {
    if (this.isConnected() && this.ws) {
      try {
        this.ws.send(JSON.stringify(message));
        console.log('📤 Sent WebSocket message:', message.type);
        return true;
      } catch (error) {
        console.error('❌ Error sending WebSocket message:', error);
        return false;
      }
    } else {
      console.warn('⚠️ WebSocket not connected, cannot send message');
      return false;
    }
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.push(handler);
    
    // Return unsubscribe function
    return (): void => {
      const index = this.messageHandlers.indexOf(handler);
      if (index > -1) {
        this.messageHandlers.splice(index, 1);
      }
    };
  }

  onConnectionChange(handler: ConnectionHandler): () => void {
    this.connectionHandlers.push(handler);
    
    // Return unsubscribe function
    return (): void => {
      const index = this.connectionHandlers.indexOf(handler);
      if (index > -1) {
        this.connectionHandlers.splice(index, 1);
      }
    };
  }

  private notifyConnectionHandlers(connected: boolean): void {
    this.connectionHandlers.forEach(handler => {
      try {
        handler(connected);
      } catch (error) {
        console.error('❌ Error in connection handler:', error);
      }
    });
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  getStatus(): string {
    if (!this.ws) return 'CLOSED';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'CONNECTING';
      case WebSocket.OPEN:
        return 'OPEN';
      case WebSocket.CLOSING:
        return 'CLOSING';
      case WebSocket.CLOSED:
        return 'CLOSED';
      default:
        return 'UNKNOWN';
    }
  }

  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  disconnect(): void {
    console.log('👋 Disconnecting WebSocket...');
    this.currentUserId = null;
    this.reconnectAttempts = 0;
    this.cleanup();
    this.notifyConnectionHandlers(false);
  }

  private cleanup(): void {
    this.stopHeartbeat();
    
    if (this.ws) {
      // Remove event handlers to prevent memory leaks
      this.ws.onopen = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      this.ws.onping = null;
      this.ws.onpong = null;
      
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close(1000, 'Client disconnected');
      }
      
      this.ws = null;
    }
  }

  // Utility method to check if we should attempt reconnection
  shouldAttemptReconnect(): boolean {
    return this.reconnectAttempts < this.maxReconnectAttempts && this.currentUserId !== null;
  }
}

// Create singleton instance
export const websocketService = new WebSocketService();