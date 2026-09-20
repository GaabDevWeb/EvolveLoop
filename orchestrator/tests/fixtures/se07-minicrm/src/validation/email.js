/**
 * Email validation — brownfield stub (accepts almost anything).
 * SE-07 repair path replaces with proper validation.
 */
export function isValidEmail(email) {
  return typeof email === "string" && email.length > 0;
}
