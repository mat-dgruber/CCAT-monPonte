import { Injectable, inject } from '@angular/core';
import { Auth as FirebaseAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, authState, signOut, updateProfile, browserLocalPersistence, browserSessionPersistence, setPersistence, AuthError, updateEmail, updatePassword, sendPasswordResetEmail, reauthenticateWithCredential, EmailAuthProvider, deleteUser, sendEmailVerification, User } from '@angular/fire/auth';
 
@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private auth: FirebaseAuth = inject(FirebaseAuth);
  public readonly authState$ = authState(this.auth);

  async login(email: string, password: string, rememberMe: boolean) {
    try {
      const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(this.auth, persistence);
      return await signInWithEmailAndPassword(this.auth, email, password);
    } catch (e) {
      throw e as AuthError;
    }
  }

  async signup(name: string, email: string, password: string) {
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });
      return userCredential;
    } catch (e) {
      throw e as AuthError;
    }
  }

  logout() {
    return signOut(this.auth);
  }

  getCurrentUserId(): string | null {
    return this.auth.currentUser ? this.auth.currentUser.uid : null;
  }
  
  updateProfile(profile: { displayName?: string; photoURL?: string; }) {
    if (!this.auth.currentUser) {
      throw new Error("User not logged in");
    }
    return updateProfile(this.auth.currentUser, profile);
  }

  updateEmail(newEmail: string) {
    if (!this.auth.currentUser) {
      throw new Error("User not logged in");
    }
    return updateEmail(this.auth.currentUser, newEmail);
  }

  updatePassword(newPassword: string) {
    if (!this.auth.currentUser) {
      throw new Error("User not logged in");
    }
    return updatePassword(this.auth.currentUser, newPassword);
  }

  sendPasswordResetEmail(email: string) {
    return sendPasswordResetEmail(this.auth, email);
  }

  async reauthenticate(password: string) {
    const user = this.auth.currentUser;
    if (!user || !user.email) {
      throw new Error("User not logged in or email not available.");
    }
    const credential = EmailAuthProvider.credential(user.email, password);
    return reauthenticateWithCredential(user, credential);
  }

  async deleteAccount() {
    const user = this.auth.currentUser;
    if (!user) {
      throw new Error("User not logged in");
    }
    return deleteUser(user);
  }

  async sendEmailVerification(user: User) {
    return sendEmailVerification(user);
  }
}
