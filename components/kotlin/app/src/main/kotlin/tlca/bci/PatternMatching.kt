package tlca.bci

import tlca.*

const val TUPLE_DATA_NAME = "\$\$TUPLE"

fun transformPattern(e: Expression, env: TypeEnv): Expression {
    fun transform(e: Expression): Expression = when (e) {
        is AppExpression -> AppExpression(transform(e.e1), transform(e.e2))
        is CaseExpression -> e
        ErrorExpression -> e
        FailExpression -> e
        is FatBarExpression -> FatBarExpression(transform(e.left), transform(e.right))
        is IfExpression -> IfExpression(transform(e.e1), transform(e.e2), transform(e.e3))
        is LBoolExpression -> e
        is LIntExpression -> e
        is LStringExpression -> e
        is LTupleExpression -> LTupleExpression(e.es.map { transform(it) })
        LUnitExpression -> e
        is LamExpression -> LamExpression(e.n, transform(e.e))
        is LetExpression -> LetExpression(
            e.decls.map { Declaration(it.n, transform(it.e)) }, if (e.expr == null) null else transform(e.expr)
        )

        is LetRecExpression -> LetRecExpression(
            e.decls.map { Declaration(it.n, transform(it.e)) }, if (e.expr == null) null else transform(e.expr)
        )

        is MatchExpression -> {
            val matchExpression = transform(e.e)
            val variable = if (matchExpression is VarExpression) matchExpression.name else "_x"

            val match = fullMatch(
                listOf(variable), e.cases.map { Equation(listOf(it.pattern), transform(it.expr)) }, ErrorExpression, PatternEnvironment(env)
            )

            if (matchExpression is VarExpression) match
            else LetExpression(listOf(Declaration(variable, matchExpression)), match)
        }

        is OpExpression -> OpExpression(transform(e.e1), transform(e.e2), e.op)
        is VarExpression -> e
    }

    return transform(e)
}

data class PatternEnvironment(private val typeEnv: TypeEnv) {
    fun arity(constructor: String): Int = typeEnv.findConstructor(constructor)?.first?.arity ?: throw Exception("Unknown constructor: $constructor")

    fun constructors(name: String): List<String> = if (name == TUPLE_DATA_NAME) listOf(TUPLE_DATA_NAME)
    else typeEnv.findConstructor(name)?.second?.constructors?.map { it.name } ?: throw Exception("Unknown ADT: $name")

    private var counter = 0

    fun makeVar(): String = "_u${counter++}"
}

data class Equation(val patterns: List<Pattern>, val body: Expression, val guard: Expression? = null) {
    fun isVar(): Boolean = patterns.isNotEmpty() && patterns[0] is PVarPattern

    fun isCon(): Boolean = patterns.isNotEmpty() && patterns[0] is PDataPattern

    fun getCon(): String = (patterns[0] as PDataPattern).name
}

fun canError(e: Expression): Boolean = when (e) {
    is AppExpression -> canError(e.e1) || canError(e.e2)
    is CaseExpression -> e.clauses.any { canError(it.expression) }
    ErrorExpression -> true
    is FatBarExpression -> canError(e.left) || canError(e.right)
    is IfExpression -> canError(e.e1) || canError(e.e2) || canError(e.e3)
    is OpExpression -> canError(e.e1) || canError(e.e2)
    is LTupleExpression -> e.es.any { canError(it) }
    is LetExpression -> if (e.expr == null) false else canError(e.expr)
    is LetRecExpression -> if (e.expr == null) false else canError(e.expr)
    else -> false
}

fun <T> partition(list: List<T>, predicate: (T) -> Boolean): List<List<T>> {
    fun combine(e: T, acc: List<List<T>>): List<List<T>> {
        if (acc.isEmpty()) return listOf(listOf(e))

        val v = acc.first().first()

        if (predicate(v) == predicate(e)) return listOf(listOf(e) + acc.first()) + acc.drop(1)

        return listOf(listOf(e)) + acc
    }

    return list.foldRight(emptyList()) { e, acc -> combine(e, acc) }
}

