const { CognitoJwtVerifier } = require('aws-jwt-verify');
let verifier;
function getVerifier() {
  if (verifier) return verifier;
  const userPoolId = process.env.AUTH_COGNITO_USER_POOL_ID;
  const clientId = process.env.AUTH_COGNITO_CLIENT_ID;
  if (!userPoolId || !clientId) throw new Error('AUTH_COGNITO_USER_POOL_ID and AUTH_COGNITO_CLIENT_ID are required');
  verifier = CognitoJwtVerifier.create({ userPoolId, tokenUse: 'access', clientId }); return verifier;
}
function token(event) { const h = event.headers || {}; return (h.authorization || h.Authorization || event.identitySource?.[0] || '').replace(/^Bearer\s+/i, '').trim(); }
exports.handler = async (event) => { try { const claims = await getVerifier().verify(token(event)); return { isAuthorized: true, context: { sub: claims.sub, username: claims.username || claims.sub, email: claims.email || '' } }; } catch (error) { console.warn('Authorization denied:', error.message); return { isAuthorized: false, context: {} }; } };
