import { Injectable } from '@angular/core';
import { MeshBlob } from '../models/meshblob';
import { SettingsService } from './settings';

@Injectable({
  providedIn: 'root'
})
export class Background {
  readonly seed: number;
  readonly blobs: MeshBlob[];
  readonly background: string;

  constructor(settingsService: SettingsService) {
    const seed = settingsService.settings().backgroundSeed;
    this.seed = seed;
    this.blobs = this.generateBlobs(seed);
    this.background = this.generateBackgroundString(this.blobs);
  }

  private generateBlobs(seed: number): MeshBlob[] {
    // Use standard mulberry32 PRNG for deterministic results
    let state = seed;
    const nextUInt32 = () => {
      state = (state + 0x6D2B79F5) | 0;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return (value ^ (value >>> 14)) >>> 0;
    };

    // Generate number of blobs (6 to 8)
    const blobCount = 6 + (nextUInt32() % 3);

    const blobs: MeshBlob[] = [];
    for (let i = 0; i < blobCount; i++) {
      // Generate x, y, w, h within bounds
      const x = -10 + (nextUInt32() % 120); // -10 to 110
      const y = -10 + (nextUInt32() % 120); // -10 to 110
      const w = 20 + (nextUInt32() % 43);   // 20 to 62
      const h = 18 + (nextUInt32() % 47);   // 18 to 64

      // Generate hue (1, 2, or 3)
      const hue = (nextUInt32() % 3) + 1 as 1 | 2 | 3;

      blobs.push({
        x,
        y,
        w,
        h,
        hue
      });
    }

    return blobs;
  }

  private generateBackgroundString(blobs: MeshBlob[]): string {
    return blobs.map(blob => {
      const { x, y, w, h, hue } = blob;
      return `radial-gradient(${w}% ${h}% at ${x}% ${y}%, var(--mesh-hue-${hue}) 0%, transparent 64%)`;
    }).join(', ');
  }
}
