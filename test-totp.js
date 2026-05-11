import { verifySync, generateSecret, generateURI } from 'otplib';
const secret = generateSecret();
const isValidIdk = verifySync({ token: "111111", secret: secret, strategy: 'totp' });
console.log("verifySync 111111:", isValidIdk);



