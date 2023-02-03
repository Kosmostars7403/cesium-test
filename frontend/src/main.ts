import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';

//@ts-ignore
window['CESIUM_BASE_URL'] = '/assets/cesium/';

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
