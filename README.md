# ll-tlca

Typed Lambda Calculus with ADTs (TLCA) is a small but powerful functional programming language incorporating abstract data types (ADTs). TLCA exhibits no side-effects in expressions and uses the [Hindley-Milner](https://en.wikipedia.org/wiki/Hindley–Milner_type_system) type inference system for strong typing. It supports Unit, Bool, Int, String, higher-order functions, tuples, and ADTs, enables naming values with `let` and recursive values with `let rec`, and includes pattern matching for ADT value deconstruction.

## TLCA Program Examples

The following examples shows off how to declare a list, some of the traditional functions over a list and then, using these functions, create, filter and transforms lists.

```sml
data Result c b = 
    Error c 
  | Okay b ;

data List a = 
    Cons a (List a) 
  | Nil ;

let range n = 
  let rec helper m =
     if (n == m) Nil else Cons m (helper m + 1)
   in helper 1 ;

let rec foldRight f z lst =
  match lst with
  | Nil -> z
  | Cons x xs -> f x (foldRight f z xs) ;

let length =
  foldRight (\a b -> b + 1) 0 ;

let sum = 
  foldRight (\a b -> a + b) 0 ;

let map f =
  foldRight (\a -> Cons (f a)) Nil ;

let rec find p lst =
  match lst with
  | Nil -> Error "Not found"
  | Cons x xs -> if (p x) Okay x else find p xs ;

let upper = 10 ;

let items = range upper + 1 ;

length items ;

map sum (map range items) ;

find (\x -> x == 2) (Cons 1 (Cons 2 (Cons 3 Nil))) ;

find (\x -> x == 10) (Cons 1 (Cons 2 (Cons 3 Nil)))
```

Rather satisfyingly the following is produced

```sml
Result c b = Error c | Okay b
List a = Cons a (List a) | Nil
range = function: Int -> List Int
foldRight = function: (a -> b -> b) -> b -> List a -> b
length = function: List a -> Int
sum = function: List Int -> Int
map = function: (a -> b) -> List a -> List b
find = function: (a -> Bool) -> List a -> Result String a
upper = 10: Int
items = Cons 1 (Cons 2 (Cons 3 (Cons 4 (Cons 5 (Cons 6 (Cons 7 (Cons 8 (Cons 9 (Cons 10 Nil))))))))): List Int
10: Int
Cons 0 (Cons 1 (Cons 3 (Cons 6 (Cons 10 (Cons 15 (Cons 21 (Cons 28 (Cons 36 (Cons 45 Nil))))))))): List Int
Okay 2: Result String Int
Error "Not found": Result String Int
```

The preceding code illustrates TLCA's features expect for mutual recursion.  This omission is addressed in the following code which declares mutually recursive functions `isOdd` and `isEven` then invokes each with a single value.

```sml
let rec isOdd n = if (n == 0) False else isEven (n - 1)
    and isEven n = if (n == 0) True else isOdd (n - 1) ;

isOdd 5 ;
isEven 5
```

The above program is type safe and, when executed, produces

```sml
isOdd = function: Int -> Bool
isEven = function: Int -> Bool
true: Bool
false: Bool
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