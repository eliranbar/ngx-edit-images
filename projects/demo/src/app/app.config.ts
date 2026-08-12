import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideImageEditor } from 'ngx-image-editor';

/**
 * Demo premium license. Bound to demo hosts and expires 2027-08-10.
 * Empty features + plan "premium" unlocks all current PREMIUM_FEATURES (incl. pdf).
 * Reissue with:
 *   npm run license -- --licensee "ngx-image-editor demo" \
 *     --domains "ngx-image-editor.ebdev-design.com,localhost,127.0.0.1" \
 *     --expiry "2027-08-10" --features ""
 */
const DEMO_LICENSE_KEY =
  'eyJwIjoiZXlKd2JHRnVJam9pY0hKbGJXbDFiU0lzSW1abFlYUjFjbVZ6SWpwYlhTd2laWGh3YVhKNUlqb2lNakF5Tnkwd09DMHhNQ0lzSW14cFkyVnVjMlZsSWpvaWJtZDRMV2x0WVdkbExXVmthWFJ2Y2lCa1pXMXZJaXdpWkc5dFlXbHVjeUk2V3lKdVozZ3RhVzFoWjJVdFpXUnBkRzl5TG1WaVpHVjJMV1JsYzJsbmJpNWpiMjBpTENKc2IyTmhiR2h2YzNRaUxDSXhNamN1TUM0d0xqRWlYU3dpY0hKdlpIVmpkQ0k2SWtCbFltUmxkaTl1WjNndGFXMWhaMlV0WldScGRHOXlJaXdpYTJsa0lqb2libWxsTFRJd01qWXRNRGdpZlE9PSIsInMiOiJFY0N0eGhwVzRWaDZBZGNFeUZXaXJvTTU5UXRvcEt6RXpzYkhiUGNteTFYNlhnQ3FTbmxZV3QvTlBBemhnc1pubXNQRVJFMjhXcCtHNzQrRDY3VjJDQT09In0=';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideImageEditor({
      licenseKey: DEMO_LICENSE_KEY,
      theme: 'dark',
      canvasWidth: 1200,
      canvasHeight: 800,
      pdfWorkerSrc: '/pdf.worker.min.mjs',
    }),
  ],
};
