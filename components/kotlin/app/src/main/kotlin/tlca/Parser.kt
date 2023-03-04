package tlca

import io.littlelanguages.data.Tuple2
import tlca.parser.Parser
import tlca.parser.Scanner
import tlca.parser.Token
import tlca.parser.Visitor
import java.io.StringReader

sealed class Element

sealed class Expression : Element()

interface ExpressionDeclaration {
    val decls: List<Declaration>
    val expr: Expression?
}

data class AppExpression(val e1: Expression, val e2: Expression) : Expression()

data class CaseExpression(val variable: String, val clauses: List<Clause>) : Expression()

data class Clause(val constructor: String, val variables: List<String?>, val expression: Expression)

data class IfExpression(val e1: Expression, val e2: Expression, val e3: Expression) : Expression()

data class LetExpression(override val decls: List<Declaration>, override val expr: Expression?) : Expression(), ExpressionDeclaration

data class LetRecExpression(override val decls: List<Declaration>, override val expr: Expression?) : Expression(), ExpressionDeclaration

data class Declaration(val n: String, val e: Expression)

object ErrorExpression : Expression()

object FailExpression : Expression()

data class FatBarExpression(val left: Expression, val right: Expression) : Expression()

data class LamExpression(val n: String, val e: Expression) : Expression()

data class LBoolExpression(val v: Boolean) : Expression()

data class LIntExpression(val v: Int) : Expression()

data class LStringExpression(val v: String) : Expression()

data class LTupleExpression(val es: List<Expression>) : Expression()

object LUnitExpression : Expression()

data class MatchExpression(val e: Expression, val cases: List<MatchCase>) : Expression()

data class MatchCase(val pattern: Pattern, val expr: Expression)

data class OpExpression(val e1: Expression, val e2: Expression, val op: Op) : Expression()

enum class Op { Equals, Plus, Minus, Times, Divide }

data class VarExpression(val name: String) : Expression()


sealed class Pattern

data class PDataPattern(val name: String, val args: List<Pattern>) : Pattern()

data class PBoolPattern(val v: Boolean) : Pattern()

data class PIntPattern(val v: Int) : Pattern()

data class PStringPattern(val v: String) : Pattern()

data class PTuplePattern(val values: List<Pattern>) : Pattern()

object PUnitPattern : Pattern()

data class PVarPattern(val name: String) : Pattern()

object PWildcardPattern : Pattern()

data class DataDeclaration(val decls: List<TypeDeclaration>) : Element()

data class TypeDeclaration(val name: String, val parameters: List<String>, val constructors: List<ConstructorDeclaration>)

data class ConstructorDeclaration(val name: String, val parameters: List<TypeTerm>)

sealed class TypeTerm

data class TypeVariable(val name: String) : TypeTerm()

data class TypeConstructor(val name: String, val parameters: List<TypeTerm>) : TypeTerm()

data class TypeFunction(val left: TypeTerm, val right: TypeTerm) : TypeTerm()

data class TypeTuple(val parameters: List<TypeTerm>) : TypeTerm()

object TypeUnit : TypeTerm()

