package tlca

import kotlin.test.Test
import kotlin.test.assertEquals

class InterpreterTest {
    @Test
    fun executeApp() {
        assertExecute("(\\a -> \\b -> a + b) 10 20", "30: Int")
    }

    @Test
    fun executeIf() {
        assertExecute("if (True) 1 else 2", "1: Int")
        assertExecute("if (False) 1 else 2", "2: Int")
    }

    @Test
    fun executeLam() {
        assertExecute("\\a -> \\b -> a + b", "function: Int -> Int -> Int")
    }

    @Test
    fun executeLet() {
        assertExecute(
            "let add a b = a + b and incr = add 1 ; incr 10",
            listOf(
                NestedString.Sequence(
                    listOf(
                        NestedString.Item("add = function: Int -> Int -> Int"),
                        NestedString.Item("incr = function: Int -> Int")
                    )
                ), NestedString.Item("11: Int")
            )
        )
        assertExecute(
            "let add a b = a + b and incr = add 1 in incr 10",
            "11: Int"
        )
    }

    @Test
    fun executeLetRec() {
        assertExecute(
            "let rec fact n = if (n == 0) 1 else n * (fact (n - 1)) ; fact",
            listOf(
                NestedString.Sequence(
                    listOf(
                        NestedString.Item("fact = function: Int -> Int")
                    )
                ),
                NestedString.Item("function: Int -> Int")
            )
        )
        assertExecute(
            "let rec fact n = if (n == 0) 1 else n * (fact (n - 1)) ; fact 5",
            listOf(
                NestedString.Sequence(
                    listOf(
                        NestedString.Item("fact = function: Int -> Int")
                    )
                ),
                NestedString.Item("120: Int")
            )
        )
        assertExecute(
            "let rec fact n = if (n == 0) 1 else n * (fact (n - 1)) in fact",
            "function: Int -> Int"
        )
        assertExecute(
            "let rec fact n = if (n == 0) 1 else n * (fact (n - 1)) in fact 5",
            "120: Int"
        )

        assertExecute(
            "let rec isOdd n = if (n == 0) False else isEven (n - 1) and isEven n = if (n == 0) True else isOdd (n - 1) ; isEven 5",
            listOf(
                NestedString.Sequence(
                    listOf(
                        NestedString.Item("isOdd = function: Int -> Bool"),
                        NestedString.Item("isEven = function: Int -> Bool")
                    )
                ),
                NestedString.Item("false: Bool")
            )
        )
        assertExecute(
            "let rec isOdd n = if (n == 0) False else isEven (n - 1) and isEven n = if (n == 0) True else isOdd (n - 1) ; isOdd 5",
            listOf(
                NestedString.Sequence(
                    listOf(
                        NestedString.Item("isOdd = function: Int -> Bool"),
                        NestedString.Item("isEven = function: Int -> Bool")
                    )
                ),
                NestedString.Item("true: Bool")
            )
        )
        assertExecute(
            "let rec isOdd n = if (n == 0) False else isEven (n - 1) and isEven n = if (n == 0) True else isOdd (n - 1) in isEven 5",
            "false: Bool"
        )
        assertExecute(
            "let rec isOdd n = if (n == 0) False else isEven (n - 1) and isEven n = if (n == 0) True else isOdd (n - 1) in isOdd 5",
            "true: Bool"
        )
    }

    @Test
    fun executeLBool() {
        assertExecute("True", "true: Bool")
        assertExecute("False", "false: Bool")
    }

    @Test
    fun executeLInt() {
        assertExecute("123", "123: Int")
    }

    @Test
    fun executeLString() {
        assertExecute("\"hello\"", "\"hello\": String")
        assertExecute("\"\\\"hello\\\"\"", "\"\\\"hello\\\"\": String")
    }

    @Test
    fun executeLTuple() {
        assertExecute("(1, (), \"Hello\", True)", "(1, (), \"Hello\", true): (Int * () * String * Bool)")
    }

    @Test
    fun executeLUnit() {
        assertExecute("()", "(): ()")
    }

