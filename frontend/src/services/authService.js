import {
  signInWithPopup,
  signOut,
} from "firebase/auth";

import {
  auth,
  googleProvider,
} from "../firebase";

export async function loginWithGoogle() {
  const result = await signInWithPopup(
    auth,
    googleProvider
  );

  return result.user;
}

export async function logoutUser() {
  await signOut(auth);
}
