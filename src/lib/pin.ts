/**
 * PIN rules, shared by the login form, the admin user API and the auth provider.
 *
 * These lived in three places with three different answers (4-8, 4-6 and 4-8
 * digits), so a PIN accepted by one could be rejected by another.
 */

export const PIN_MIN_LENGTH = 4;
export const PIN_MAX_LENGTH = 6;

/** Digits only, PIN_MIN_LENGTH to PIN_MAX_LENGTH long. */
export const PIN_PATTERN = /^\d{4,6}$/;

export const PIN_RULE_MESSAGE = `PIN must be ${PIN_MIN_LENGTH}-${PIN_MAX_LENGTH} digits`;

export function isValidPin(pin: string): boolean {
  return PIN_PATTERN.test(pin);
}
