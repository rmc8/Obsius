/**
 * Performance test script for Obsius plugin
 * Measures startup time and API key operations
 */

export class PerformanceTest {
  private measurements: Map<string, number[]> = new Map();

  /**
   * Start timing a specific operation
   */
  startMeasure(name: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (!this.measurements.has(name)) {
        this.measurements.set(name, []);
      }
      
      this.measurements.get(name)!.push(duration);
      console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
    };
  }

  /**
   * Get statistics for a specific measurement
   */
  getStats(name: string): { avg: number; min: number; max: number; count: number } | null {
    const times = this.measurements.get(name);
    if (!times || times.length === 0) return null;

    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);

    return { avg, min, max, count: times.length };
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    let report = '📊 Performance Test Report\n';
    report += '==========================\n\n';

    for (const [name, times] of this.measurements) {
      const stats = this.getStats(name);
      if (stats) {
        report += `${name}:\n`;
        report += `  Average: ${stats.avg.toFixed(2)}ms\n`;
        report += `  Min: ${stats.min.toFixed(2)}ms\n`;
        report += `  Max: ${stats.max.toFixed(2)}ms\n`;
        report += `  Samples: ${stats.count}\n\n`;
      }
    }

    return report;
  }

  /**
   * Clear all measurements
   */
  clear(): void {
    this.measurements.clear();
  }
}

// Export singleton instance
export const performanceTest = new PerformanceTest();