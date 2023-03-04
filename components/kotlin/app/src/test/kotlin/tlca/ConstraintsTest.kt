package tlca

import kotlin.test.Test
import kotlin.test.assertEquals

class ConstraintsTest {
    @Test
    fun `lambda function with arithmetic operators`() {
        assertType(
            listOf("Int -> Int -> Int -> Int"),
            "\\x -> \\y -> \\z -> x + y + z"
        )
    }

    @Test
    fun `lambda function composition`() {
        assertType(
            listOf("(V4 -> V5) -> (V3 -> V4) -> V3 -> V5"),
            "\\f -> \\g -> \\x -> f (g x)"
        )
    }

    @Test
    fun `returns compose function where compose is defined using lambda`() {
        assertType(
            listOf("((V4 -> V5) -> (V3 -> V4) -> V3 -> V5)", "(V6 -> V7) -> (V8 -> V6) -> V8 -> V7"),
            "let compose = \\f -> \\g -> \\x -> f (g x) ; compose"
        )

        assertType(
            listOf("((V6 -> V7) -> (V5 -> V6) -> V5 -> V7)", "(V9 -> V10) -> (V11 -> V9) -> V11 -> V10"),
            "let rec compose = \\f -> \\g -> \\x -> f (g x) ; compose"
        )
    }

    @Test
    fun `generalised inferred scheme used in different forms`() {
        assertType(
            listOf("(V1 -> V1)", "(Bool)", "Int"),
            "let f = (\\x -> x) ; let g = (f True) ; f 3"
        )

        assertType(
            listOf("(V3 -> V3)", "(Bool)", "Int"),
            "let rec f = (\\x -> x) ; let g = (f True) ; f 3"
        )

        assertType(
            listOf("(V1 -> V1)", "(Bool)", "Int"),
            "let f = (\\x -> x) ; let rec g = (f True) ; f 3"
        )

        assertType(
            listOf("(V3 -> V3)", "(Bool)", "Int"),
            "let rec f = (\\x -> x) ; let rec g = (f True) ; f 3"
        )
    }

    @Test
    fun `identity declaration and returned`() {
        assertType(
            listOf("(V1 -> V1)", "V2 -> V2"),
            "let identity = \\n -> n ; identity"
        )

        assertType(
            listOf("(V3 -> V3)", "V5 -> V5"),
            "let rec identity = \\n -> n ; identity"
        )
    }

    @Test
    fun `identity declared and used and returned`() {
        assertType(
            listOf("(V1 -> V1 * Int)", "Int"),
            "let identity = \\n -> n and v = identity 10 ; v"
        )

        assertType(
            listOf("(Int -> Int * Int)", "Int"),
            "let rec identity = \\n -> n and v = identity 10 ; v"
        )
    }

    @Test
    fun `sequential declarations`() {
        assertType(
            listOf("(V1 -> V1)", "(Int * Bool)", "Int"),
            "let identity = \\n -> n ; let rec v1 = identity 10 and v2 = identity True ; v1"
        )

        assertType(
            listOf("(V3 -> V3)", "(Int * Bool)", "Int"),
            "let rec identity = \\n -> n ; let rec v1 = identity 10 and v2 = identity True ; v1"
        )

        assertType(
            listOf("(V1 -> V1)", "(Int * Bool)", "Bool"),
            "let identity = \\n -> n ; let rec v1 = identity 10 and v2 = identity True ; v2"
        )

        assertType(
            listOf("(V3 -> V3)", "(Int * Bool)", "Bool"),
            "let rec identity = \\n -> n ; let rec v1 = identity 10 and v2 = identity True ; v2"
        )
    }

    @Test
    fun `sequential declarations with partial application`() {
        assertType(
            listOf("(Int -> Int -> Int * Int -> Int)", "Int"),
            "let add a b = a + b and succ = add 1 ; succ 10"
        )
    }

    @Test
    fun `factorial declaration`() {
        assertType(
            listOf("(Int -> Int)", "Int -> Int"),
            "let rec fact n = if (n == 0) 1 else fact (n - 1) * n ; fact"
        )
    }

    @Test
    fun `mutually recursive function declarations`() {
        assertType(
            listOf("(Int -> Bool * Int -> Bool)", "Int -> Bool"),
            "let rec isOdd n = if (n == 0) False else isEven (n - 1) and isEven n = if (n == 0) True else isOdd (n - 1) ; isOdd"
        )
    }

    @Test
    fun `mutually recursive constant value declarations`() {
        assertType(
            listOf("(Int * Int)", "Int"),
            "let rec a = b + 1 and b = a + 1 ; a"
        )
    }

    private fun assertType(expected: List<String>, expression: String) {
        val (constraints, types) = infer(
            emptyTypeEnv,
            parseExpressions(expression),
            Constraints(),
            Pump()
        )

        assertEquals(expected, types.map { it.apply(constraints.solve()).toString() })
    }
}
