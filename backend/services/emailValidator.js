import validator from 'deep-email-validator';

// Many providers (e.g., Gmail) block SMTP VRFY/RCPT checks, causing false negatives.
// We allow toggling SMTP validation via env and soften failures due to SMTP-only errors.
export async function verifyEmailDeliverability(email) {
  try {
    const validateSMTP = (process.env.VALIDATE_SMTP || 'false').toLowerCase() === 'true';
    const sender = process.env.EMAIL_USER || 'noreply@taskflow.local';

    const result = await validator.validate({
      email,
      sender,
      validateRegex: true,
      validateMx: true,
      validateTypo: true,
      validateDisposable: true,
      // Enable only if explicitly turned on; otherwise many legit emails will fail
      validateSMTP
    });

    // If it's invalid solely due to SMTP check, treat as soft pass by default
    if (!result.valid && result.reason === 'smtp' && !validateSMTP) {
      return { valid: true, reason: 'smtp_soft_fail' };
    }

    return result; // { valid, reason, validators }
  } catch (error) {
    return { valid: false, reason: 'unknown', error: error.message };
  }
}


