/**
 * @name Open redirect via query parameter
 * @description Redirect target derived from user query parameter.
 * @kind problem
 * @id ag/iter3/js/open-redirect
 * @problem.severity warning
 * @security-severity 6.0
 * @precision low
 * @tags security
 *   external/cwe/cwe-601
 */

import javascript

from MethodCallExpr mc
where mc.getMethodName() = "redirect"
select mc, "res.redirect() call — verify redirect target is validated."
