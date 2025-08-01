import logger from './logger';

interface PerformanceMetrics {
  requestId: string;
  path: string;
  method: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryUsage?: NodeJS.MemoryUsage;
  statusCode?: number;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private readonly WARNING_THRESHOLD = 1000; // 1秒
  private readonly CRITICAL_THRESHOLD = 3000; // 3秒

  startTracking(requestId: string, path: string, method: string): void {
    this.metrics.set(requestId, {
      requestId,
      path,
      method,
      startTime: performance.now(),
      memoryUsage: process.memoryUsage()
    });
  }

  endTracking(requestId: string, statusCode: number): PerformanceMetrics | undefined {
    const metric = this.metrics.get(requestId);
    if (!metric) return;

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;
    metric.statusCode = statusCode;

    // パフォーマンス警告
    if (metric.duration > this.CRITICAL_THRESHOLD) {
      logger.error('Critical performance issue detected', {
        path: metric.path,
        duration: `${metric.duration.toFixed(2)}ms`,
        threshold: `${this.CRITICAL_THRESHOLD}ms`
      });
    } else if (metric.duration > this.WARNING_THRESHOLD) {
      logger.warn('Performance warning', {
        path: metric.path,
        duration: `${metric.duration.toFixed(2)}ms`,
        threshold: `${this.WARNING_THRESHOLD}ms`
      });
    }

    // メモリ使用量チェック
    const currentMemory = process.memoryUsage();
    const heapUsedDiff = currentMemory.heapUsed - (metric.memoryUsage?.heapUsed || 0);
    
    if (heapUsedDiff > 50 * 1024 * 1024) { // 50MB以上のメモリ増加
      logger.warn('High memory usage detected', {
        path: metric.path,
        memoryIncrease: `${(heapUsedDiff / 1024 / 1024).toFixed(2)}MB`
      });
    }

    // クリーンアップ
    this.metrics.delete(requestId);

    return metric;
  }

  getStats(): {
    activeRequests: number;
    averageResponseTime: number;
    slowestEndpoints: Array<{ path: string; avgDuration: number }>;
  } {
    const completedMetrics = Array.from(this.metrics.values()).filter(m => m.duration);
    
    const avgResponseTime = completedMetrics.length > 0
      ? completedMetrics.reduce((sum, m) => sum + (m.duration || 0), 0) / completedMetrics.length
      : 0;

    // エンドポイント別の統計
    const endpointStats = new Map<string, { totalDuration: number; count: number }>();
    
    completedMetrics.forEach(metric => {
      const stats = endpointStats.get(metric.path) || { totalDuration: 0, count: 0 };
      stats.totalDuration += metric.duration || 0;
      stats.count++;
      endpointStats.set(metric.path, stats);
    });

    const slowestEndpoints = Array.from(endpointStats.entries())
      .map(([path, stats]) => ({
        path,
        avgDuration: stats.totalDuration / stats.count
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 5);

    return {
      activeRequests: this.metrics.size,
      averageResponseTime: avgResponseTime,
      slowestEndpoints
    };
  }
}

export const performanceMonitor = new PerformanceMonitor();

// 画像最適化ユーティリティ
export class ImageOptimizer {
  static getOptimalFormat(userAgent?: string): 'webp' | 'avif' | 'jpeg' {
    if (!userAgent) return 'jpeg';

    // ブラウザ対応チェック
    const supportsWebP = /Chrome|Opera|Edge/.test(userAgent);
    const supportsAvif = /Chrome\/[89]\d|Chrome\/1\d\d/.test(userAgent);

    if (supportsAvif) return 'avif';
    if (supportsWebP) return 'webp';
    return 'jpeg';
  }

  static getOptimalSize(viewport: { width?: number; height?: number }): string {
    const width = viewport.width || 1920;
    
    // レスポンシブ画像サイズ
    if (width <= 640) return '640x480';
    if (width <= 1024) return '1024x768';
    if (width <= 1920) return '1920x1080';
    return '2560x1440';
  }

  static getCacheHeaders(contentType: string): Record<string, string> {
    // 画像は長期キャッシュ
    const isImage = contentType.startsWith('image/');
    const maxAge = isImage ? 31536000 : 3600; // 1年 or 1時間

    return {
      'Cache-Control': `public, max-age=${maxAge}, immutable`,
      'Vary': 'Accept-Encoding, Accept',
      'ETag': `W/"${Date.now()}"`,
    };
  }
}

// メモリキャッシュ実装
export class MemoryCache<T> {
  private cache: Map<string, { data: T; expires: number }> = new Map();
  private readonly maxSize: number;
  private readonly ttl: number; // Time to live in milliseconds

  constructor(maxSize = 100, ttlSeconds = 300) {
    this.maxSize = maxSize;
    this.ttl = ttlSeconds * 1000;
    
    // 定期的なクリーンアップ
    setInterval(() => this.cleanup(), 60000); // 1分ごと
  }

  set(key: string, value: T): void {
    // サイズ制限チェック
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data: value,
      expires: Date.now() + this.ttl
    });
  }

  get(key: string): T | undefined {
    const item = this.cache.get(key);
    
    if (!item) return undefined;
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return undefined;
    }
    
    return item.data;
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key);
      }
    }
  }

  getStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0 // 実装は省略
    };
  }
}