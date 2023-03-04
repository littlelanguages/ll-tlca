package tlca.bci

import tlca.*
import java.io.File

fun compileTo(input: String, fileName: File) {
    val e = parse(input)

    val builder = Builder()
    val bb = builder.createBlock()

    compile(e, bb)

    builder.writeTo(fileName)
}

sealed class Binding
data class BuiltinBinding(val name: String) : Binding()
data class ValueBinding(val depth: Int, val offset: Int) : Binding()

data class Environment(val compileEnvironment: CompileEnvironment, val typeEnvironment: TypeEnv, val pump: Pump = Pump(), val skipLabel: CodeLabel?) {
    fun openScope(): Environment =
        copy(compileEnvironment = compileEnvironment.openScope())

    fun bind(n: String): Environment =
        copy(compileEnvironment = compileEnvironment.bind(n))

    fun binding(n: String): Binding =
        when (val binding = compileEnvironment.variables[n]) {
            null -> throw Exception("Unknown variable $n")
            else -> binding
        }

    fun valueBinding(n: String): ValueBinding =
        when (val binding = compileEnvironment.variables[n]) {
            null -> throw Exception("Unknown variable $n")
            is BuiltinBinding -> throw Exception("Cannot bind builtin $n")
            is ValueBinding -> binding
        }

    fun assignSkipLabel(skipLabel: CodeLabel): Environment =
        copy(skipLabel = skipLabel)
}

data class CompileEnvironment(val variables: Map<String, Binding>, val depth: Int = 0, val nextOffset: Int = 0) {
    fun openScope(): CompileEnvironment =
        CompileEnvironment(variables, depth + 1, 0)

    fun bind(name: String): CompileEnvironment =
        CompileEnvironment(variables + Pair(name, ValueBinding(depth, nextOffset)), depth, nextOffset + 1)
}

private fun compile(elements: List<Element>, bb: BlockBuilder) {
    val transformedElements = mutableListOf<Element>()

    bb.writeOpCodeToCode(InstructionOpCode.ENTER)
    bb.writeIntToCode(0)

    var env = Environment(
        CompileEnvironment(
            mapOf(
                Pair("string_compare", BuiltinBinding("\$\$builtin-string-compare")),
                Pair("string_concat", BuiltinBinding("\$\$builtin-string-concat")),
                Pair("string_equal", BuiltinBinding("\$\$builtin-string-equal")),
                Pair("string_length", BuiltinBinding("\$\$builtin-string-length")),
                Pair("string_substring", BuiltinBinding("\$\$builtin-string-substring")),
            ), 0
        ), defaultTypeEnv, skipLabel = null
    )

    for (e in elements) {
        val (ep, envp) = compile(e, bb, env)
        transformedElements.add(ep)
        env = envp
    }

    bb.writeOpCodeToCode(InstructionOpCode.PUSH_UNIT)
    bb.writeOpCodeToCode(InstructionOpCode.RET)
    bb.writeInToCodeAt(enterSize(transformedElements), 1)
}

fun renameTypeVariables(t: Type): Type {
    var i = 0

    fun nextVar(): String =
        if (i < 26)
            ('a' + i++).toString()
        else
            "t${i++ - 26}"

    val vars = t.ftv().toList()
    val subst = Subst(vars.zip(vars.map { TVar(nextVar()) }).toMap())
    return t.apply(subst)
}

private fun compile(element: Element, bb: BlockBuilder, env: Environment): Pair<Element, Environment> =
    when {
        element is DataDeclaration -> Pair(element, compile(element, bb, env))
        element is ExpressionDeclaration && element.expr == null -> {
            val inferResult = infer(env.typeEnvironment, element as Expression, Constraints(), env.pump)
            val subst = inferResult.constraints.solve()

            val type = inferResult.type.apply(subst) as TTuple

            val newElement = transformPattern(element, env.typeEnvironment)
            val newEnv = compile(newElement, bb, env.copy(typeEnvironment = inferResult.typeEnv.apply(subst)))

            for (i in 0 until type.types.size) {
                val d = element.decls[i]
                val t = type.types[i]

                val binding = newEnv.valueBinding(d.n)

                bb.emitPrintString("${d.n} = ")
                bb.emitPrintLiteralVariable(binding.depth, binding.offset)
                bb.emitPrintString(": ${renameTypeVariables(t)}")
                bb.emitPrintLn()
            }

            Pair(newElement, newEnv)
        }

        element is Expression -> {
            val (constraints, type) = infer(env.typeEnvironment, element, Constraints(), env.pump)
            val subst = constraints.solve()

            val resolvedType = type.apply(subst)

            val newElement = transformPattern(element, env.typeEnvironment)
            bb.emitPrintLiteralThing { compile(newElement, bb, env) }
            bb.emitPrintString(": ${renameTypeVariables(resolvedType)}")
            bb.emitPrintLn()

            Pair(newElement, env)
        }

        else -> TODO("compile: Unknown element $element")
    }

