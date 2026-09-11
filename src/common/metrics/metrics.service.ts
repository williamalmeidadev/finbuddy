import { Injectable } from '@nestjs/common';

@Injectable()
export class MetricsService {
  private readonly counters = new Map<string, number>();

  increment(metricName: string, amount = 1): void {
    const current = this.counters.get(metricName) || 0;
    this.counters.set(metricName, current + amount);
  }

  getMetric(metricName: string): number {
    return this.counters.get(metricName) || 0;
  }

  getAllMetrics(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [key, value] of this.counters.entries()) {
      result[key] = value;
    }
    return result;
  }
}
