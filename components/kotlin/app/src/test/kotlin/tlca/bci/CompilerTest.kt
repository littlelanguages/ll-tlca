package tlca.bci

import tlca.*
import java.util.concurrent.TimeUnit
import tlca.Environment
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals

class CompilerTest {
    @Test
    fun testSimpleExpressions() {
        assertCompile("True ; False")
        assertCompile("10 + 20")
        assertCompile("\"Hello World\"")
        assertCompile("\\x -> x + x")
        assertCompile("()")
        assertCompile("((), True, 123, \"hello\", \\x -> x, (1, 2))")
    }

    @Test
    fun testLetExpression() {
        assertCompile("let x = 10 in x * x")
        assertCompile("let rec factorial n = if (n == 0) 1 else n * (factorial (n - 1)) in factorial 10")
    }

    @Test
    fun testLetDeclaration() {
        assertCompile("let x = 10 ; x * x")
        assertCompile("let x = 10 ; x ; let y = \\a -> x ; let x = x + 1 ; x; let z = \\a -> x ; y 1 ; z 1")
    }

    @Test
    fun testLetRecDeclaration() {
        assertCompile("let rec factorial n = if (n == 0) 1 else n * (factorial (n - 1)) ; factorial 10")
        assertCompile("let rec isOdd n = if (n == 0) False else isEven (n - 1) and isEven n = if (n == 0) True else isOdd (n - 1) ; isEven 5 ; isOdd 5")
    }

    @Test
    fun testMatchExpression() {
        assertCompile("let d n = match n with 1 -> \"one\" | n -> \"other\" ; d ; d 1 ; d 2")
        assertCompile("let d n = match n with () -> \"bingo\" ; d ()")
        assertCompile("let d n = match n with \"none\" -> 0 | \"one\" -> 1 | _ -> 100 ; d \"none\" ; d \"one\" ; d \"many\"")
        assertCompile("let d n = match n with (x, y) -> x * y ; d (1, 1) ; d (2, 1) ; d (2, 2)")
        assertCompile("let d n = match n with (1, x) -> x | (x, y) -> x * y ; d (1, 1) ; d (2, 1) ; d (3, 3)")
        assertCompile("let d n = match n with (1, x) -> x | (x, 1) -> x * 2 | (x, y) -> x * y ; d (1, 1) ; d (2, 1) ; d (3, 3)")
        assertCompile("match (1, (True, 99)) with (_, (False, x)) -> x | (x, (True, _)) -> x")
        assertCompile("match (1, (False, 99)) with (_, (False, x)) -> x | (x, (True, _)) -> x")
        assertCompile("(\\n -> match n with True -> 0 | False -> 1) False")
        assertCompile("let d n = match n with False -> 0 | True -> 1 ; d ; d True ; d False")
        assertCompile("data Option a = None | Some a ; let d n = match n with None -> 0 | Some x -> x ; d None ; d (Some 1)")
        assertCompile("data List a = Nil | Cons a (List a) ; let rec sum l = match l with Nil -> 0 | Cons x xs -> x + (sum xs) ; sum Nil ; sum (Cons 1 Nil) ; sum (Cons 1 (Cons 2 Nil))")
    }

    @Test
    fun testDataDeclaration() {
        assertCompile("data Boolean = BTrue | BFalse ; BTrue ; BFalse")
        assertCompile("data Result a b = Error a | Okay b ; Error ; Okay ; Error \"oops\" ; Okay 1")
        assertCompile("data List a = Nil | Cons a (List a) ; Nil ; Cons 1 ; Cons 1 Nil ; Cons 1 (Cons 2 Nil)")
        assertCompile("data Tree a = Leaf a | Node (Tree a) (Tree a)")
        assertCompile("data Funny a b = A a (a -> b) b | B a (a * b) b | C () ; A ; B ; C ; A 1 (\\n -> n + 1) 2 ; B 1 (1, 2) 3")
    }

}

private fun assertCompile(input: String) {
    compileTo(input, File("t.bin"))

    val runResult = runThis().trim()
    val expectedResult = executeInput(input, emptyEnvironment)
    assertEquals(expectedResult, runResult, "Input: $input, expected result: $expectedResult, actual result: $runResult")
}

private fun runThis(): String {
    val process: Process = Runtime.getRuntime().exec("../../bci-deno/bci run t.bin", null)
    process.waitFor(60, TimeUnit.SECONDS)
    return process.errorStream.bufferedReader().readText() + process.inputStream.bufferedReader().readText()
}

private fun executeInput(input: String, env: Environment): String {
    val ast = parse(input)
    val executeResult = execute(ast, env)

    val result = mutableListOf<String>()

    ast.forEachIndexed { index, element ->
        val (value, type) = executeResult.values[index]

        if (type == null) result.add((value as List<*>).joinToString(", "))
        else result.add(elementToNestedString(value, renameTypeVariables(type), element).toString())
    }

    return result.joinToString("\n")
}
