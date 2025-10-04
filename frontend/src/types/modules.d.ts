// Type declarations for modules without TypeScript definitions

declare module '../utils/logger' {
  interface Logger {
    error: (message: string, ...args: any[]) => void;
    warn: (message: string, ...args: any[]) => void;
    info: (message: string, ...args: any[]) => void;
    debug: (message: string, ...args: any[]) => void;
  }
  
  const logger: Logger;
  export default logger;
}