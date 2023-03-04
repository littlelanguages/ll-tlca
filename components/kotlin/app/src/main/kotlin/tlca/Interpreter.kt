package tlca

data class Environment(val runtimeEnv: RuntimeEnv, val typeEnv: TypeEnv)

val emptyEnvironment = Environment(emptyMap(), emptyTypeEnv)

val defaultEnvironment = Environment(
    mapOf(
        "string_length" to { s: String -> s.length },
        "string_concat" to { s1: String -> { s2: String -> s1 + s2 } },
        "string_substring" to { s: String -> { start: Int -> { end: Int -> stringSubstring(s, start, end) } } },
        "string_equal" to { s1: String -> { s2: String -> s1 == s2 } },
        "string_compare" to { s1: String -> { s2: String -> if (s1 < s2) -1 else if (s1 == s2) 0 else 1 } },
    ), defaultTypeEnv
)

fun stringSubstring(str: String, start: Int, end: Int): String {
    if (start > end) return ""
    val length = str.length
    val s = if (start < 0) 0 else if (start > length) length else start
    val e = if (end < 0) 0 else if (end > length) length else end
    return str.substring(s, e)
}

typealias Value = Any

typealias RuntimeEnv = Map<String, Value?>

data class TypedValue(val value: Value?, val type: Type?)

data class ExecuteResult(val values: List<TypedValue>, val env: Environment)

fun execute(ast: List<Element>, defaultEnv: Environment = emptyEnvironment): ExecuteResult {
    val values = mutableListOf<TypedValue>()
    var env = defaultEnv

    for (e in ast) {
        env = executeElement(e, env, values)
    }

    return ExecuteResult(values, env)
}

private fun executeElement(
    e: Element,
    env: Environment,
    values: MutableList<TypedValue>
): Environment =
    when (e) {
        is Expression ->
            executeExpression(e, env, values)

        is DataDeclaration ->
            executeDataDeclaration(e, env, values)
    }


private fun executeExpression(
    e: Expression,
    env: Environment,
    values: MutableList<TypedValue>
): Environment {
    val pump = Pump()
    val inferResult = infer(env.typeEnv, e, Constraints(), pump)

    val subst = inferResult.constraints.solve()
    val type = inferResult.type.apply(subst)

    val evaluateResult: EvaluateResult = when (e) {
        is LetExpression -> evaluateDeclarations(e.decls, e.expr, env.runtimeEnv)
        is LetRecExpression -> evaluateDeclarations(e.decls, e.expr, env.runtimeEnv)
        else -> EvaluateResult(evaluate(e, env.runtimeEnv), env.runtimeEnv)
    }

    values.add(TypedValue(evaluateResult.value, type))

    return Environment(evaluateResult.env, inferResult.typeEnv)
}

private fun executeDataDeclaration(
    dd: DataDeclaration,
    initialEnv: Environment,
    values: MutableList<TypedValue>
): Environment {
    var env = initialEnv

    for (d in dd.decls) {
        if (env.typeEnv.data(d.name) != null) {
            throw RuntimeException("Data type ${d.name} already exists")
        }
        env = env.copy(typeEnv = env.typeEnv.addData(DataDefinition(d.name, d.parameters, emptyList())))
    }

    val adts: MutableList<DataDefinition> = mutableListOf()
    for (d in dd.decls) {
        val adt = DataDefinition(d.name, d.parameters, d.constructors.map { c -> DataConstructor(c.name, c.parameters.map { translate(it) }) })
        adts.add(adt)
        env = env.copy(typeEnv = env.typeEnv.addData(adt))

        val parameters = d.parameters.toSet()
        val constructorResultType: Type = TCon(d.name, d.parameters.map { TVar(it) })
        for (c in d.constructors) {
            val constructorType = c.parameters.foldRight(constructorResultType) { p, acc -> TArr(translate(p), acc) }
            env = env.copy(
                runtimeEnv = env.runtimeEnv + Pair(c.name, mkConstructorFunction(c.name, c.parameters.size)),
                typeEnv = env.typeEnv.extend(c.name, Scheme(parameters, constructorType))
            )
        }
    }
    values.add(TypedValue(adts, null))

    return env
}

private fun mkConstructorFunction(name: String, arity: Int): Value {
    when (arity) {
        0 -> return arrayOf(name)
        1 -> return { a1: Value -> arrayOf(name, a1) }
        2 -> return { a1: Value -> { a2: Value -> arrayOf(name, a1, a2) } }
        3 -> return { a1: Value -> { a2: Value -> { a3: Value -> arrayOf(name, a1, a2, a3) } } }
        4 -> return { a1: Value -> { a2: Value -> { a3: Value -> { a4: Value -> arrayOf(name, a1, a2, a3, a4) } } } }
        5 -> return { a1: Value -> { a2: Value -> { a3: Value -> { a4: Value -> { a5: Value -> arrayOf(name, a1, a2, a3, a4, a5) } } } } }
        else -> throw RuntimeException("TooManyConstructorArgumentsErrors: $arity")
    }
}

fun translate(tt: TypeTerm): Type = when (tt) {
    is TypeVariable -> TVar(tt.name)
    is TypeConstructor -> TCon(tt.name, tt.parameters.map { translate(it) })
    is TypeFunction -> TArr(translate(tt.left), translate(tt.right))
    is TypeTuple -> TTuple(tt.parameters.map { translate(it) })
    is TypeUnit -> typeUnit
}

