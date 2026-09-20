/**
 * @name Dynamic SQL fragment concatenation
 * @description SQL string built dynamically; may be safe if parameters are bound separately.
 * @kind problem
 * @id ag/iter3/js/sqli-dynamic
 * @problem.severity warning
 * @security-severity 5.0
 * @precision low
 * @tags security
 *   external/cwe/cwe-089
 */

import javascript

from AddExpr add, StringLiteral sl
where
  add.getAnOperand() = sl and
  sl.getValue().regexpMatch("(?i).*where.*") and
  not sl.getValue().regexpMatch("(?i).*select.*from.*")
select add, "Dynamic SQL fragment concatenation (verify parameterization)."
