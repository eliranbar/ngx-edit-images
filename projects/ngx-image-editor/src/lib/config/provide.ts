import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { ImageEditorConfig, NIE_CONFIG } from './tokens';
import { LicenseService } from '../license/license.service';
import { FeatureGateService } from '../license/feature-gate.service';

/**
 * Provide ngx-image-editor configuration at the application root.
 *
 * @example
 * ```ts
 * provideImageEditor({
 *   licenseKey: '....',
 *   theme: 'dark',
 * })
 * ```
 */
export function provideImageEditor(
  config: ImageEditorConfig = {},
): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: NIE_CONFIG, useValue: config },
    LicenseService,
    FeatureGateService,
  ]);
}