private fun compile(dd: DataDeclaration, bb: BlockBuilder, initialEnv: Environment): Environment {
    var env = initialEnv

    for (d in dd.decls) {
        if (env.typeEnvironment.data(d.name) != null) {
            throw RuntimeException("Data type ${d.name} already exists")
        }
        env = env.copy(typeEnvironment = env.typeEnvironment.addData(DataDefinition(d.name, d.parameters, emptyList())))
    }

    for (adt in dd.decls.map { d ->
        DataDefinition(
            d.name,
            d.parameters,
            d.constructors.map { c -> DataConstructor(c.name, c.parameters.map { translate(it) }) })
    }) {
        env = env.copy(typeEnvironment = env.typeEnvironment.addData(adt))

        val constructorDataOffset = bb.dataOffset()

        bb.writeIntToData(adt.constructors.size)
        bb.writeStringToData(adt.name)
        adt.constructors.forEach { bb.writeStringToData(it.name) }

        val parameters = adt.typeVars.toSet()
        val constructorResultType: Type = TCon(adt.name, adt.typeVars.map { TVar(it) })
        for (i in 0 until adt.constructors.size) {
            val c = adt.constructors[i]

            val constructorType = c.args.foldRight(constructorResultType) { p, acc -> TArr(p, acc) }

            env = env.copy(
                compileEnvironment = env.compileEnvironment.bind(c.name),
                typeEnvironment = env.typeEnvironment.extend(c.name, Scheme(parameters, constructorType))
            )
            generateConstructorFunction(c.args.size, i, constructorDataOffset, env.valueBinding(c.name).offset, bb)
        }

        bb.emitPrintString(adt.toString())
        bb.emitPrintLn()
    }

    return env
}

private fun generateConstructorFunction(arity: Int, ordinal: Int, constructorDataOffset: DataOffset, storeOffset: Int, bb: BlockBuilder) {
    when (arity) {
        0 -> {
            bb.writeOpCodeToCode(InstructionOpCode.PUSH_DATA)
            bb.writeDataOffsetToCode(constructorDataOffset)
            bb.writeIntToCode(ordinal)
            bb.writeIntToCode(0)
            bb.writeOpCodeToCode(InstructionOpCode.STORE_VAR)
            bb.writeIntToCode(storeOffset)
        }

        1 -> {
            val block1 = bb.builder.createBlock()

            block1.writeOpCodeToCode(InstructionOpCode.PUSH_DATA)
            block1.writeDataOffsetToCode(constructorDataOffset)
            block1.writeIntToCode(ordinal)
            block1.writeIntToCode(1)
            block1.writeOpCodeToCode(InstructionOpCode.RET)

            bb.writeOpCodeToCode(InstructionOpCode.PUSH_CLOSURE)
            bb.writeLabelToCode(block1.name)
            bb.writeOpCodeToCode(InstructionOpCode.STORE_VAR)
            bb.writeIntToCode(storeOffset)
        }

        else -> {
            val blocks = (0 until arity).map { bb.builder.createBlock() }

            for (i in 0 until arity - 1) {
                val block = blocks[i]

                block.writeOpCodeToCode(InstructionOpCode.ENTER)
                block.writeIntToCode(1)
                block.writeOpCodeToCode(InstructionOpCode.STORE_VAR)
                block.writeIntToCode(0)
                block.writeOpCodeToCode(InstructionOpCode.PUSH_CLOSURE)
                block.writeLabelToCode(blocks[i + 1].name)
                block.writeOpCodeToCode(InstructionOpCode.RET)
            }

            val blockN = blocks.last()

            blockN.writeOpCodeToCode(InstructionOpCode.ENTER)
            blockN.writeIntToCode(1)
            blockN.writeOpCodeToCode(InstructionOpCode.STORE_VAR)
            blockN.writeIntToCode(0)

            for (i in arity - 1 downTo 0) {
                blockN.writeOpCodeToCode(InstructionOpCode.PUSH_VAR)
                blockN.writeIntToCode(i)
                blockN.writeIntToCode(0)
            }
            blockN.writeOpCodeToCode(InstructionOpCode.PUSH_DATA)
            blockN.writeDataOffsetToCode(constructorDataOffset)
            blockN.writeIntToCode(ordinal)
            blockN.writeIntToCode(arity)
            blockN.writeOpCodeToCode(InstructionOpCode.RET)

            bb.writeOpCodeToCode(InstructionOpCode.PUSH_CLOSURE)
            bb.writeLabelToCode(blocks.first().name)
            bb.writeOpCodeToCode(InstructionOpCode.STORE_VAR)
            bb.writeIntToCode(storeOffset)
        }
    }
}