fun removeLiterals(equations: List<Equation>): List<Equation> {
    var counter = 0

    fun nextVarName(): String = "_l${counter++}"

    fun removeLiterals(equation: Equation): Equation {
        var guard = equation.guard

        fun removeLiterals(pattern: Pattern): Pattern = when (pattern) {
            is PDataPattern -> PDataPattern(pattern.name, pattern.args.map { removeLiterals(it) })
            is PIntPattern -> {
                val name = nextVarName()
                val expr = OpExpression(VarExpression(name), LIntExpression(pattern.v), Op.Equals)

                guard = if (guard == null) expr else IfExpression(guard!!, expr, LBoolExpression(false))

                PVarPattern(name)
            }

            is PStringPattern -> {
                val name = nextVarName()
                val expr = AppExpression(AppExpression(VarExpression("string_equal"), VarExpression(name)), LStringExpression(pattern.v))

                guard = if (guard == null) expr else IfExpression(guard!!, expr, LBoolExpression(false))

                PVarPattern(name)
            }

            is PTuplePattern -> PDataPattern(TUPLE_DATA_NAME, pattern.values.map { removeLiterals(it) })
            is PUnitPattern -> PVarPattern(nextVarName())
            is PVarPattern -> pattern
            is PWildcardPattern -> PVarPattern(nextVarName())
            is PBoolPattern -> {
                val name = nextVarName()
                val expr = if (pattern.v) VarExpression(name)
                else IfExpression(VarExpression(name), LBoolExpression(false), LBoolExpression(true))

                guard = if (guard == null) expr else IfExpression(guard!!, expr, LBoolExpression(false))

                PVarPattern(name)
            }
        }

        return Equation(equation.patterns.map { removeLiterals(it) }, equation.body, guard)
    }

    return equations.map { removeLiterals(it) }
}

fun tidyUpFails(e: Expression): Expression {
    fun replaceFailWithError(ep: Expression): Expression = when (ep) {
        is AppExpression -> AppExpression(replaceFailWithError(ep.e1), replaceFailWithError(ep.e2))
        is CaseExpression -> CaseExpression(ep.variable, ep.clauses.map { Clause(it.constructor, it.variables, replaceFailWithError(it.expression)) })

        FailExpression -> ErrorExpression
        is FatBarExpression -> FatBarExpression(ep.left, replaceFailWithError(ep.right))
        is IfExpression -> IfExpression(replaceFailWithError(ep.e1), replaceFailWithError(ep.e2), replaceFailWithError(ep.e3))
        is OpExpression -> OpExpression(replaceFailWithError(ep.e1), replaceFailWithError(ep.e2), ep.op)
        is LTupleExpression -> LTupleExpression(ep.es.map { replaceFailWithError(it) })
        is LamExpression -> LamExpression(ep.n, replaceFailWithError(ep.e))
        is LetExpression -> if (ep.expr == null) ep else LetExpression(
            ep.decls.map { Declaration(it.n, replaceFailWithError(it.e)) }, replaceFailWithError(ep.expr)
        )

        is LetRecExpression -> if (ep.expr == null) ep else LetRecExpression(
            ep.decls.map { Declaration(it.n, replaceFailWithError(it.e)) }, replaceFailWithError(ep.expr)
        )

        is MatchExpression -> throw IllegalStateException("Match expressions should be desugared")
        else -> ep
    }

    return when (e) {
        is AppExpression -> AppExpression(tidyUpFails(e.e1), tidyUpFails(e.e2))
        is CaseExpression -> CaseExpression(e.variable, e.clauses.map { Clause(it.constructor, it.variables, tidyUpFails(it.expression)) })
        is FatBarExpression -> when (e.right) {
            ErrorExpression -> tidyUpFails(replaceFailWithError(e.left))
            FailExpression -> tidyUpFails(e.left)
            else -> FatBarExpression(tidyUpFails(e.left), tidyUpFails(e.right))
        }

        is IfExpression -> IfExpression(tidyUpFails(e.e1), tidyUpFails(e.e2), tidyUpFails(e.e3))
        is OpExpression -> OpExpression(tidyUpFails(e.e1), tidyUpFails(e.e2), e.op)
        is LTupleExpression -> LTupleExpression(e.es.map { tidyUpFails(it) })
        is LamExpression -> LamExpression(e.n, tidyUpFails(e.e))
        is LetExpression -> if (e.expr == null) e else LetExpression(e.decls.map { Declaration(it.n, tidyUpFails(it.e)) }, tidyUpFails(e.expr))
        is LetRecExpression -> if (e.expr == null) e else LetRecExpression(e.decls.map { Declaration(it.n, tidyUpFails(it.e)) }, tidyUpFails(e.expr))
        is MatchExpression -> throw IllegalStateException("Match expressions should be desugared")
        else -> e
    }
}

