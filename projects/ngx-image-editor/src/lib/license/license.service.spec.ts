import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { provideImageEditor } from '../config/provide';
import { LicenseService } from './license.service';
import { FeatureGateService } from './feature-gate.service';
import { FREE_FEATURES, NIE_FEATURES } from '../config/features';

describe('LicenseService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideImageEditor({})],
    });
  });

  it('runs in free tier without a key', async () => {
    const license = TestBed.inject(LicenseService);
    const state = await license.verify();
    expect(state.valid).toBe(false);
    expect(state.reason).toBe('missing-key');
  });
});

describe('FeatureGateService', () => {
  it('enables free features by default', async () => {
    TestBed.configureTestingModule({
      providers: [provideImageEditor({})],
    });
    const gate = TestBed.inject(FeatureGateService);
    await gate.init();
    for (const f of FREE_FEATURES) {
      expect(gate.isEnabled(f)).toBe(true);
    }
    expect(gate.isEnabled(NIE_FEATURES.brush)).toBe(false);
  });

  it('honors extraFeatures override', async () => {
    TestBed.configureTestingModule({
      providers: [provideImageEditor({ extraFeatures: [NIE_FEATURES.brush] })],
    });
    const gate = TestBed.inject(FeatureGateService);
    await gate.init();
    expect(gate.isEnabled(NIE_FEATURES.brush)).toBe(true);
  });
});