private fun compile(e: Expression, bb: BlockBuilder, env: Environment): Environment =
    when (e) {
        is AppExpression -> {
            compile(e.e1, bb, env)
            compile(e.e2, bb, env)
            bb.writeOpCodeToCode(InstructionOpCode.SWAP_CALL)

            env
        }

        is IfExpression -> {
            val thenLabel = bb.nextCodeLabelName()
            val nextLabel = bb.nextCodeLabelName()

            compile(e.e1, bb, env)
            bb.writeOpCodeToCode(InstructionOpCode.JMP_TRUE)
            bb.writeLabelToCode(thenLabel)

            compile(e.e3, bb, env)
            bb.writeOpCodeToCode(InstructionOpCode.JMP)
            bb.writeLabelToCode(nextLabel)

            bb.markCodeLabel(thenLabel)
            compile(e.e2, bb, env)

            bb.markCodeLabel(nextLabel)

            env
        }

        is LBoolExpression -> {
            val opCode = if (e.v) InstructionOpCode.PUSH_TRUE else InstructionOpCode.PUSH_FALSE
            bb.writeOpCodeToCode(opCode)

            env
        }

        is LIntExpression -> {
            bb.writeOpCodeToCode(InstructionOpCode.PUSH_INT)
            bb.writeIntToCode(e.v)

            env
        }

        is LStringExpression -> {
            bb.writeOpCodeToCode(InstructionOpCode.PUSH_STRING)
            bb.writeStringToCode(e.v)

            env
        }

        is LTupleExpression -> {
            for (expr in e.es) {
                compile(expr, bb, env)
            }

            bb.writeOpCodeToCode(InstructionOpCode.PUSH_TUPLE)
            bb.writeIntToCode(e.es.size)

            env
        }

        LUnitExpression -> {
            bb.writeOpCodeToCode(InstructionOpCode.PUSH_UNIT)

            env
        }

        is LamExpression -> {
            val lambdaBlock = bb.builder.createBlock()

            lambdaBlock.writeOpCodeToCode(InstructionOpCode.ENTER)
            lambdaBlock.writeIntToCode(1 + enterSize(e.e))
            lambdaBlock.writeOpCodeToCode(InstructionOpCode.STORE_VAR)
            lambdaBlock.writeIntToCode(0)
            compile(e.e, lambdaBlock, env.openScope().bind(e.n))
            lambdaBlock.writeOpCodeToCode(InstructionOpCode.RET)

            bb.writeOpCodeToCode(InstructionOpCode.PUSH_CLOSURE)
            bb.writeLabelToCode(lambdaBlock.name)

            env
        }

        is LetExpression -> {
            var newEnv = env

            for (d in e.decls) {
                newEnv = compile(d.e, bb, newEnv).bind(d.n)
                bb.writeOpCodeToCode(InstructionOpCode.STORE_VAR)
                bb.writeIntToCode(newEnv.valueBinding(d.n).offset)
            }

            if (e.expr == null)
                newEnv
            else {
                compile(e.expr, bb, newEnv)
                env
            }
        }

        is LetRecExpression -> {
            var newEnv = env

            for (d in e.decls) {
                newEnv = newEnv.bind(d.n)
            }

            for (d in e.decls) {
                compile(d.e, bb, newEnv)
                bb.writeOpCodeToCode(InstructionOpCode.STORE_VAR)
                bb.writeIntToCode(newEnv.valueBinding(d.n).offset)
            }

            if (e.expr == null)
                newEnv
            else {
                compile(e.expr, bb, newEnv)
                env
            }
        }

        is OpExpression -> {
            compile(e.e1, bb, env)
            compile(e.e2, bb, env)
            when (e.op) {
                Op.Plus -> bb.writeOpCodeToCode(InstructionOpCode.ADD)
                Op.Minus -> bb.writeOpCodeToCode(InstructionOpCode.SUB)
                Op.Times -> bb.writeOpCodeToCode(InstructionOpCode.MUL)
                Op.Divide -> bb.writeOpCodeToCode(InstructionOpCode.DIV)
                Op.Equals -> bb.writeOpCodeToCode(InstructionOpCode.EQ)
            }

            env
        }

        is VarExpression -> {
            when (val binding = env.binding(e.name)) {
                is ValueBinding -> {
                    bb.writeOpCodeToCode(InstructionOpCode.PUSH_VAR)
                    bb.writeIntToCode(env.compileEnvironment.depth - binding.depth)
                    bb.writeIntToCode(binding.offset)
                }

                is BuiltinBinding -> {
                    bb.writeOpCodeToCode(InstructionOpCode.PUSH_BUILTIN)
                    bb.writeStringToCode(binding.name)
                }
            }

            env
        }

        is MatchExpression -> throw IllegalStateException("Match expressions should be desugared")

        is CaseExpression -> {
            compileCaseExpression(e, bb, env)
            env
        }

        ErrorExpression -> {
            bb.emitFatalError("Error: Unmatched case expression", 1)

            env
        }

        FailExpression -> TODO()
        is FatBarExpression -> TODO()
    }