private val binaryOps: Map<Op, (Any?, Any?) -> Any> = mapOf(
    Pair(Op.Plus) { a: Any?, b: Any? -> (a as Int) + (b as Int) },
    Pair(Op.Minus) { a: Any?, b: Any? -> (a as Int) - (b as Int) },
    Pair(Op.Times) { a: Any?, b: Any? -> (a as Int) * (b as Int) },
    Pair(Op.Divide) { a: Any?, b: Any? -> (a as Int) / (b as Int) },
    Pair(Op.Equals) { a: Any?, b: Any? -> a == b }
)

private data class EvaluateResult(val value: Any?, val env: RuntimeEnv)

@Suppress("UNCHECKED_CAST")
private fun evaluate(ast: Expression, env: RuntimeEnv): Value? =
    when (ast) {
        is AppExpression -> {
            val function = evaluate(ast.e1, env) as (Any?) -> Any
            val argument = evaluate(ast.e2, env)

            function(argument)
        }

        is IfExpression ->
            if (evaluate(ast.e1, env) as Boolean)
                evaluate(ast.e2, env)
            else
                evaluate(ast.e3, env)

        is LamExpression ->
            { x: Any? -> evaluate(ast.e, env + Pair(ast.n, x)) }

        is LetExpression -> evaluateDeclarations(ast.decls, ast.expr, env).value
        is LetRecExpression -> evaluateDeclarations(ast.decls, ast.expr, env).value
        is LBoolExpression -> ast.v
        is LIntExpression -> ast.v
        is LStringExpression -> ast.v
        is LTupleExpression -> ast.es.map { evaluate(it, env) }
        LUnitExpression -> null
        is MatchExpression -> matchExpression(ast, env)
        is OpExpression -> binaryOps[ast.op]!!(evaluate(ast.e1, env), evaluate(ast.e2, env))
        is VarExpression -> env[ast.name]
        is CaseExpression -> TODO()
        ErrorExpression -> TODO()
        FailExpression -> TODO()
        is FatBarExpression -> TODO()
    }

private fun matchExpression(e: MatchExpression, env: RuntimeEnv): Value? {
    val value = evaluate(e.e, env)

    for (c in e.cases) {
        val newEnv = matchPattern(c.pattern, value, env)
        if (newEnv != null) {
            return evaluate(c.expr, newEnv)
        }
    }

    throw Exception("No match")
}

private fun matchPattern(pattern: Pattern, value: Any?, env: RuntimeEnv): RuntimeEnv? =
    when (pattern) {
        is PBoolPattern -> if (pattern.v == value) env else null
        is PIntPattern -> if (pattern.v == value) env else null
        is PStringPattern -> if (pattern.v == value) env else null
        is PVarPattern -> env + Pair(pattern.name, value)
        is PTuplePattern -> {
            var newEnv: RuntimeEnv? = env
            for ((p, v) in pattern.values.zip(value as List<Any?>)) {
                if (newEnv != null) {
                    newEnv = matchPattern(p, v, newEnv)
                }
            }
            newEnv
        }

        PUnitPattern -> if (value == null) env else null
        PWildcardPattern -> env
        is PDataPattern -> {
            if (value is Array<*> && value[0] == pattern.name) {
                var newEnv: RuntimeEnv? = env
                for ((p, v) in pattern.args.zip(value.drop(1))) {
                    if (newEnv != null) {
                        newEnv = matchPattern(p, v, newEnv)
                    }
                }
                newEnv
            } else {
                null
            }
        }
    }

private fun evaluateDeclarations(decls: List<Declaration>, expr: Expression?, env: RuntimeEnv): EvaluateResult {
    val newEnv = env.toMutableMap()
    val values = mutableListOf<Value?>()

    for (decl in decls) {
        val value = evaluate(decl.e, newEnv)

        values.add(value)
        newEnv[decl.n] = value
    }

    return when (expr) {
        null -> EvaluateResult(values, newEnv)
        else -> EvaluateResult(evaluate(expr, newEnv), env)
    }
}

fun valueToString(value: Value?): String =
    when (value) {
        null -> "()"
        is Boolean -> value.toString()
        is Int -> value.toString()
        is String -> "\"${value.replace("\"", "\\\"")}\""
        is List<*> -> value.map { it }.joinToString(", ", "(", ")") { valueToString(it) }
        is Array<*> -> {
            val name = value[0] as String

            if (value.size > 1)
                "$name ${value.drop(1).joinToString(" ") { if (it is Array<*> && it.size > 1) "(${valueToString(it)})" else valueToString(it) }}"
            else
                name
        }

        else -> "function"
    }

fun elementToNestedString(value: Value?, type: Type, e: Element): NestedString {
    fun declarationsToNestedString(decls: List<Declaration>, type: TTuple): NestedString =
        NestedString.Sequence(decls.mapIndexed { i, d ->
            NestedString.Item(
                "${d.n} = ${
                    valueToString((value as List<Value?>)[i])
                }: ${type.types[i]}"
            )
        })

    return when {
        e is LetExpression && type is TTuple -> declarationsToNestedString(e.decls, type)
        e is LetRecExpression && type is TTuple -> declarationsToNestedString(e.decls, type)
        else -> NestedString.Item("${valueToString(value)}: $type")
    }
}

open class NestedString private constructor() {
    class Sequence(private val s: List<NestedString>) : NestedString() {
        override fun toString(): String = s.joinToString("\n")
    }

    class Item(private val v: String) : NestedString() {
        override fun toString(): String = v
    }
}
