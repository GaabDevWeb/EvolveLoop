/**
 * @name Mass assignment via object spread
 * @description User-controlled object spread into entity creation.
 * @kind problem
 * @id ag/iter3/js/mass-assignment
 * @problem.severity error
 * @security-severity 8.0
 * @precision medium
 * @tags security
 *   external/cwe/cwe-915
 */

import javascript

from SpreadElement spread, PropAccess pa
where pa = spread.getOperand() and pa.getPropertyName() = "body"
select spread, "Mass assignment: spreading req.body into object creation."
