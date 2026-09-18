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
redirectSignIn: ["https://main.dnm026v1cdxmp.amplifyapp.com/"],
redirectSignOut: ["https://main.dnm026v1cdxmp.amplifyapp.com/"],
          responseType: "code",
        },
      },
    },
  },
});