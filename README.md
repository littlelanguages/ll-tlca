# ll-tlca

This *little language*, Typed Lambda Calculus with ADTs (TLCA), is a function language with union types or abstract data types (ADT).

A feature list of this language is:

- Expressions produce no side-effects,
- Expressions are all typed using [Hindley-Milner](https://en.wikipedia.org/wiki/Hindley–Milner_type_system) type inference,
- Supports Unit, Bool, Int, String, higher-order functions, tuples and abstract data types,
- Associate values to names using `let` and recursive values using `let rec` declarations, and
- Pattern matching to destruct ADT values

## TLCA Program Examples

The following code declares the mutually recursive functions `isOdd` and `isEven` then invokes each with a single value.

```ocaml
let rec isOdd n = if (n == 0) False else isEven (n - 1)
    and isEven n = if (n == 0) True else isOdd (n - 1) ;

isOdd 5 ;
isEven 5
```

The above program is type safe and, when executed, produces

```ocaml
isOdd = function: Int -> Bool
isEven = function: Int -> Bool
true: Bool
false: Bool
```

The following examples shows off how to declare a list, some of the traditional functions over a list and then, using these functions, create, filter and transforms lists.

```ocaml
data List a = 
    Cons a (List a) 
  | Nil ;

let range n = 
  let rec helper m =
     if (n == m) Nil else Cons m (helper m + 1)
   in helper 1 ;

let rec foldRight f lst z =
  match lst with
  | Nil -> z
  | Cons x xs -> f x (foldRight f xs z) ;

let length lst =
  foldRight (\a b -> a + 1) lst 0 ;

let sum lst = 
  foldRight (\a b -> a + b) lst 0 ;

let map f lst =
  foldRight (\a -> Cons (f a)) lst Nil ;

let upper = 10 ;

let items = range upper + 1 ;

length items ;

map sum (map range items)
```

Rather satisfyingly the above program produces

```ocaml
List a = Cons a (List a) | Nil
range = function: Int -> List Int
foldRight = function: (a -> b -> b) -> List a -> b -> b
length = function: List Int -> Int
sum = function: List Int -> Int
map = function: (a -> b) -> List a -> List b
upper = 10: Int
items = Cons 1 (Cons 2 (Cons 3 (Cons 4 (Cons 5 (Cons 6 (Cons 7 (Cons 8 (Cons 9 (Cons 10 Nil))))))))): List Int
2: Int
Cons 0 (Cons 1 (Cons 3 (Cons 6 (Cons 10 (Cons 15 (Cons 21 (Cons 28 (Cons 36 (Cons 45 Nil))))))))): List Int
```

The following program uses List and Result to implement a find function over lists.

```ocaml
data Result c b = 
    Error c 
  | Okay b ;

data List a = 
    Cons a (List a) 
  | Nil ;

let rec find p lst =
  match lst with
  | Nil -> Error "Not found"
  | Cons x xs -> if (p x) Okay x else find p xs ;

find (\x -> x == 2) (Cons 1 (Cons 2 (Cons 3 Nil))) ;

find (\x -> x == 10) (Cons 1 (Cons 2 (Cons 3 Nil)))
```

The result of this program is as expected.

```ocaml
Result c b = Error c | Okay b
List a = Cons a (List a) | Nil
find = function: (a -> Bool) -> List a -> Result String a
Okay 2: Result String Int
Error "Not found": Result String Int
```

## Grammar

The examples demonstrate TLCA to be a simple functional language and yet joyfully useful.  TLCA's `parspiler` syntax definition follows below.

```
uses "./Scanner.llld";

Program
    : Element {";" Element}
    ;

Element
    : Expression
    | DataDeclaration
    ;

Expression
    : Relational {Relational}
    ;

Relational
    : Additive ["==" Additive]
    ;

Additive
    : Multiplicative {AdditiveOps Multiplicative}
    ;

AdditiveOps
    : "+"
    | "-"
    ;

Multiplicative
    : Factor {MultiplicativeOps Factor}
    ;

MultiplicativeOps
    : "*"
    | "/"
    ;

Factor
    : "(" [Expression {"," Expression}] ")"
    | LiteralInt
    | LiteralString
    | "True"
    | "False"
    | "\" LowerIdentifier {LowerIdentifier} "->" Expression
    | "let" ["rec"] ValueDeclaration {"and" ValueDeclaration} ["in" Expression]
    | "if" "(" Expression ")" Expression "else" Expression
    | LowerIdentifier
    | UpperIdentifier
    | "match" Expression "with" ["|"] Case {"|" Case}
    ;

ValueDeclaration
    : LowerIdentifier {LowerIdentifier} "=" Expression
    ;

Case
    : Pattern "->" Expression
    ;

Pattern
    : "(" [Pattern {"," Pattern}] ")"
    | LiteralInt
    | LiteralString
    | "True"
    | "False"
    | LowerIdentifier
    | UpperIdentifier {Pattern}
    ;

DataDeclaration
    : "data" TypeDeclaration {"and" TypeDeclaration}
    ;

TypeDeclaration
    : UpperIdentifier {LowerIdentifier} "=" ConstructorDeclaration {"|" ConstructorDeclaration}
    ;

ConstructorDeclaration
    : UpperIdentifier {Type}
    ;

Type
    : ADTType {"->" ADTType}
    ;

ADTType
    : UpperIdentifier {Type}
    | TermType
    ;

TermType
    : LowerIdentifier
    | "(" [Type {"*" Type}] ")"
    ;
```

To finish off the syntax definition TLCA's lexical definition is enclosed below.

```
tokens
    UpperIdentifier = upperID {digit | id};
    LowerIdentifier = lowerID {digit | id};
    LiteralInt = ['-'] digits;
    LiteralString = '"' {!('"' + cr) | "\" '"'}  '"';

comments
   "--" {!cr};

whitespace
  chr(0)-' ';

fragments
  digit = '0'-'9';
  digits = digit {digit};
  id = 'A'-'Z' + 'a'-'z' + '_';
  upperID = 'A'-'Z';
  lowerID = 'a'-'z' + '_';
  cr = chr(10);
```