    @Test
    fun executeMatch() {
        assertExecute("match True with x -> x", "true: Bool")
        assertExecute("match False with x -> x", "false: Bool")
        assertExecute("match () with x -> x", "(): ()")
        assertExecute(
            "let d n = match n with () -> \"bingo\" ; d ()", listOf(
                NestedString.Item("d = function: () -> String"),
                NestedString.Item("\"bingo\": String"),
            )
        )
        assertExecute("match \"hello\" with x -> x", "\"hello\": String")
        assertExecute("match (1, 2) with (x, y) -> x + y", "3: Int")

        assertExecute(
            "match (1, (False, 99)) with (_, (False, x)) -> x | (x, (True, _)) -> x",
            "99: Int"
        )
        assertExecute(
            "match (1, (True, 99)) with (_, (False, x)) -> x | (x, (True, _)) -> x",
            "1: Int"
        )
    }

    @Test
    fun executeOp() {
        assertExecute("1 == 2", "false: Bool")
        assertExecute("2 == 2", "true: Bool")

        assertExecute("3 + 2", "5: Int")
        assertExecute("3 - 2", "1: Int")
        assertExecute("3 * 2", "6: Int")
        assertExecute("9 / 2", "4: Int")
    }

    @Test
    fun executeVar() {
        assertExecute("let x = 1 ; x", listOf(NestedString.Item("x = 1: Int"), NestedString.Item("1: Int")))
        assertExecute("let x = True ; x", listOf(NestedString.Item("x = true: Bool"), NestedString.Item("true: Bool")))
        assertExecute("let x = \\a -> a ; x", listOf(NestedString.Item("x = function: V1 -> V1"), NestedString.Item("function: V1 -> V1")))

        assertExecute("let x = 1 in x", "1: Int")
        assertExecute("let x = True in x", "true: Bool")
        assertExecute("let x = \\a -> a in x", "function: V2 -> V2")
    }

    @Test
    fun dataDeclarationDeclaration() {
        assertExecute("data Boolean = BTrue | BFalse", "Boolean = BTrue | BFalse")
        assertExecute("data Option a = Some a | None", "Option a = Some a | None")
        assertExecute("data List a = Cons a (List a) | Nil", "List a = Cons a (List a) | Nil")
        assertExecute("data Funny a b = A a (a -> b) b | B a (a * b) b | C ()", "Funny a b = A a (a -> b) b | B a (a * b) b | C ()")
        assertExecute("data Funny = A Int | B String | C Bool", "Funny = A Int | B String | C Bool")
    }

    @Test
    fun dataDeclarationExecute() {
        assertExecute(
            "data Boolean = BTrue | BFalse ; BTrue", listOf(
                NestedString.Item("Boolean = BTrue | BFalse"),
                NestedString.Item("BTrue: Boolean"),
            )
        )
        assertExecute(
            "data List a = Cons a (List a) | Nil; Nil; Cons; Cons 10; Cons 10 (Cons 20 (Cons 30 Nil))", listOf(
                NestedString.Item("List a = Cons a (List a) | Nil"),
                NestedString.Item("Nil: List V1"),
                NestedString.Item("function: V1 -> List V1 -> List V1"),
                NestedString.Item("function: List Int -> List Int"),
                NestedString.Item("Cons 10 (Cons 20 (Cons 30 Nil)): List Int"),
            )
        )
    }

    @Test
    fun dataDeclarationMatch() {
        assertExecute(
            "data List a = Cons a (List a) | Nil; let rec range n = if (n == 0) Nil else (Cons n (range (n - 1))) ; match (range 10) with | Nil -> 0 | Cons v _ -> v",
            listOf(
                NestedString.Item("List a = Cons a (List a) | Nil"),
                NestedString.Sequence(
                    listOf(
                        NestedString.Item("range = function: Int -> List Int"),
                    )
                ),
                NestedString.Item("10: Int"),
            )
        )
    }
}

private fun assertExecute(input: String, expected: List<NestedString>) {
    val ast = parse(input)
    val (values) = execute(ast)

    ast.forEachIndexed { index, element ->
        val (value, type) = values[index]

        if (type == null)
            assertEquals(expected[index].toString(), (value as List<*>).joinToString(", "))
        else
            assertEquals(expected[index].toString(), elementToNestedString(value, type, element).toString())
    }
}

private fun assertExecute(input: String, expected: String) {
    assertExecute(input, listOf(NestedString.Item(expected)))
}
