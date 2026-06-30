import { randomBytes } from 'node:crypto';

if (process.argv.includes('--check')) {
  const sample = randomBytes(48).toString('base64url');
  if (sample.length < 48) {
    console.error('JWT secret generator check failed.');
    process.exit(1);
  }

  console.log('JWT secret generator check passed.');
  process.exit(0);
}

const secret = randomBytes(48).toString('base64url');

console.log('Generated production JWT secret');
console.log('');
console.log(`JWT_SECRET=${secret}`);
console.log('');
console.log('Paste this into Render as JWT_SECRET.');
console.log('Do not commit it to GitHub, screenshots, chat, or documentation.');
