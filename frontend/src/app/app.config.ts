import { ApplicationConfig, provideZoneChangeDetection, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { routes } from './app.routes';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { firebaseConfig } from '../../../firebaseConfig';
import { LucideAngularModule, PlusCircle, Pencil, Trash2, ArrowUpDown, Search, X, BookOpenText, Menu, CheckCircle2, XCircle, Sun, Moon, Settings } from 'lucide-angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimations(),
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    importProvidersFrom(LucideAngularModule.pick({ PlusCircle, Pencil, Trash2, ArrowUpDown, Search, X, BookOpenText, Menu, CheckCircle2, XCircle, Sun, Moon, Settings })),
  ],
};
