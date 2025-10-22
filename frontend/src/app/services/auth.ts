import { Injectable, inject } from '@angular/core';
import { Auth as FirebaseAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, authState, signOut, updateProfile } from '@angular/fire/auth';
 
@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private auth: FirebaseAuth = inject(FirebaseAuth);
  public readonly authState$ = authState(this.auth);

  async login(email: string, password: string, rememberMe: boolean) {
    const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
    await setPersistence(this.auth, persistence);
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  async signup(name: string, email: string, password: string) {
    const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
    await updateProfile(userCredential.user, { displayName: name });
    return userCredential;
  }

  logout() {
    return signOut(this.auth);
  }

  getCurrentUserId(): string | null {
    return this.auth.currentUser ? this.auth.currentUser.uid : null;
  }
  
}
