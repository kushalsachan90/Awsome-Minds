import {
  fetchAuthSession,
  getCurrentUser,
  signIn,
  signInWithRedirect,
  signOut as cognitoSignOut,
} from "aws-amplify/auth";

export interface AuthUser {
  email: string;
  name: string;
  role: "admin" | "oncall" | "viewer";
  signInMethod: "cognito" | "password";
  signedInAt: string;
}

function mapUser(
  user: Awaited<ReturnType<typeof getCurrentUser>>,
  attributes?: Record<string, string | undefined>,
): AuthUser {
  const email =
    attributes?.email ||
    user.username ||
    "";

  const name =
    attributes?.name ||
    attributes?.preferred_username ||
    email.split("@")[0];

  return {
    email,
    name,
    role: "oncall",
    signInMethod: "cognito",
    signedInAt: new Date().toISOString(),
  };
}

/**
 * Restore the current Cognito session.
 */
export async function getSession(): Promise<AuthUser | null> {
  try {
    const session = await fetchAuthSession();

    if (!session.tokens?.accessToken) {
      return null;
    }

    const user = await getCurrentUser();

    return mapUser(user);
  } catch {
    return null;
  }
}

/**
 * Login through the real Amazon Cognito Hosted UI.
 *
 * Clicking "Continue with Cognito" redirects the browser
 * to the Cognito login page where the user enters:
 *
 * Email
 * Password
 *
 * After successful authentication Cognito redirects
 * back to the application.
 */
export async function signInWithCognito(): Promise<AuthUser> {
  await signInWithRedirect();

  /*
   * The browser is redirected to Cognito, so this code
   * normally does not continue to the return statement.
   *
   * Amplify restores the session after Cognito redirects
   * the user back to the application.
   */
  throw new Error("Redirecting to Amazon Cognito...");
}

/**
 * Direct email/password authentication through Cognito.
 *
 * This is kept available for the custom email/password
 * form if we decide to use it later.
 */
export async function signInWithPassword(
  email: string,
  password: string,
): Promise<AuthUser> {
  if (!email.includes("@")) {
    throw new Error("Invalid email address.");
  }

  if (!password) {
    throw new Error("Password is required.");
  }

  try {
    await signIn({
      username: email.trim(),
      password,
    });

    const user = await getCurrentUser();

    const session = await fetchAuthSession();

    if (!session.tokens?.accessToken) {
      throw new Error(
        "Authentication succeeded, but no access token was received.",
      );
    }

    return mapUser(user);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }

    throw new Error("Unable to sign in.");
  }
}

/**
 * Real Cognito logout.
 */
export async function signOut(): Promise<void> {
  try {
    await cognitoSignOut({
      global: true,
    });
  } finally {
    // Amplify manages Cognito session cleanup.
  }
}