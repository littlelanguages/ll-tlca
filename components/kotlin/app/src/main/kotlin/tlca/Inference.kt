package tlca

data class InferExpressionsResult(val constraints: Constraints, val types: List<Type>, val typeEnv: TypeEnv)

fun infer(typeEnv: TypeEnv, es: List<Expression>, constraints: Constraints, pump: Pump): InferExpressionsResult {
    val types = mutableListOf<Type>()
    var resultTypeEnv = typeEnv

    for (e in es) {
        val inferResult = infer(resultTypeEnv, e, constraints, pump)
        types.add(inferResult.type)
        resultTypeEnv = inferResult.typeEnv
    }

    return InferExpressionsResult(constraints, types, resultTypeEnv)
}

data class InferExpressionResult(val constraints: Constraints, val type: Type, val typeEnv: TypeEnv)

fun infer(typeEnv: TypeEnv, e: Expression, constraints: Constraints, pump: Pump): InferExpressionResult {
    val state = Inference(constraints, pump)

    val inferenceResult = state.infer(typeEnv, e)

    return InferExpressionResult(state.constraints, inferenceResult.type, inferenceResult.typeEnv)
}

data class InferenceResult(val type: Type, val typeEnv: TypeEnv)

private class Inference(val constraints: Constraints, val pump: Pump) {
    fun infer(typeEnv: TypeEnv, e: Expression): InferenceResult =
        when (e) {
            is AppExpression -> {
                val t1 = infer(typeEnv, e.e1).type
                val t2 = infer(typeEnv, e.e2).type
                val tv = pump.next()

                constraints.add(t1, TArr(t2, tv))

                InferenceResult(tv, typeEnv)
            }

            is IfExpression -> {
                val t1 = infer(typeEnv, e.e1).type
                val t2 = infer(typeEnv, e.e2).type
                val t3 = infer(typeEnv, e.e3).type

                constraints.add(t1, typeBool)
                constraints.add(t2, t3)

                InferenceResult(t2, typeEnv)
            }

            is LamExpression -> {
                val tv = pump.next()
                val t = infer(typeEnv + Pair(e.n, Scheme(setOf(), tv)), e.e).type

                InferenceResult(TArr(tv, t), typeEnv)
            }

            is LBoolExpression ->
                InferenceResult(typeBool, typeEnv)

            is LIntExpression ->
                InferenceResult(typeInt, typeEnv)

            is LStringExpression ->
                InferenceResult(typeString, typeEnv)

            is LTupleExpression ->
                InferenceResult(TTuple(e.es.map { infer(typeEnv, it).type }), typeEnv)

            LUnitExpression ->
                InferenceResult(typeUnit, typeEnv)

            is LetExpression -> {
                var newTypeEnv = typeEnv
                val types = mutableListOf<Type>()

                for (decl in e.decls) {
                    val inferredType = inferExpression(newTypeEnv, decl.e, constraints)
                    val subst = constraints.solve()
                    newTypeEnv = newTypeEnv.apply(subst)
                    val type = inferredType.apply(subst)
                    types.add(type)
                    val sc = newTypeEnv.generalise(type)
                    newTypeEnv = newTypeEnv.extend(decl.n, sc)
                }

                if (e.expr == null)
                    InferenceResult(TTuple(types), newTypeEnv)
                else
                    InferenceResult(infer(newTypeEnv, e.expr).type, typeEnv)
            }

            is LetRecExpression -> {
                val tvs = pump.nextN(e.decls.size)

                val interimTypeEnv = typeEnv + e.decls.zip(tvs).map { (decl, tv) -> Pair(decl.n, Scheme(setOf(), tv)) }
                val declarationType = fix(interimTypeEnv, LamExpression("_bob", LTupleExpression(e.decls.map { it.e })), constraints)
                constraints.add(declarationType, TTuple(tvs))

                val subst = constraints.solve()
                val solvedTypeEnv = typeEnv.apply(subst)
                val solvedTypes = tvs.map { it.apply(subst) }
                val newTypeEnv = solvedTypeEnv +
                        e.decls.zip(solvedTypes).map { (decl, tv) -> Pair(decl.n, solvedTypeEnv.generalise(tv)) }

                if (e.expr == null)
                    InferenceResult(TTuple(solvedTypes), newTypeEnv)
                else
                    InferenceResult(infer(newTypeEnv, e.expr).type, typeEnv)
            }

            is MatchExpression -> {
                val t = infer(typeEnv, e.e).type
                val tv = pump.next()

                for (matchCase in e.cases) {
                    val (tp, newEnv) = inferPattern(matchCase.pattern, typeEnv, constraints, pump)
                    val te = infer(newEnv, matchCase.expr, constraints, pump).type

                    constraints.add(tp, t)
                    constraints.add(te, tv)
                }

                InferenceResult(tv, typeEnv)
            }

            is OpExpression -> {
                val t1 = infer(typeEnv, e.e1).type
                val t2 = infer(typeEnv, e.e2).type
                val tv = pump.next()

                val u1 = TArr(t1, TArr(t2, tv))
                val u2 = ops[e.op] ?: typeError
                constraints.add(u1, u2)

                InferenceResult(tv, typeEnv)
            }

            is VarExpression -> {
                val scheme = typeEnv[e.name] ?: throw UnknownNameException(e.name, typeEnv)

                InferenceResult(scheme.instantiate(pump), typeEnv)
            }

            is CaseExpression -> TODO()
            ErrorExpression -> TODO()
            FailExpression -> TODO()
            is FatBarExpression -> TODO()
        }

