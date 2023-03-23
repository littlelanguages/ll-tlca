import {
  Either,
  left,
  right,
} from "https://raw.githubusercontent.com/littlelanguages/deno-lib-data-either/0.1.2/mod.ts";
import { mkScanner, Scanner, Token, TToken } from "./Scanner.ts";

export interface Visitor<
  T_Program,
  T_Element,
  T_Expression,
  T_Relational,
  T_Additive,
  T_AdditiveOps,
  T_Multiplicative,
  T_MultiplicativeOps,
  T_Factor,
  T_ValueDeclaration,
  T_Case,
  T_Pattern,
  T_DataDeclaration,
  T_TypeDeclaration,
  T_ConstructorDeclaration,
  T_Type,
  T_ADTType,
  T_TermType,
> {
  visitProgram(a1: T_Element, a2: Array<[Token, T_Element]>): T_Program;
  visitElement1(a: T_Expression): T_Element;
  visitElement2(a: T_DataDeclaration): T_Element;
  visitExpression(a1: T_Relational, a2: Array<T_Relational>): T_Expression;
  visitRelational(
    a1: T_Additive,
    a2: [Token, T_Additive] | undefined,
  ): T_Relational;
  visitAdditive(
    a1: T_Multiplicative,
    a2: Array<[T_AdditiveOps, T_Multiplicative]>,
  ): T_Additive;
  visitAdditiveOps1(a: Token): T_AdditiveOps;
  visitAdditiveOps2(a: Token): T_AdditiveOps;
  visitMultiplicative(
    a1: T_Factor,
    a2: Array<[T_MultiplicativeOps, T_Factor]>,
  ): T_Multiplicative;
  visitMultiplicativeOps1(a: Token): T_MultiplicativeOps;
  visitMultiplicativeOps2(a: Token): T_MultiplicativeOps;
  visitFactor1(
    a1: Token,
    a2: [T_Expression, Array<[Token, T_Expression]>] | undefined,
    a3: Token,
  ): T_Factor;
  visitFactor2(a: Token): T_Factor;
  visitFactor3(a: Token): T_Factor;
  visitFactor4(a: Token): T_Factor;
  visitFactor5(a: Token): T_Factor;
  visitFactor6(
    a1: Token,
    a2: Token,
    a3: Array<Token>,
    a4: Token,
    a5: T_Expression,
  ): T_Factor;
  visitFactor7(
    a1: Token,
    a2: Token | undefined,
    a3: T_ValueDeclaration,
    a4: Array<[Token, T_ValueDeclaration]>,
    a5: [Token, T_Expression] | undefined,
  ): T_Factor;
  visitFactor8(
    a1: Token,
    a2: Token,
    a3: T_Expression,
    a4: Token,
    a5: T_Expression,
    a6: Token,
    a7: T_Expression,
  ): T_Factor;
  visitFactor9(a: Token): T_Factor;
  visitFactor10(a: Token): T_Factor;
  visitFactor11(
    a1: Token,
    a2: T_Expression,
    a3: Token,
    a4: Token | undefined,
    a5: T_Case,
    a6: Array<[Token, T_Case]>,
  ): T_Factor;
  visitValueDeclaration(
    a1: Token,
    a2: Array<Token>,
    a3: Token,
    a4: T_Expression,
  ): T_ValueDeclaration;
  visitCase(a1: T_Pattern, a2: Token, a3: T_Expression): T_Case;
  visitPattern1(
    a1: Token,
    a2: [T_Pattern, Array<[Token, T_Pattern]>] | undefined,
    a3: Token,
  ): T_Pattern;
  visitPattern2(a: Token): T_Pattern;
  visitPattern3(a: Token): T_Pattern;
  visitPattern4(a: Token): T_Pattern;
  visitPattern5(a: Token): T_Pattern;
  visitPattern6(a: Token): T_Pattern;
  visitPattern7(a1: Token, a2: Array<T_Pattern>): T_Pattern;
  visitDataDeclaration(
    a1: Token,
    a2: T_TypeDeclaration,
    a3: Array<[Token, T_TypeDeclaration]>,
  ): T_DataDeclaration;
  visitTypeDeclaration(
    a1: Token,
    a2: Array<Token>,
    a3: Token,
    a4: T_ConstructorDeclaration,
    a5: Array<[Token, T_ConstructorDeclaration]>,
  ): T_TypeDeclaration;
  visitConstructorDeclaration(
    a1: Token,
    a2: Array<T_Type>,
  ): T_ConstructorDeclaration;
  visitType(a1: T_ADTType, a2: Array<[Token, T_ADTType]>): T_Type;
  visitADTType1(a1: Token, a2: Array<T_Type>): T_ADTType;
  visitADTType2(a: T_TermType): T_ADTType;
  visitTermType1(a: Token): T_TermType;
  visitTermType2(
    a1: Token,
    a2: [T_Type, Array<[Token, T_Type]>] | undefined,
    a3: Token,
  ): T_TermType;
}

