import { Injectable, inject } from '@angular/core';
import { Auth as FirebaseAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, authState, signOut } from '@angular/fire/auth';
 
@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private auth: FirebaseAuth = inject(FirebaseAuth);
  public readonly authState$ = authState(this.auth);

  login(email: string, password: string) {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  signup(email: string, password: string) {
    return createUserWithEmailAndPassword(this.auth, email, password);
  }

  logout() {
    return signOut(this.auth);
  }
  
}