    private fun fix(typeEnv: TypeEnv, e: Expression, constraints: Constraints): Type {
        val t1 = inferExpression(typeEnv, e, constraints)
        val tv = pump.next()

        constraints.add(TArr(tv, tv), t1)

        return tv
    }

    private fun inferExpression(typeEnv: TypeEnv, e: Expression, constraints: Constraints): Type =
        Inference(constraints, pump).infer(typeEnv, e).type
}

val ops = mapOf<Op, Type>(
    Pair(Op.Equals, TArr(typeInt, TArr(typeInt, typeBool))),
    Pair(Op.Plus, TArr(typeInt, TArr(typeInt, typeInt))),
    Pair(Op.Minus, TArr(typeInt, TArr(typeInt, typeInt))),
    Pair(Op.Times, TArr(typeInt, TArr(typeInt, typeInt))),
    Pair(Op.Divide, TArr(typeInt, TArr(typeInt, typeInt))),
)

data class UnknownNameException(val name: String, val typeEnv: TypeEnv) : Exception()

fun inferPattern(pattern: Pattern, env: TypeEnv, constraints: Constraints, pump: Pump): InferenceResult =
    when (pattern) {
        is PBoolPattern -> InferenceResult(typeBool, env)
        is PIntPattern -> InferenceResult(typeInt, env)
        is PStringPattern -> InferenceResult(typeString, env)
        is PTuplePattern -> {
            val types = mutableListOf<Type>()
            var newEnv = env
            for (p in pattern.values) {
                val (t, e) = inferPattern(p, newEnv, constraints, pump)
                types.add(t)
                newEnv = e
            }
            InferenceResult(TTuple(types), newEnv)
        }

        is PUnitPattern -> InferenceResult(typeUnit, env)
        is PVarPattern -> {
            val tv = pump.next()
            InferenceResult(tv, env.extend(pattern.name, Scheme(setOf(), tv)))
        }

        is PWildcardPattern -> InferenceResult(pump.next(), env)
        is PDataPattern -> {
            val (constructor, adt) = env.findConstructor(pattern.name) ?: throw UnknownNameException(pattern.name, env)

            if (constructor.arity != pattern.args.size)
                throw Exception("Constructor ${pattern.name} has arity ${constructor.arity} but ${pattern.args.size} arguments were given")

            val parameters = pump.nextN(adt.typeVars.size)
            val subst = Subst(adt.typeVars.zip(parameters).toMap())
            val constructorArgTypes = constructor.args.map { it.apply(subst) }
            var newEnv = env
            for ((p, constructorArgType) in pattern.args.zip(constructorArgTypes)) {
                val (t, e) = inferPattern(p, newEnv, constraints, pump)
                constraints.add(t, constructorArgType)
                newEnv = e
            }

            InferenceResult(TCon(adt.name, parameters), newEnv)
        }
    }