export const parseProgram = <
  T_Program,
  T_Element,
  T_Expression,
  T_Relational,
  T_Additive,
  T_AdditiveOps,
  T_Multiplicative,
  T_MultiplicativeOps,
  T_Factor,
  T_ValueDeclaration,
  T_Case,
  T_Pattern,
  T_DataDeclaration,
  T_TypeDeclaration,
  T_ConstructorDeclaration,
  T_Type,
  T_ADTType,
  T_TermType,
>(
  input: string,
  visitor: Visitor<
    T_Program,
    T_Element,
    T_Expression,
    T_Relational,
    T_Additive,
    T_AdditiveOps,
    T_Multiplicative,
    T_MultiplicativeOps,
    T_Factor,
    T_ValueDeclaration,
    T_Case,
    T_Pattern,
    T_DataDeclaration,
    T_TypeDeclaration,
    T_ConstructorDeclaration,
    T_Type,
    T_ADTType,
    T_TermType
  >,
): Either<SyntaxError, T_Program> => {
  try {
    return right(mkParser(mkScanner(input), visitor).program());
  } catch (e) {
    return left(e);
  }
};

export const mkParser = <
  T_Program,
  T_Element,
  T_Expression,
  T_Relational,
  T_Additive,
  T_AdditiveOps,
  T_Multiplicative,
  T_MultiplicativeOps,
  T_Factor,
  T_ValueDeclaration,
  T_Case,
  T_Pattern,
  T_DataDeclaration,
  T_TypeDeclaration,
  T_ConstructorDeclaration,
  T_Type,
  T_ADTType,
  T_TermType,