fun removeUnusedVariables(e: Expression): Expression {
    fun variables(e: Expression): Set<String> = when (e) {
        is AppExpression -> variables(e.e1) + variables(e.e2)
        is CaseExpression -> {
            setOf(e.variable) + e.clauses.flatMap {
                variables(it.expression) - it.variables.filterNotNull().toSet()
            }.toSet()
        }

        is FatBarExpression -> variables(e.left) + variables(e.right)
        is IfExpression -> variables(e.e1) + variables(e.e2) + variables(e.e3)
        is OpExpression -> variables(e.e1) + variables(e.e2)
        is VarExpression -> setOf(e.name)
        is LTupleExpression -> e.es.flatMap { variables(it) }.toSet()
        is LamExpression -> variables(e.e) - setOf(e.n)
        is LetExpression -> if (e.expr == null) emptySet() else variables(e.expr) + e.decls.flatMap { variables(it.e) - setOf(it.n) }.toSet()
        is LetRecExpression -> if (e.expr == null) emptySet() else variables(e.expr) + e.decls.flatMap { variables(it.e) - setOf(it.n) }.toSet()
        is MatchExpression -> throw IllegalStateException("Match expressions should be desugared")
        else -> emptySet()
    }

    return when (e) {
        is AppExpression -> AppExpression(removeUnusedVariables(e.e1), removeUnusedVariables(e.e2))
        is CaseExpression -> CaseExpression(e.variable, e.clauses.map {
            val vs = variables(it.expression)
            Clause(it.constructor, it.variables.map { v -> if (vs.contains(v)) v else null }, removeUnusedVariables(it.expression))
        })

        is FatBarExpression -> FatBarExpression(removeUnusedVariables(e.left), removeUnusedVariables(e.right))
        is IfExpression -> IfExpression(removeUnusedVariables(e.e1), removeUnusedVariables(e.e2), removeUnusedVariables(e.e3))
        is OpExpression -> OpExpression(removeUnusedVariables(e.e1), removeUnusedVariables(e.e2), e.op)
        is LTupleExpression -> LTupleExpression(e.es.map { removeUnusedVariables(it) })
        is LamExpression -> LamExpression(e.n, removeUnusedVariables(e.e))
        is LetExpression -> LetExpression(
            e.decls.map { Declaration(it.n, removeUnusedVariables(it.e)) },
            if (e.expr == null) null else removeUnusedVariables(e.expr)
        )

        is LetRecExpression -> LetRecExpression(
            e.decls.map { Declaration(it.n, removeUnusedVariables(it.e)) },
            if (e.expr == null) null else removeUnusedVariables(e.expr)
        )

        is MatchExpression -> throw IllegalStateException("Match expressions should be desugared")
        else -> e
    }
}


