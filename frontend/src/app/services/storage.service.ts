import { Injectable, inject } from '@angular/core';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private storage: Storage = inject(Storage);

  uploadProfileImage(file: File, userId: string): Observable<string> {
    // 1. Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('O arquivo deve ser uma imagem.');
    }

    // 2. Define the path: profile_images/{userId}.{ext}
    const extension = file.name.split('.').pop();
    const filePath = `profile_images/${userId}.${extension}`;
    const storageRef = ref(this.storage, filePath);

    // 3. Upload and get URL
    const uploadTask = uploadBytes(storageRef, file);

    return from(uploadTask).pipe(
      switchMap(() => getDownloadURL(storageRef))
    );
  }
}
