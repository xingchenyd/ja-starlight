const allowed = ['AUTH_PEPPER', 'AUTH_SEED_ADMIN_KEY', 'AUTH_SEED_STUDENT_PASSWORD', 'AUTH_SEED_ENTERPRISE_PASSWORD', 'AUTH_TRUSTED_ORIGINS', 'RESEND_API_KEY', 'MAIL_FROM', 'MAIL_REPLY_TO'];
export function configureRuntime(config, target = process.env) {
  if (typeof config.AUTH_PEPPER !== 'string' || config.AUTH_PEPPER.length < 24) throw new Error('Original AUTH_PEPPER is required');
  for (const key of allowed) if (typeof config[key] === 'string') target[key] = config[key];
  target.STARLIGHT_TEST_MODE = 'false';
}
