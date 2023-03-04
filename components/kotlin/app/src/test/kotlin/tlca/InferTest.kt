package tlca

import kotlin.test.Test
import kotlin.test.assertEquals

class InferTest {
    @Test
    fun inferApply() {
        assertInference(
            emptyTypeEnv
                    + Pair("a", Scheme(setOf("T"), TArr(TVar("T"), TVar("T"))))
                    + Pair("b", Scheme(emptySet(), typeInt)),
            "a b",
            listOf("V1 -> V1 ~ Int -> V2"),
            listOf("V2")
        )
    }

    @Test
    fun inferIf() {
        assertInference(
            emptyTypeEnv
                    + Pair("a", Scheme(setOf("S"), TVar("S")))
                    + Pair("b", Scheme(emptySet(), typeInt))
                    + Pair("c", Scheme(setOf("S"), TVar("S"))),
            "if (a) b else c",
            listOf(
                "V1 ~ Bool",
                "Int ~ V2"
            ),
            listOf("Int")
        )
    }

    @Test
    fun inferLam() {
        assertInference(
            emptyTypeEnv,
            "\\x -> x 10",
            listOf("V1 ~ Int -> V2"),
            listOf("V1 -> V2")
        )
    }

    @Test
    fun inferLBool() {
        assertInference("True", "Bool")
    }

    @Test
    fun inferLInt() {
        assertInference("123", "Int")
    }

    @Test
    fun inferLString() {
        assertInference("\"hello\"", "String")
    }

    @Test
    fun inferLTuple() {
        assertInference("(1, \"hello\", (), True)", "(Int * String * () * Bool)")
    }

    @Test
    fun inferLet() {
        assertInference(
            emptyTypeEnv,
            "let x = 10 and y = x + 1 ; y",
            listOf(
                "Int -> Int -> V1 ~ Int -> Int -> Int"
            ),
            listOf("(Int * Int)", "Int")
        )
    }

    @Test
    fun inferMatch() {
        assertInference(
            emptyTypeEnv,
            "match (1, 2) with (x, y) -> x + y",
            listOf(
                "V2 -> V3 -> V4 ~ Int -> Int -> Int",
                "(V2 * V3) ~ (Int * Int)",
                "V4 ~ V1",
            ),
            listOf("V1")
        )
    }

    @Test
    fun inferOp() {
        fun scenario(input: String, resultType: Type) {
            assertInference(
                emptyTypeEnv
                        + Pair("a", Scheme(setOf("T"), TVar("T")))
                        + Pair("b", Scheme(setOf("T"), TVar("T"))),
                input,
                listOf(
                    "V1 -> V2 -> V3 ~ Int -> Int -> $resultType"
                ),
                listOf("V3")
            )
        }

        scenario("a + b", typeInt)
        scenario("a - b", typeInt)
        scenario("a * b", typeInt)
        scenario("a / b", typeInt)
        scenario("a == b", typeBool)
    }

    @Test
    fun inferVar() {
        assertInference(
            emptyTypeEnv + Pair("a", Scheme(setOf("T"), TArr(TVar("T"), TVar("T")))),
            "a",
            emptyList(),
            listOf("V1 -> V1")
        )
    }

    @Test
    fun inferBoolPattern() {
        assertInferPattern(PBoolPattern(true), emptyList(), "Bool")
    }

    @Test
    fun inferConsPattern() {
        val origEnv = emptyTypeEnv.addData(
            DataDefinition(
                "List", listOf("a"), listOf(
                    DataConstructor("Nil", emptyList()),
                    DataConstructor("Cons", listOf(TVar("a"), TArr(TCon("List"), TVar("a"))))
                )
            )
        )

        assertInferPatternWithEnv(origEnv, PDataPattern("Nil", emptyList()), emptyList(), "List V1", origEnv)
        assertInferPatternWithEnv(
            origEnv,
            PDataPattern("Cons", listOf(PVarPattern("x"), PVarPattern("xs"))),
            listOf("V2 ~ V1, V3 ~ List -> V1"),
            "List V1",
            origEnv
                .extend("x", Scheme(emptySet(), TVar("V2")))
                .extend("xs", Scheme(emptySet(), TVar("V3")))
        )
    }

    @Test
    fun inferIntPattern() {
        assertInferPattern(PIntPattern(123), emptyList(), "Int")
    }

    @Test
    fun inferStringPattern() {
        assertInferPattern(PStringPattern("Hello"), emptyList(), "String")
    }

    @Test
    fun inferTuplePattern() {
        assertInferPattern(
            PTuplePattern(
                listOf(
                    PBoolPattern(true),
                    PIntPattern(123),
                    PStringPattern("Hello"),
                    PUnitPattern,
                )
            ), emptyList(), "(Bool * Int * String * ())"
        )
    }

    @Test
    fun inferUnitPattern() {
        assertInferPattern(PUnitPattern, emptyList(), "()")
    }

    @Test
    fun inferVarPattern() {
        assertInferPattern(PVarPattern("x"), emptyList(), "V1", emptyTypeEnv.extend("x", Scheme(emptySet(), TVar("V1"))))
    }

    @Test
    fun inferWildcardPattern() {
        assertInferPattern(PWildcardPattern, emptyList(), "V1", emptyTypeEnv)
    }

    private fun assertInference(typeEnv: TypeEnv, input: String, expectedConstraints: List<String>, expectedTypes: List<String>) {
        val inferResult = infer(typeEnv, parseExpressions(input), Constraints(), Pump())

        assertConstraints(inferResult.constraints, expectedConstraints)
        assertEquals(expectedTypes, inferResult.types.map { it.toString() })
    }

    private fun assertInference(input: String, expectedType: String) {
        assertInference(emptyTypeEnv, input, emptyList(), listOf(expectedType))
    }

    private fun assertConstraints(constraints: Constraints, expected: List<String>) {
        assertEquals(expected.joinToString(", "), constraints.toString())
    }

    private fun assertInferPatternWithEnv(
        defaultEnv: TypeEnv,
        pattern: Pattern,
        expectedConstraints: List<String> = emptyList(),
        expectedType: String,
        expectedTypeEnv: TypeEnv = emptyTypeEnv
    ) {
        val constraints = Constraints()

        val (type, typeEnv) = inferPattern(pattern, defaultEnv,     constraints, Pump())

        assertConstraints(constraints, expectedConstraints)
        assertEquals(type.toString(), expectedType)
        assertEquals(typeEnv, expectedTypeEnv)
    }

    private fun assertInferPattern(
        pattern: Pattern,
        expectedConstraints: List<String> = emptyList(),
        expectedType: String,
        expectedTypeEnv: TypeEnv = emptyTypeEnv
    ) = assertInferPatternWithEnv(emptyTypeEnv, pattern, expectedConstraints, expectedType, expectedTypeEnv)
}
