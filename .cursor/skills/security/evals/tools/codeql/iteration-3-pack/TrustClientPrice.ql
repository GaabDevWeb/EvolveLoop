/**
 * @name Client-controlled price in checkout
 * @description Price variable used in payment calculation (often from req.body).
 * @kind problem
 * @id ag/iter3/js/trust-client-price
 * @problem.severity warning
 * @security-severity 7.0
 * @precision medium
 * @tags security
 *   external/cwe/cwe-1284
 */

import javascript

from MulExpr mul, Expr operand
where
  mul.getAnOperand() = operand and
  operand.(VarAccess).getName() = "price"
select mul, "Checkout uses price variable in total calculation (never trust client)."
