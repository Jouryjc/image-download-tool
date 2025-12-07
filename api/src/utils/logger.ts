/**
 * 日志工具模块
 */
import { createWriteStream } from 'fs';
import { join } from 'path';

enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

class Logger {
  private logLevel: LogLevel;
  private logStream: NodeJS.WritableStream | null = null;

  constructor() {
    this.logLevel = process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
    
    // 在生产环境中写入日志文件
    if (process.env.NODE_ENV === 'production') {
      try {
        this.logStream = createWriteStream(join(process.cwd(), 'logs', 'api.log'), {
          flags: 'a',
          encoding: 'utf8'
        });
      } catch (error) {
        console.error('Failed to create log stream:', error);
      }
    }
  }

  private formatMessage(level: string, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const formattedArgs = args.length > 0 ? ' ' + args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ') : '';
    
    return `[${timestamp}] [${level}] ${message}${formattedArgs}`;
  }

  private write(level: string, message: string, ...args: any[]) {
    const formattedMessage = this.formatMessage(level, message, ...args);
    
    // 控制台输出
    console.log(formattedMessage);
    
    // 文件输出
    if (this.logStream) {
      this.logStream.write(formattedMessage + '\n');
    }
  }

  error(message: string, ...args: any[]) {
    if (this.logLevel >= LogLevel.ERROR) {
      this.write('ERROR', message, ...args);
    }
  }

  warn(message: string, ...args: any[]) {
    if (this.logLevel >= LogLevel.WARN) {
      this.write('WARN', message, ...args);
    }
  }

  info(message: string, ...args: any[]) {
    if (this.logLevel >= LogLevel.INFO) {
      this.write('INFO', message, ...args);
    }
  }

  debug(message: string, ...args: any[]) {
    if (this.logLevel >= LogLevel.DEBUG) {
      this.write('DEBUG', message, ...args);
    }
  }

  // 关闭日志流
  close() {
    if (this.logStream) {
      this.logStream.end();
      this.logStream = null;
    }
  }
}

export const logger = new Logger();

// 进程退出时关闭日志流
process.on('exit', () => {
  logger.close();
});

process.on('SIGINT', () => {
  logger.close();
  process.exit(0);
});