fun match(variables: List<String>, equations: List<Equation>, e: Expression, env: PatternEnvironment): Expression {
    fun subst(e: Expression, old: String, new: String): Expression = when (e) {
        is AppExpression -> AppExpression(subst(e.e1, old, new), subst(e.e2, old, new))
        is CaseExpression -> CaseExpression(if (e.variable == old) new else e.variable, e.clauses.map {
            Clause(
                it.constructor, it.variables, if (it.variables.contains(old)) it.expression else subst(it.expression, old, new)
            )
        })

        is FatBarExpression -> FatBarExpression(subst(e.left, old, new), subst(e.right, old, new))
        is IfExpression -> IfExpression(subst(e.e1, old, new), subst(e.e2, old, new), subst(e.e3, old, new))
        is OpExpression -> OpExpression(subst(e.e1, old, new), subst(e.e2, old, new), e.op)
        is VarExpression -> if (e.name == old) VarExpression(new) else e
        is LTupleExpression -> LTupleExpression(e.es.map { subst(it, old, new) })
        is LamExpression -> if (e.n == old) e else LamExpression(e.n, subst(e.e, old, new))
        is LetExpression -> LetExpression(e.decls.map { Declaration(it.n, subst(it.e, old, new)) }, if (e.expr == null) null else subst(e.expr, old, new))
        is LetRecExpression -> LetRecExpression(e.decls.map { Declaration(it.n, subst(it.e, old, new)) }, if (e.expr == null) null else subst(e.expr, old, new))
        is MatchExpression -> throw IllegalStateException("Match expressions should be desugared")
        else -> e
    }

    fun matchVar(variables: List<String>, equations: List<Equation>, e: Expression): Expression {
        val u = variables.first()
        val us = variables.drop(1)

        return match(us, equations.map {
            val variable = (it.patterns[0] as PVarPattern).name

            Equation(it.patterns.drop(1), subst(it.body, variable, u), if (it.guard == null) null else subst(it.guard, variable, u))
        }, e, env)
    }

    fun matchClause(constructor: String, variables: List<String>, equations: List<Equation>, e: Expression): Clause {
        val us = variables.drop(1)

        val kp = if (constructor == TUPLE_DATA_NAME) (equations[0].patterns[0] as PDataPattern).args.size
        else env.arity(constructor)
        val usp = List(kp) { env.makeVar() }

        return Clause(
            constructor, usp, match(usp + us, equations.map {
                val args = (it.patterns[0] as PDataPattern).args

                Equation(args + it.patterns.drop(1), it.body, it.guard)
            }, e, env)
        )
    }

    fun matchCon(variables: List<String>, equations: List<Equation>, e: Expression): Expression {
        val u = variables.first()

        fun choose(constructor: String, equations: List<Equation>): List<Equation> = equations.filter { it.isCon() && it.getCon() == constructor }

        return FatBarExpression(
            CaseExpression(u,
                env.constructors(equations.first().getCon())
                    .map { constructor -> matchClause(constructor, variables, choose(constructor, equations), FailExpression) }), e
        )
    }

    fun matchVarCon(variables: List<String>, equations: List<Equation>, e: Expression): Expression = when {
        equations.first().isVar() -> matchVar(variables, equations, e)
        equations.first().isCon() -> matchCon(variables, equations, e)
        else -> throw IllegalArgumentException("First equation must be a variable or constructor: ${equations.first()}")
    }

    if (variables.isEmpty()) {
        fun combine(equation: Equation, expr: Expression): Expression {
            val guard = equation.guard

            return if (guard != null) IfExpression(guard, equation.body, expr)
            else if (canError(equation.body)) FatBarExpression(equation.body, expr)
            else equation.body
        }

        return equations.foldRight(e) { equation, expr -> combine(equation, expr) }
    }

    val partitions = partition(equations) { it.isVar() }
    return partitions.foldRight(e) { eqns, ep -> matchVarCon(variables, eqns, ep) }
}

fun fullMatch(variables: List<String>, equations: List<Equation>, e: Expression, env: PatternEnvironment): Expression {
    val eqn1 = removeLiterals(equations)
    val e2 = match(variables, eqn1, e, env)
    val e3 = tidyUpFails(e2)

    return removeUnusedVariables(e3)
}
