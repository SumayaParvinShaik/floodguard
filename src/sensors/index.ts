import { SensorReading, RiskLevel } from '../types';

export interface SensorCallback {
  (reading: SensorReading): void;
}

/**
 * Parses raw serial or BLE telemetry string:
 * e.g. "LEVEL_CM=185.4;RATE_CM_MIN=4.2;STATE=PREPARE;BATTERY=88;ID=FG-GAUGE-01"
 */
export function parseTelemetryLine(line: string): SensorReading | null {
  if (!line || !line.includes('LEVEL_CM=')) return null;

  try {
    const parts = line.trim().split(';');
    const kv: Record<string, string> = {};

    parts.forEach((p) => {
      const [k, v] = p.split('=');
      if (k && v) kv[k.trim()] = v.trim();
    });

    const levelCm = parseFloat(kv['LEVEL_CM'] || '0');
    const rateOfRiseCmMin = parseFloat(kv['RATE_CM_MIN'] || '0');
    const batteryPct = parseInt(kv['BATTERY'] || '100', 10);
    const sensorId = kv['ID'] || 'ESP32-LOCAL';

    let state: RiskLevel = 'SAFE';
    const rawState = (kv['STATE'] || '').toUpperCase();
    if (rawState.includes('LEAVE') || rawState.includes('DANGER')) {
      state = 'LEAVE_NOW';
    } else if (rawState.includes('PREPARE')) {
      state = 'PREPARE';
    } else if (rawState.includes('WATCH')) {
      state = 'WATCH';
    }

    return {
      levelCm,
      rateOfRiseCmMin,
      state,
      batteryPct,
      timestamp: Date.now(),
      sensorId,
      isFault: false
    };
  } catch (err) {
    console.warn('[Telemetry] Parse error:', err);
    return null;
  }
}

/**
 * Web Serial Manager for ESP32 river sensor connection
 */
export class WebSerialSensorManager {
  private port: any = null;
  private reader: any = null;
  private isReading = false;
  private onDataCallback: SensorCallback | null = null;

  public isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  public async connect(onData: SensorCallback): Promise<{ success: boolean; message: string }> {
    if (!this.isSupported()) {
      return { success: false, message: 'Web Serial API is not supported in this browser (Use Chrome or Edge).' };
    }

    try {
      this.port = await (navigator as any).serial.requestPort();
      await this.port.open({ baudRate: 115200 });
      this.onDataCallback = onData;
      this.startReading();
      return { success: true, message: 'Connected to ESP32 River Sensor Node.' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Serial port connection was cancelled.' };
    }
  }

  private async startReading(): Promise<void> {
    this.isReading = true;
    const textDecoder = new TextDecoderStream();
    this.port.readable.pipeTo(textDecoder.writable);
    this.reader = textDecoder.readable.getReader();

    let buffer = '';

    try {
      while (this.isReading) {
        const { value, done } = await this.reader.read();
        if (done) break;
        if (value) {
          buffer += value;
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const reading = parseTelemetryLine(line);
            if (reading && this.onDataCallback) {
              this.onDataCallback(reading);
            }
          }
        }
      }
    } catch (err) {
      console.warn('[WebSerial] Reading loop closed:', err);
    } finally {
      if (this.reader) {
        this.reader.releaseLock();
      }
    }
  }

  public async disconnect(): Promise<void> {
    this.isReading = false;
    if (this.reader) {
      try {
        await this.reader.cancel();
      } catch {}
    }
    if (this.port) {
      try {
        await this.port.close();
      } catch {}
      this.port = null;
    }
  }
}

/**
 * River Depth Simulator for live testing and demonstration.
 */
export class RiverSensorSimulator {
  private timer: number | null = null;
  private onDataCallback: SensorCallback | null = null;
  public currentLevelCm = 110.0;
  public currentRateCmMin = 0.5;
  public currentBattery = 95;
  public isSilentFault = false;

  public start(onData: SensorCallback): void {
    this.onDataCallback = onData;
    this.stop();

    this.timer = window.setInterval(() => {
      if (this.isSilentFault) {
        // Stop transmitting to trigger watchdog silent sensor fault!
        return;
      }

      // Slightly fluctuate rate for realistic telemetry
      const rateJitter = (Math.random() - 0.45) * 0.2;
      const effectiveRate = Number((this.currentRateCmMin + rateJitter).toFixed(1));

      // Advance depth based on rate
      this.currentLevelCm = Math.max(0, this.currentLevelCm + (effectiveRate * 0.05));

      let state: RiskLevel = 'SAFE';
      if (this.currentLevelCm >= 300 || effectiveRate >= 5.0) {
        state = 'LEAVE_NOW';
      } else if (this.currentLevelCm >= 240 || effectiveRate >= 3.0) {
        state = 'PREPARE';
      } else if (this.currentLevelCm >= 180 || effectiveRate >= 1.5) {
        state = 'WATCH';
      }

      if (this.onDataCallback) {
        this.onDataCallback({
          levelCm: Number(this.currentLevelCm.toFixed(1)),
          rateOfRiseCmMin: effectiveRate,
          state,
          batteryPct: this.currentBattery,
          timestamp: Date.now(),
          sensorId: 'SIMULATOR-NODE-01',
          isFault: false
        });
      }
    }, 1000);
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
