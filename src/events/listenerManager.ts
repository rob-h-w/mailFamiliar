import {EventEmitter} from 'events';
import {ServerEvents} from '@hapi/hapi';

type Handler = (...args: any[]) => void;

export default class ListenerManager {
  private readonly emitter: EventEmitter;
  private readonly listeners: {[key: string]: Handler[]} = {};

  constructor(emitter: EventEmitter) {
    this.emitter = emitter;
  }

  public close(): void {
    Object.entries(this.listeners).forEach(([event, handlers]) => {
      handlers.forEach(handler => this.emitter.removeListener(event, handler));
    });
  }

  public on(event: string, handler: Handler): ListenerManager {
    this.emitter.on(event, handler);
    this.listeners[event] = [handler];
    return this;
  }

  public once(event: string, handler: Handler): ListenerManager {
    this.emitter.once(event, handler);
    return this;
  }
}

type ServerEventStrings = 'log' | 'request' | 'response' | 'route' | 'start' | 'stop';

export class ServerEventsListenerManager {
  private readonly manager: ListenerManager;

  constructor(emitter: ServerEvents) {
    this.manager = new ListenerManager((emitter as unknown) as EventEmitter);
  }

  public close(): void {
    this.manager.close();
  }

  public on(event: ServerEventStrings, handler: Handler): ServerEventsListenerManager {
    this.manager.on(event, handler);
    return this;
  }

  public once(event: ServerEventStrings, handler: Handler): ServerEventsListenerManager {
    this.manager.once(event, handler);
    return this;
  }
}
