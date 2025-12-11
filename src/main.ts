import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { importProvidersFrom } from '@angular/core';
import { IonicStorageModule } from '@ionic/storage-angular';
import { addIcons } from 'ionicons';
import {
  documentTextOutline,
  chatboxOutline,
  schoolOutline,
  listOutline,
  peopleOutline,
  personOutline,
  checkmarkCircle,
  serverOutline,
  buildOutline,
  cloudDownloadOutline,
  cloudUploadOutline,
  informationCircleOutline,
  trashOutline,
  warningOutline,
  logoAngular,
  phonePortraitOutline,
  logoJavascript,
  cloudOutline,
  ribbonOutline,
  closeCircle,
  readerOutline,
  addCircleOutline,
  cloudDoneOutline,
  closeOutline,
  trashBinOutline,
  alertCircleOutline,
  searchOutline,
  bookOutline,
  downloadOutline,
  createOutline,
  arrowDownCircleOutline,
  checkmarkCircleOutline,
  documentOutline,
  saveOutline,
  eyeOutline,
  refreshOutline
} from 'ionicons/icons';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { isDevMode } from '@angular/core';
import { provideServiceWorker } from '@angular/service-worker';

// Registrar iconos de Ionicons
addIcons({
  'document-text-outline': documentTextOutline,
  'chatbox-outline': chatboxOutline,
  'school-outline': schoolOutline,
  'list-outline': listOutline,
  'people-outline': peopleOutline,
  'person-outline': personOutline,
  'checkmark-circle': checkmarkCircle,
  'server-outline': serverOutline,
  'build-outline': buildOutline,
  'cloud-download-outline': cloudDownloadOutline,
  'cloud-upload-outline': cloudUploadOutline,
  'information-circle-outline': informationCircleOutline,
  'trash-outline': trashOutline,
  'warning-outline': warningOutline,
  'logo-angular': logoAngular,
  'phone-portrait-outline': phonePortraitOutline,
  'logo-javascript': logoJavascript,
  'cloud-outline': cloudOutline,
  'ribbon-outline': ribbonOutline,
  'close-circle': closeCircle,
  'reader-outline': readerOutline,
  'add-circle-outline': addCircleOutline,
  'cloud-done-outline': cloudDoneOutline,
  'close-outline': closeOutline,
  'trash-bin-outline': trashBinOutline,
  'alert-circle-outline': alertCircleOutline,
  'search-outline': searchOutline,
  'book-outline': bookOutline,
  'download-outline': downloadOutline,
  'create-outline': createOutline,
  'arrow-down-circle-outline': arrowDownCircleOutline,
  'checkmark-circle-outline': checkmarkCircleOutline,
  'document-outline': documentOutline,
  'save-outline': saveOutline,
  'eye-outline': eyeOutline,
  'refresh-outline': refreshOutline
});

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideAnimations(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    importProvidersFrom(IonicStorageModule.forRoot()),
    provideServiceWorker('ngsw-worker.js', {
            enabled: !isDevMode(),
            registrationStrategy: 'registerWhenStable:30000'
          }),
  ],
});
