import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideImageEditor } from 'ngx-image-editor';

/**
 * Demo premium license. Bound to demo hosts and expires 2027-08-10.
 * Reissue with:
 *   npm run license -- --licensee "ngx-image-editor demo" \
 *     --domains "ngx-image-editor.ebdev-design.com,localhost,127.0.0.1"
 */
const DEMO_LICENSE_KEY =
  'eyJwIjoiZXlKd2JHRnVJam9pY0hKbGJXbDFiU0lzSW1abFlYUjFjbVZ6SWpwYkltSnlkWE5vSWl3aVpYSmhjMlZ5SWl3aWJXRnphM01pTENKbmNtOTFjSE1pTENKaWJHVnVaRTF2WkdWeklpd2lZV1IyWVc1alpXUlRaV3hsWTNScGIyNGlMQ0pqYkc5dVpWTjBZVzF3SWl3aWFHVmhiR2x1WnlJc0luQmxjbk53WldOMGFYWmxJaXdpZDJGeWNDSXNJbXhoZVdWeVUzUjViR1Z6SWl3aVlXUnFkWE4wYldWdWRFeGhlV1Z5Y3lJc0ltNXZia1JsYzNSeWRXTjBhWFpsUm1sc2RHVnljeUlzSW1WNGRHVnVaR1ZrUm1sc2RHVnljeUlzSW1WNGNHOXlkRk4yWnlKZExDSmxlSEJwY25raU9pSXlNREkzTFRBNExURXdJaXdpYkdsalpXNXpaV1VpT2lKdVozZ3RhVzFoWjJVdFpXUnBkRzl5SUdSbGJXOGlMQ0prYjIxaGFXNXpJanBiSW01bmVDMXBiV0ZuWlMxbFpHbDBiM0l1WldKa1pYWXRaR1Z6YVdkdUxtTnZiU0lzSW14dlkyRnNhRzl6ZENJc0lqRXlOeTR3TGpBdU1TSmRMQ0p3Y205a2RXTjBJam9pUUdWaVpHVjJMMjVuZUMxcGJXRm5aUzFsWkdsMGIzSWlMQ0pyYVdRaU9pSnVhV1V0TWpBeU5pMHdPQ0o5IiwicyI6ImdIbGp4Mk1hRHdMeTRJdUlmdnNHOFlkUm1LMGx2VnJMRGszTU1HQUZkYzJPMkcrcmw0MWx4UnNrclVwby95TG15QStDR0UxSmVhaHN3RFpYd3pyWENBPT0ifQ==';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideImageEditor({
      licenseKey: DEMO_LICENSE_KEY,
      theme: 'dark',
      canvasWidth: 1200,
      canvasHeight: 800,
    }),
  ],
};
