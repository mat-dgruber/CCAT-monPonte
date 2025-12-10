import { ApplicationConfig, provideZoneChangeDetection, importProvidersFrom, isDevMode } from '@angular/core';
import { provideServiceWorker } from '@angular/service-worker';
import { provideRouter, withRouterConfig } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { routes } from './app.routes';
import { initializeApp, provideFirebaseApp, getApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore, initializeFirestore, persistentLocalCache } from '@angular/fire/firestore';
import { firebaseConfig } from '../../../firebaseConfig';
import { LucideAngularModule, PlusCircle, Pencil, Trash2, ArrowUpDown, Search, X, BookOpenText, Menu, CheckCircle2, XCircle, Sun, Moon, Settings, Plus, ArrowLeft, MoreVertical, Star, Bold, Italic, Strikethrough, Pilcrow, List, ListOrdered, Code, Quote, Minus, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify, Link, Youtube, Highlighter, Pin, ChevronUp, ChevronDown, FileText, Bug, Info, Ellipsis, Copy, LogOut, ChevronRight, ChevronLeft, History, Download } from 'lucide-angular';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withRouterConfig({ onSameUrlNavigation: 'reload' })),
    provideAnimationsAsync(),
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideAuth(() => getAuth()),
    provideFirestore(() => initializeFirestore(getApp(), {
      localCache: persistentLocalCache(),
      experimentalForceLongPolling: true,
    })),
    importProvidersFrom(LucideAngularModule.pick({ PlusCircle, Pencil, Trash2, ArrowUpDown, Search, X, BookOpenText, Menu, CheckCircle2, XCircle, Sun, Moon, Settings, Plus, ArrowLeft, MoreVertical, Star, Bold, Italic, Strikethrough, Pilcrow, List, ListOrdered, Code, Quote, Minus, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify, Link, Youtube, Highlighter, Pin, ChevronUp, ChevronDown, FileText, Bug, Info, Ellipsis, Copy, LogOut, ChevronRight, ChevronLeft, History, Download })),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    })
  ],
};