class ParserVisitor : Visitor<
        List<Element>,
        Element,
        Expression,
        Expression,
        Expression,
        Op,
        Expression,
        Op,
        Expression,
        Declaration,
        MatchCase,
        Pattern,
        DataDeclaration,
        TypeDeclaration,
        ConstructorDeclaration,
        TypeTerm,
        TypeTerm,
        TypeTerm> {
    override fun visitProgram(a1: Element, a2: List<Tuple2<Token, Element>>): List<Element> =
        listOf(a1) + a2.map { it.b }

    override fun visitExpression(a1: Expression, a2: List<Expression>): Expression = a2.fold(a1) { acc, e -> AppExpression(acc, e) }

    override fun visitRelational(a1: Expression, a2: Tuple2<Token, Expression>?): Expression =
        if (a2 == null) a1 else OpExpression(a1, a2.b, Op.Equals)

    override fun visitMultiplicative(a1: Expression, a2: List<Tuple2<Op, Expression>>): Expression =
        a2.fold(a1) { acc, e -> OpExpression(acc, e.b, e.a) }

    override fun visitElement1(a: Expression): Element = a

    override fun visitElement2(a: DataDeclaration): Element = a

    override fun visitMultiplicativeOps1(a: Token): Op = Op.Times

    override fun visitMultiplicativeOps2(a: Token): Op = Op.Divide

    override fun visitAdditive(a1: Expression, a2: List<Tuple2<Op, Expression>>): Expression = a2.fold(a1) { acc, e -> OpExpression(acc, e.b, e.a) }

    override fun visitAdditiveOps1(a: Token): Op = Op.Plus

    override fun visitAdditiveOps2(a: Token): Op = Op.Minus

    override fun visitFactor1(a1: Token, a2: Tuple2<Expression, List<Tuple2<Token, Expression>>>?, a3: Token): Expression =
        when {
            a2 == null -> LUnitExpression
            a2.b.isEmpty() -> a2.a
            else -> LTupleExpression(listOf(a2.a) + a2.b.map { it.b })
        }

    override fun visitFactor2(a: Token): Expression = LIntExpression(a.lexeme.toInt())

    override fun visitFactor3(a: Token): Expression = LStringExpression(a.lexeme.drop(1).dropLast(1).replace("\\\"", "\""))

    override fun visitFactor4(a: Token): Expression = LBoolExpression(true)

    override fun visitFactor5(a: Token): Expression = LBoolExpression(false)

    override fun visitFactor6(a1: Token, a2: Token, a3: List<Token>, a4: Token, a5: Expression): Expression =
        composeLambda(listOf(a2.lexeme) + a3.map { it.lexeme }, a5)

    override fun visitFactor7(
        a1: Token, a2: Token?, a3: Declaration, a4: List<Tuple2<Token, Declaration>>, a5: Tuple2<Token, Expression>?
    ): Expression {
        val declarations = listOf(a3) + a4.map { it.b }

        return if (a2 == null) LetExpression(declarations, a5?.b)
        else LetRecExpression(declarations, a5?.b)
    }

    override fun visitFactor8(a1: Token, a2: Token, a3: Expression, a4: Token, a5: Expression, a6: Token, a7: Expression): Expression =
        IfExpression(a3, a5, a7)


    override fun visitFactor9(a: Token): Expression = VarExpression(a.lexeme)

    override fun visitFactor10(a: Token): Expression = VarExpression(a.lexeme)

    override fun visitFactor11(a1: Token, a2: Expression, a3: Token, a4: Token?, a5: MatchCase, a6: List<Tuple2<Token, MatchCase>>): Expression =
        MatchExpression(a2, listOf(a5) + a6.map { it.b })

    override fun visitCase(a1: Pattern, a2: Token, a3: Expression): MatchCase = MatchCase(a1, a3)

    override fun visitPattern1(a1: Token, a2: Tuple2<Pattern, List<Tuple2<Token, Pattern>>>?, a3: Token): Pattern =
        when {
            a2 == null -> PUnitPattern
            a2.b.isEmpty() -> a2.a
            else -> PTuplePattern(listOf(a2.a) + a2.b.map { it.b })
        }

    override fun visitPattern2(a: Token): Pattern = PIntPattern(a.lexeme.toInt())

    override fun visitPattern3(a: Token): Pattern = PStringPattern(a.lexeme.drop(1).dropLast(1).replace("\\\"", "\""))

    override fun visitPattern4(a: Token): Pattern = PBoolPattern(true)

    override fun visitPattern5(a: Token): Pattern = PBoolPattern(false)

    override fun visitPattern6(a: Token): Pattern =
        if (a.lexeme == "_") PWildcardPattern else PVarPattern(a.lexeme)

    override fun visitPattern7(a1: Token, a2: List<Pattern>): Pattern = PDataPattern(a1.lexeme, a2)

    override fun visitDataDeclaration(a1: Token, a2: TypeDeclaration, a3: List<Tuple2<Token, TypeDeclaration>>): DataDeclaration =
        DataDeclaration(listOf(a2) + a3.map { it.b })

    override fun visitTypeDeclaration(
        a1: Token,
        a2: List<Token>,
        a3: Token,
        a4: ConstructorDeclaration,
        a5: List<Tuple2<Token, ConstructorDeclaration>>
    ): TypeDeclaration = TypeDeclaration(a1.lexeme, a2.map { it.lexeme }, listOf(a4) + a5.map { it.b })


    override fun visitConstructorDeclaration(a1: Token, a2: List<TypeTerm>): ConstructorDeclaration = ConstructorDeclaration(a1.lexeme, a2)

    override fun visitType(a1: TypeTerm, a2: List<Tuple2<Token, TypeTerm>>): TypeTerm =
        composeFunctionType(listOf(a1) + a2.map { it.b })

    override fun visitADTType1(a1: Token, a2: List<TypeTerm>): TypeTerm = TypeConstructor(a1.lexeme, a2)

    override fun visitADTType2(a: TypeTerm): TypeTerm = a

    override fun visitTermType1(a: Token): TypeTerm = TypeVariable(a.lexeme)

    override fun visitTermType2(a1: Token, a2: Tuple2<TypeTerm, List<Tuple2<Token, TypeTerm>>>?, a3: Token): TypeTerm = when {
        a2 == null -> TypeUnit
        a2.b.isEmpty() -> a2.a
        else -> TypeTuple(listOf(a2.a) + a2.b.map { it.b })
    }

    override fun visitValueDeclaration(a1: Token, a2: List<Token>, a3: Token, a4: Expression): Declaration =
        Declaration(a1.lexeme, composeLambda(a2.map { it.lexeme }, a4))

    private fun composeLambda(names: List<String>, e: Expression): Expression = names.foldRight(e) { name, acc -> LamExpression(name, acc) }

    private fun composeFunctionType(ts: List<TypeTerm>): TypeTerm = ts.dropLast(1).foldRight(ts.last()) { t1, acc -> TypeFunction(t1, acc) }
}

fun parse(scanner: Scanner): List<Element> =
    Parser(scanner, ParserVisitor()).program()

fun parse(input: String): List<Element> =
    parse(Scanner(StringReader(input)))

fun parseExpressions(input: String): List<Expression> {
    val elements = parse(input)

    return elements.map {
        when (it) {
            is Expression -> it
            is DataDeclaration -> throw IllegalArgumentException("Data declaration found")
        }
    }
}
