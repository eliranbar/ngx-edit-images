import { Injectable, inject, signal } from '@angular/core';
import { NIE_CONFIG } from '../config/tokens';
import { FREE_FEATURES, NieFeatureId } from '../config/features';
import { LicenseService } from './license.service';

@Injectable()
export class FeatureGateService {
  private readonly config = inject(NIE_CONFIG);
  private readonly license = inject(LicenseService);
  private readonly enabled = signal<ReadonlySet<NieFeatureId>>(new Set(FREE_FEATURES));
  private pending: Promise<void> | null = null;
  private warned = new Set<NieFeatureId>();

  init(): Promise<void> {
    this.pending ??= this.runInit();
    return this.pending;
  }

  private async runInit(): Promise<void> {
    await this.license.verify();
    const set = new Set<NieFeatureId>(FREE_FEATURES);
    for (const f of this.config.extraFeatures ?? []) {
      set.add(f);
    }
    for (const f of this.license.getLicensedFeatures()) {
      set.add(f);
    }
    this.enabled.set(set);
  }

  isEnabled(feature: NieFeatureId): boolean {
    return this.enabled().has(feature);
  }

  features(): ReadonlySet<NieFeatureId> {
    return this.enabled();
  }

  /** Returns false and optionally warns once when a premium feature is locked. */
  require(feature: NieFeatureId, warn = true): boolean {
    if (this.isEnabled(feature)) {
      return true;
    }
    if (warn && !this.warned.has(feature)) {
      this.warned.add(feature);
      console.warn(
        `[ngx-image-editor] "${feature}" is a premium feature. ` +
          'Unlock with a license key via provideImageEditor({ licenseKey }).',
      );
    }
    return false;
  }
}