private fun compileCaseExpression(
    e: CaseExpression,
    bb: BlockBuilder,
    defaultEnv: Environment
) {
    var env = defaultEnv
    val binding = env.valueBinding(e.variable)

    if (e.clauses.isEmpty()) {
        throw IllegalStateException("compileCaseExpression: Compiler Bug: No cases")
    } else if (e.clauses.size == 1) {
        e.clauses[0].variables.forEachIndexed { i, n ->
            if (n != null) {
                env = env.bind(n)
                bb.writeOpCodeToCode(InstructionOpCode.PUSH_VAR)
                bb.writeIntToCode(env.compileEnvironment.depth - binding.depth)
                bb.writeIntToCode(binding.offset)
                if (e.clauses[0].constructor == TUPLE_DATA_NAME) {
                    bb.writeOpCodeToCode(InstructionOpCode.PUSH_TUPLE_ITEM)
                } else {
                    bb.writeOpCodeToCode(InstructionOpCode.PUSH_DATA_ITEM)
                }
                bb.writeIntToCode(i)
                bb.writeOpCodeToCode(InstructionOpCode.STORE_VAR)
                bb.writeIntToCode(env.valueBinding(n).offset)
            }
        }
        compile(e.clauses[0].expression, bb, env)
    } else {
        val jumpLabels = e.clauses.map { bb.nextCodeLabelName() }
        bb.writeOpCodeToCode(InstructionOpCode.PUSH_VAR)
        bb.writeIntToCode(env.compileEnvironment.depth - binding.depth)
        bb.writeIntToCode(binding.offset)
        bb.writeOpCodeToCode(InstructionOpCode.JMP_DATA)
        bb.writeIntToCode(e.clauses.size)
        jumpLabels.forEach { label -> bb.writeLabelToCode(label) }
        val continueLabel = bb.nextCodeLabelName()

        e.clauses.forEachIndexed { index, clause ->
            bb.markCodeLabel(jumpLabels[index])
            clause.variables.forEachIndexed { i, n ->
                if (n != null) {
                    env = env.bind(n)
                    bb.writeOpCodeToCode(InstructionOpCode.PUSH_VAR)
                    bb.writeIntToCode(env.compileEnvironment.depth - binding.depth)
                    bb.writeIntToCode(binding.offset)
                    bb.writeOpCodeToCode(InstructionOpCode.PUSH_DATA_ITEM)
                    bb.writeIntToCode(i)
                    bb.writeOpCodeToCode(InstructionOpCode.STORE_VAR)
                    bb.writeIntToCode(env.valueBinding(n).offset)
                }
            }
            compile(clause.expression, bb, env)
            if (index != e.clauses.size - 1) {
                bb.writeOpCodeToCode(InstructionOpCode.JMP)
                bb.writeLabelToCode(continueLabel)
            }
        }
        bb.markCodeLabel(continueLabel)
    }
}

private fun enterSize(es: List<Element>): Int =
    es.sumOf { enterSize(it) }

private fun enterSize(e: Element): Int =
    when (e) {
        is AppExpression -> enterSize(e.e1) + enterSize(e.e2)
        is CaseExpression -> e.clauses.sumOf { it.variables.filterNotNull().size + enterSize(it.expression) }
        ErrorExpression -> 0
        FailExpression -> 0
        is FatBarExpression -> enterSize(e.left) + enterSize(e.right)
        is IfExpression -> enterSize(e.e1) + enterSize(e.e2) + enterSize(e.e3)
        is LamExpression -> 0
        is LetExpression -> e.decls.size + if (e.expr == null) 0 else enterSize(e.expr)
        is LetRecExpression -> e.decls.size + if (e.expr == null) 0 else enterSize(e.expr)
        is VarExpression -> 0
        is LIntExpression -> 0
        is LBoolExpression -> 0
        is LTupleExpression -> 0
        is OpExpression -> enterSize(e.e1) + enterSize(e.e2)
        is DataDeclaration -> e.decls.sumOf { it.constructors.size }
        is LStringExpression -> 0
        LUnitExpression -> 0
        is MatchExpression -> enterSize(e.e) + e.cases.sumOf { enterSize(it.expr) + enterSize(it.pattern) }
    }

private fun enterSize(p: Pattern): Int =
    when (p) {
        is PVarPattern -> 1
        is PIntPattern -> 0
        is PBoolPattern -> 0
        is PUnitPattern -> 0
        is PStringPattern -> 0
        is PDataPattern -> p.args.sumOf { enterSize(it) }
        is PWildcardPattern -> 0
        is PTuplePattern -> p.values.sumOf { enterSize(it) }
    }