>(
  scanner: Scanner,
  visitor: Visitor<
    T_Program,
    T_Element,
    T_Expression,
    T_Relational,
    T_Additive,
    T_AdditiveOps,
    T_Multiplicative,
    T_MultiplicativeOps,
    T_Factor,
    T_ValueDeclaration,
    T_Case,
    T_Pattern,
    T_DataDeclaration,
    T_TypeDeclaration,
    T_ConstructorDeclaration,
    T_Type,
    T_ADTType,
    T_TermType
  >,
) => {
  const matchToken = (ttoken: TToken): Token => {
    if (isToken(ttoken)) {
      return nextToken();
    } else {
      throw {
        tag: "SyntaxError",
        found: scanner.current(),
        expected: [ttoken],
      };
    }
  };

  const isToken = (ttoken: TToken): boolean => currentToken() === ttoken;

  const isTokens = (ttokens: Array<TToken>): boolean =>
    ttokens.includes(currentToken());

  const currentToken = (): TToken => scanner.current()[0];

  const nextToken = (): Token => {
    const result = scanner.current();
    scanner.next();
    return result;
  };

  return {
    program: function (): T_Program {
      const a1: T_Element = this.element();
      const a2: Array<[Token, T_Element]> = [];

      while (isToken(TToken.Semicolon)) {
        const a2t1: Token = matchToken(TToken.Semicolon);
        const a2t2: T_Element = this.element();
        const a2t: [Token, T_Element] = [a2t1, a2t2];
        a2.push(a2t);
      }
      return visitor.visitProgram(a1, a2);
    },
    element: function (): T_Element {
      if (
        isTokens([
          TToken.LParen,
          TToken.LiteralInt,
          TToken.LiteralString,
          TToken.True,
          TToken.False,
          TToken.Backslash,
          TToken.Let,
          TToken.If,
          TToken.LowerIdentifier,
          TToken.UpperIdentifier,
          TToken.Match,
        ])
      ) {
        return visitor.visitElement1(this.expression());
      } else if (isToken(TToken.Data)) {
        return visitor.visitElement2(this.dataDeclaration());
      } else {
        throw {
          tag: "SyntaxError",
          found: scanner.current(),
          expected: [
            TToken.LParen,
            TToken.LiteralInt,
            TToken.LiteralString,
            TToken.True,
            TToken.False,
            TToken.Backslash,
            TToken.Let,
            TToken.If,
            TToken.LowerIdentifier,
            TToken.UpperIdentifier,
            TToken.Match,
            TToken.Data,
          ],
        };
      }
    },
    expression: function (): T_Expression {
      const a1: T_Relational = this.relational();
      const a2: Array<T_Relational> = [];

      while (
        isTokens([
          TToken.LParen,
          TToken.LiteralInt,
          TToken.LiteralString,
          TToken.True,
          TToken.False,
          TToken.Backslash,
          TToken.Let,
          TToken.If,
          TToken.LowerIdentifier,
          TToken.UpperIdentifier,
          TToken.Match,
        ])
      ) {
        const a2t: T_Relational = this.relational();
        a2.push(a2t);
      }
      return visitor.visitExpression(a1, a2);
    },
    relational: function (): T_Relational {
      const a1: T_Additive = this.additive();
      let a2: [Token, T_Additive] | undefined = undefined;

      if (isToken(TToken.EqualEqual)) {
        const a2t1: Token = matchToken(TToken.EqualEqual);
        const a2t2: T_Additive = this.additive();
        const a2t: [Token, T_Additive] = [a2t1, a2t2];
        a2 = a2t;
      }
      return visitor.visitRelational(a1, a2);
    },
    additive: function (): T_Additive {
      const a1: T_Multiplicative = this.multiplicative();
      const a2: Array<[T_AdditiveOps, T_Multiplicative]> = [];

      while (isTokens([TToken.Plus, TToken.Dash])) {
        const a2t1: T_AdditiveOps = this.additiveOps();
        const a2t2: T_Multiplicative = this.multiplicative();
        const a2t: [T_AdditiveOps, T_Multiplicative] = [a2t1, a2t2];
        a2.push(a2t);
      }
      return visitor.visitAdditive(a1, a2);
    },
    additiveOps: function (): T_AdditiveOps {
      if (isToken(TToken.Plus)) {
        return visitor.visitAdditiveOps1(matchToken(TToken.Plus));
      } else if (isToken(TToken.Dash)) {
        return visitor.visitAdditiveOps2(matchToken(TToken.Dash));
      } else {
        throw {
          tag: "SyntaxError",
          found: scanner.current(),
          expected: [TToken.Plus, TToken.Dash],
        };
      }
    },
    multiplicative: function (): T_Multiplicative {
      const a1: T_Factor = this.factor();
      const a2: Array<[T_MultiplicativeOps, T_Factor]> = [];

      while (isTokens([TToken.Star, TToken.Slash])) {
        const a2t1: T_MultiplicativeOps = this.multiplicativeOps();
        const a2t2: T_Factor = this.factor();
        const a2t: [T_MultiplicativeOps, T_Factor] = [a2t1, a2t2];
        a2.push(a2t);
      }
      return visitor.visitMultiplicative(a1, a2);
    },
    multiplicativeOps: function (): T_MultiplicativeOps {
      if (isToken(TToken.Star)) {
        return visitor.visitMultiplicativeOps1(matchToken(TToken.Star));
      } else if (isToken(TToken.Slash)) {
        return visitor.visitMultiplicativeOps2(matchToken(TToken.Slash));
      } else {
        throw {
          tag: "SyntaxError",
          found: scanner.current(),
          expected: [TToken.Star, TToken.Slash],
        };
      }
    },
    factor: function (): T_Factor {
      if (isToken(TToken.LParen)) {
        const a1: Token = matchToken(TToken.LParen);
        let a2: [T_Expression, Array<[Token, T_Expression]>] | undefined =
          undefined;

        if (
          isTokens([
            TToken.LParen,
            TToken.LiteralInt,
            TToken.LiteralString,
            TToken.True,
            TToken.False,
            TToken.Backslash,
            TToken.Let,
            TToken.If,
            TToken.LowerIdentifier,
            TToken.UpperIdentifier,
            TToken.Match,
          ])
        ) {
          const a2t1: T_Expression = this.expression();
          const a2t2: Array<[Token, T_Expression]> = [];

          while (isToken(TToken.Comma)) {
            const a2t2t1: Token = matchToken(TToken.Comma);
            const a2t2t2: T_Expression = this.expression();
            const a2t2t: [Token, T_Expression] = [a2t2t1, a2t2t2];
            a2t2.push(a2t2t);
          }
          const a2t: [T_Expression, Array<[Token, T_Expression]>] = [
            a2t1,
            a2t2,
          ];
          a2 = a2t;
        }
        const a3: Token = matchToken(TToken.RParen);
        return visitor.visitFactor1(a1, a2, a3);
      } else if (isToken(TToken.LiteralInt)) {
        return visitor.visitFactor2(matchToken(TToken.LiteralInt));
      } else if (isToken(TToken.LiteralString)) {
        return visitor.visitFactor3(matchToken(TToken.LiteralString));
      } else if (isToken(TToken.True)) {
        return visitor.visitFactor4(matchToken(TToken.True));
      } else if (isToken(TToken.False)) {
        return visitor.visitFactor5(matchToken(TToken.False));
      } else if (isToken(TToken.Backslash)) {
        const a1: Token = matchToken(TToken.Backslash);
        const a2: Token = matchToken(TToken.LowerIdentifier);
        const a3: Array<Token> = [];

        while (isToken(TToken.LowerIdentifier)) {
          const a3t: Token = matchToken(TToken.LowerIdentifier);
          a3.push(a3t);
        }
        const a4: Token = matchToken(TToken.DashGreaterThan);
        const a5: T_Expression = this.expression();
        return visitor.visitFactor6(a1, a2, a3, a4, a5);
      } else if (isToken(TToken.Let)) {
        const a1: Token = matchToken(TToken.Let);
        let a2: Token | undefined = undefined;

        if (isToken(TToken.Rec)) {
          const a2t: Token = matchToken(TToken.Rec);
          a2 = a2t;
        }
        const a3: T_ValueDeclaration = this.valueDeclaration();
        const a4: Array<[Token, T_ValueDeclaration]> = [];

        while (isToken(TToken.And)) {
          const a4t1: Token = matchToken(TToken.And);
          const a4t2: T_ValueDeclaration = this.valueDeclaration();
          const a4t: [Token, T_ValueDeclaration] = [a4t1, a4t2];
          a4.push(a4t);
        }
        let a5: [Token, T_Expression] | undefined = undefined;

        if (isToken(TToken.In)) {
          const a5t1: Token = matchToken(TToken.In);
          const a5t2: T_Expression = this.expression();
          const a5t: [Token, T_Expression] = [a5t1, a5t2];
          a5 = a5t;
        }
        return visitor.visitFactor7(a1, a2, a3, a4, a5);
      } else if (isToken(TToken.If)) {
        const a1: Token = matchToken(TToken.If);
        const a2: Token = matchToken(TToken.LParen);
        const a3: T_Expression = this.expression();
        const a4: Token = matchToken(TToken.RParen);
        const a5: T_Expression = this.expression();
        const a6: Token = matchToken(TToken.Else);
        const a7: T_Expression = this.expression();
        return visitor.visitFactor8(a1, a2, a3, a4, a5, a6, a7);
      } else if (isToken(TToken.LowerIdentifier)) {
        return visitor.visitFactor9(matchToken(TToken.LowerIdentifier));
      } else if (isToken(TToken.UpperIdentifier)) {
        return visitor.visitFactor10(matchToken(TToken.UpperIdentifier));
      } else if (isToken(TToken.Match)) {
        const a1: Token = matchToken(TToken.Match);
        const a2: T_Expression = this.expression();
        const a3: Token = matchToken(TToken.With);
        let a4: Token | undefined = undefined;

        if (isToken(TToken.Bar)) {
          const a4t: Token = matchToken(TToken.Bar);
          a4 = a4t;
        }
        const a5: T_Case = this.case();
        const a6: Array<[Token, T_Case]> = [];

        while (isToken(TToken.Bar)) {
          const a6t1: Token = matchToken(TToken.Bar);
          const a6t2: T_Case = this.case();
          const a6t: [Token, T_Case] = [a6t1, a6t2];
          a6.push(a6t);
        }
        return visitor.visitFactor11(a1, a2, a3, a4, a5, a6);
      } else {
        throw {
          tag: "SyntaxError",
          found: scanner.current(),
          expected: [
            TToken.LParen,
            TToken.LiteralInt,
            TToken.LiteralString,
            TToken.True,
            TToken.False,
            TToken.Backslash,
            TToken.Let,
            TToken.If,
            TToken.LowerIdentifier,
            TToken.UpperIdentifier,
            TToken.Match,
          ],
        };
      }
    },
    valueDeclaration: function (): T_ValueDeclaration {
      const a1: Token = matchToken(TToken.LowerIdentifier);
      const a2: Array<Token> = [];

      while (isToken(TToken.LowerIdentifier)) {
        const a2t: Token = matchToken(TToken.LowerIdentifier);
        a2.push(a2t);
      }
      const a3: Token = matchToken(TToken.Equal);
      const a4: T_Expression = this.expression();
      return visitor.visitValueDeclaration(a1, a2, a3, a4);
    },
    case: function (): T_Case {
      const a1: T_Pattern = this.pattern();
      const a2: Token = matchToken(TToken.DashGreaterThan);
      const a3: T_Expression = this.expression();
      return visitor.visitCase(a1, a2, a3);
    },
    pattern: function (): T_Pattern {
      if (isToken(TToken.LParen)) {
        const a1: Token = matchToken(TToken.LParen);
        let a2: [T_Pattern, Array<[Token, T_Pattern]>] | undefined = undefined;

        if (
          isTokens([
            TToken.LParen,
            TToken.LiteralInt,
            TToken.LiteralString,
            TToken.True,
            TToken.False,
            TToken.LowerIdentifier,
            TToken.UpperIdentifier,
          ])
        ) {
          const a2t1: T_Pattern = this.pattern();
          const a2t2: Array<[Token, T_Pattern]> = [];

          while (isToken(TToken.Comma)) {
            const a2t2t1: Token = matchToken(TToken.Comma);
            const a2t2t2: T_Pattern = this.pattern();
            const a2t2t: [Token, T_Pattern] = [a2t2t1, a2t2t2];
            a2t2.push(a2t2t);
          }
          const a2t: [T_Pattern, Array<[Token, T_Pattern]>] = [a2t1, a2t2];
          a2 = a2t;
        }
        const a3: Token = matchToken(TToken.RParen);
        return visitor.visitPattern1(a1, a2, a3);
      } else if (isToken(TToken.LiteralInt)) {
        return visitor.visitPattern2(matchToken(TToken.LiteralInt));
      } else if (isToken(TToken.LiteralString)) {
        return visitor.visitPattern3(matchToken(TToken.LiteralString));
      } else if (isToken(TToken.True)) {
        return visitor.visitPattern4(matchToken(TToken.True));
      } else if (isToken(TToken.False)) {
        return visitor.visitPattern5(matchToken(TToken.False));
      } else if (isToken(TToken.LowerIdentifier)) {
        return visitor.visitPattern6(matchToken(TToken.LowerIdentifier));
      } else if (isToken(TToken.UpperIdentifier)) {
        const a1: Token = matchToken(TToken.UpperIdentifier);
        const a2: Array<T_Pattern> = [];

        while (
          isTokens([
            TToken.LParen,
            TToken.LiteralInt,
            TToken.LiteralString,
            TToken.True,
            TToken.False,
            TToken.LowerIdentifier,
            TToken.UpperIdentifier,
          ])
        ) {
          const a2t: T_Pattern = this.pattern();
          a2.push(a2t);
        }
        return visitor.visitPattern7(a1, a2);
      } else {
        throw {
          tag: "SyntaxError",
          found: scanner.current(),
          expected: [
            TToken.LParen,
            TToken.LiteralInt,
            TToken.LiteralString,
            TToken.True,
            TToken.False,
            TToken.LowerIdentifier,
            TToken.UpperIdentifier,
          ],
        };
      }
    },
    dataDeclaration: function (): T_DataDeclaration {
      const a1: Token = matchToken(TToken.Data);
      const a2: T_TypeDeclaration = this.typeDeclaration();
      const a3: Array<[Token, T_TypeDeclaration]> = [];

      while (isToken(TToken.And)) {
        const a3t1: Token = matchToken(TToken.And);
        const a3t2: T_TypeDeclaration = this.typeDeclaration();
        const a3t: [Token, T_TypeDeclaration] = [a3t1, a3t2];
        a3.push(a3t);
      }
      return visitor.visitDataDeclaration(a1, a2, a3);
    },
    typeDeclaration: function (): T_TypeDeclaration {
      const a1: Token = matchToken(TToken.UpperIdentifier);
      const a2: Array<Token> = [];

      while (isToken(TToken.LowerIdentifier)) {
        const a2t: Token = matchToken(TToken.LowerIdentifier);
        a2.push(a2t);
      }
      const a3: Token = matchToken(TToken.Equal);
      const a4: T_ConstructorDeclaration = this.constructorDeclaration();
      const a5: Array<[Token, T_ConstructorDeclaration]> = [];

      while (isToken(TToken.Bar)) {
        const a5t1: Token = matchToken(TToken.Bar);
        const a5t2: T_ConstructorDeclaration = this.constructorDeclaration();
        const a5t: [Token, T_ConstructorDeclaration] = [a5t1, a5t2];
        a5.push(a5t);
      }
      return visitor.visitTypeDeclaration(a1, a2, a3, a4, a5);
    },
    constructorDeclaration: function (): T_ConstructorDeclaration {
      const a1: Token = matchToken(TToken.UpperIdentifier);
      const a2: Array<T_Type> = [];

      while (
        isTokens([
          TToken.UpperIdentifier,
          TToken.LowerIdentifier,
          TToken.LParen,
        ])
      ) {
        const a2t: T_Type = this.type();
        a2.push(a2t);
      }
      return visitor.visitConstructorDeclaration(a1, a2);
    },
    type: function (): T_Type {
      const a1: T_ADTType = this.aDTType();
      const a2: Array<[Token, T_ADTType]> = [];

      while (isToken(TToken.DashGreaterThan)) {
        const a2t1: Token = matchToken(TToken.DashGreaterThan);
        const a2t2: T_ADTType = this.aDTType();
        const a2t: [Token, T_ADTType] = [a2t1, a2t2];
        a2.push(a2t);
      }
      return visitor.visitType(a1, a2);
    },
    aDTType: function (): T_ADTType {
      if (isToken(TToken.UpperIdentifier)) {
        const a1: Token = matchToken(TToken.UpperIdentifier);
        const a2: Array<T_Type> = [];

        while (
          isTokens([
            TToken.UpperIdentifier,
            TToken.LowerIdentifier,
            TToken.LParen,
          ])
        ) {
          const a2t: T_Type = this.type();
          a2.push(a2t);
        }
        return visitor.visitADTType1(a1, a2);
      } else if (isTokens([TToken.LowerIdentifier, TToken.LParen])) {
        return visitor.visitADTType2(this.termType());
      } else {
        throw {
          tag: "SyntaxError",
          found: scanner.current(),
          expected: [
            TToken.UpperIdentifier,
            TToken.LowerIdentifier,
            TToken.LParen,
          ],
        };
      }
    },
    termType: function (): T_TermType {
      if (isToken(TToken.LowerIdentifier)) {
        return visitor.visitTermType1(matchToken(TToken.LowerIdentifier));
      } else if (isToken(TToken.LParen)) {
        const a1: Token = matchToken(TToken.LParen);
        let a2: [T_Type, Array<[Token, T_Type]>] | undefined = undefined;

        if (
          isTokens([
            TToken.UpperIdentifier,
            TToken.LowerIdentifier,
            TToken.LParen,
          ])
        ) {
          const a2t1: T_Type = this.type();
          const a2t2: Array<[Token, T_Type]> = [];

          while (isToken(TToken.Star)) {
            const a2t2t1: Token = matchToken(TToken.Star);
            const a2t2t2: T_Type = this.type();
            const a2t2t: [Token, T_Type] = [a2t2t1, a2t2t2];
            a2t2.push(a2t2t);
          }
          const a2t: [T_Type, Array<[Token, T_Type]>] = [a2t1, a2t2];
          a2 = a2t;
        }
        const a3: Token = matchToken(TToken.RParen);
        return visitor.visitTermType2(a1, a2, a3);
      } else {
        throw {
          tag: "SyntaxError",
          found: scanner.current(),
          expected: [TToken.LowerIdentifier, TToken.LParen],
        };
      }
    },
  };
};

export type SyntaxError = {
  tag: "SyntaxError";
  found: Token;
  expected: Array<TToken>;
};
