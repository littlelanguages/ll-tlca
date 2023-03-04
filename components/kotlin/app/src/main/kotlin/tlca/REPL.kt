package tlca

import tlca.bci.compileTo
import tlca.bci.renameTypeVariables
import java.io.File

fun main(args: Array<String>) {
    if (args.isEmpty()) {
        var env = defaultEnvironment
        while (true) {
            val input = readline().trim()

            if (input == ".quit") {
                println("bye")
                break
            }

            try {
                env = executeInput(input, env)
            } catch (e: Exception) {
                println(e)
            }
        }
    } else if (args.size == 1) {
        val input = File(args[0]).readText()
        executeInput(input, defaultEnvironment)
    } else if (args.size == 2) {
        val input = File(args[0]).readText()
        val output = File(args[1])

        compileTo(input, output)
    } else {
        println("Usage: tlca [input-file] [output-file]")
    }
}

private fun executeInput(input: String, env: Environment): Environment {
    val ast = parse(input)
    val executeResult = execute(ast, env)

    ast.forEachIndexed { index, element ->
        val (value, type) = executeResult.values[index]

        if (type == null)
            println((value as List<*>).joinToString(", "))
        else
            println(elementToNestedString(value, renameTypeVariables(type), element).toString())
    }

    return executeResult.env
}

private fun readline(): String {
    var result = ""

    while (true) {
        if (result.isEmpty())
            print("> ")
        else
            print(". ")

        val s = readln()
        result = result + "\n" + s.trimEnd()

        if (result.endsWith(";;"))
            return result.dropLast(2)
    }
}