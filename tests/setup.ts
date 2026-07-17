import 'dotenv/config';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??= 'postgresql://flouba:flouba@localhost:5432/flouba_lite_test?schema=public';
process.env.BASE44_API_KEY ??= 'test-base44-api-key-that-is-at-least-32-characters';
process.env.MT5_ROBOT_API_KEY ??= 'test-mt5-robot-api-key-that-is-at-least-32-chars';
process.env.INTERNAL_ADMIN_API_KEY ??= 'test-internal-api-key-that-is-at-least-32-chars';
process.env.JWT_SECRET ??= 'test-jwt-secret-that-is-at-least-32-characters';
process.env.ENCRYPTION_KEY ??= '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.BASE44_HMAC_SECRET ??= 'test-hmac-secret-that-is-at-least-32-characters';
process.env.ALLOWED_ORIGINS ??= 'http://localhost:3000';
process.env.ENABLE_HMAC_VALIDATION = 'false';
