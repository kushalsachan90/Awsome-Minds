import { Amplify } from "aws-amplify";

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: "ap-south-1_7ZqFxIj2M",
      userPoolClientId: "2kgvb6ojs4qqtannklbcjlmul9",
      loginWith: {
        oauth: {
          domain:
            "self-healing-691588646018.auth.ap-south-1.amazoncognito.com",
          scopes: ["openid", "email", "profile"],
          redirectSignIn: ["http://localhost:5173/"],
          redirectSignOut: ["http://localhost:5173/"],
          responseType: "code",
        },
      },
    },
  },
});