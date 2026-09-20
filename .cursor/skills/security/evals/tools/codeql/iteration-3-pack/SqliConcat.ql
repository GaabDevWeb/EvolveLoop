/**
 * @name SQL injection via string concatenation
 * @description SQL query built by concatenating user-controlled input.
 * @kind problem
 * @id ag/iter3/js/sqli-concat
 * @problem.severity error
 * @security-severity 9.0
 * @precision medium
 * @tags security
 *   external/cwe/cwe-089
 */

import javascript

from AddExpr add, StringLiteral sl
where
  add.getAnOperand() = sl and
  sl.getValue().regexpMatch("(?i).*select.*from.*")
select add, "SQL query built via string concatenation with user input."
