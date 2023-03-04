package tlca

typealias Var = String

sealed class Type {
    abstract fun apply(s: Subst): Type
    abstract fun ftv(): Set<Var>
}

data class TVar(val name: String) : Type() {
    override fun apply(s: Subst): Type =
        s[name] ?: this

    override fun ftv(): Set<Var> =
        setOf(name)

    override fun toString(): String = name
}

data class TCon(val name: String, val args: List<Type> = emptyList()) : Type() {
    override fun apply(s: Subst): Type =
        if (args.isEmpty()) this else TCon(name, args.map { it.apply(s) })

    override fun ftv(): Set<Var> = args.fold(emptySet()) { acc, t -> acc + t.ftv() }

    override fun toString(): String = if (args.isEmpty()) name else "$name ${
        args.joinToString(" ") { if (it is TCon && it.args.isNotEmpty() || it is TArr) "($it)" else "$it" }
    }"
}

data class TTuple(val types: List<Type>) : Type() {
    override fun apply(s: Subst): Type =
        TTuple(types.map { it.apply(s) })

    override fun ftv(): Set<Var> =
        types.fold(emptySet()) { acc, t -> acc + t.ftv() }

    override fun toString(): String = "(${types.joinToString(" * ")})"
}

data class TArr(val domain: Type, val range: Type) : Type() {
    override fun apply(s: Subst): Type =
        TArr(domain.apply(s), range.apply(s))

    override fun ftv(): Set<Var> =
        domain.ftv() + range.ftv()

    override fun toString(): String =
        if (domain is TArr) "($domain) -> $range" else "$domain -> $range"
}

val typeBool = TCon("Bool")
val typeError = TCon("Error")
val typeInt = TCon("Int")
val typeString = TCon("String")
val typeUnit = TCon("()")

data class Subst(private val items: Map<Var, Type>) {
    infix fun compose(s: Subst): Subst =
        Subst(s.items.mapValues { it.value.apply(this) } + items)

    operator fun get(v: Var): Type? = items[v]

    operator fun minus(names: Set<Var>): Subst =
        Subst(items - names)
}

val nullSubst = Subst(emptyMap())

data class Scheme(private val names: Set<Var>, private val type: Type) {
    fun apply(s: Subst): Scheme =
        Scheme(names, type.apply(s - names))

    fun ftv(): Set<Var> =
        type.ftv() - names

    fun instantiate(pump: Pump): Type =
        type.apply(Subst(names.toList().associateWith { pump.next() }))
}

data class DataConstructor(
    val name: String,
    val args: List<Type>
) {
    val arity: Int
        get() = args.size
}

data class DataDefinition(val name: String, val typeVars: List<String>, val constructors: List<DataConstructor>) {
    override fun toString(): String = "$name${if (typeVars.isEmpty()) "" else " "}${typeVars.joinToString(" ")} = ${
        constructors.joinToString(" | ") {
            "${it.name}${if (it.args.isEmpty()) "" else " "}${
                it.args.joinToString(" ") { if (it is TCon && it.args.isNotEmpty() || it is TArr) "($it)" else "$it" }
            }"
        }
    }"
}

data class TypeEnv(private val values: Map<String, Scheme>, private val adts: List<DataDefinition>) {
    private val ftv = values.toList().flatMap { it.second.ftv() }.toSet()

    fun extend(name: String, scheme: Scheme): TypeEnv =
        TypeEnv(values + Pair(name, scheme), adts)

    fun addData(data: DataDefinition): TypeEnv =
        TypeEnv(values, adts.filter { it.name != data.name } + data)

    fun findConstructor(name: String): Pair<DataConstructor, DataDefinition>? =
        adts.flatMap { it.constructors.map { c -> Pair(c, it) } }.find { it.first.name == name }

    operator fun plus(v: Pair<String, Scheme>): TypeEnv =
        this.extend(v.first, v.second)

    operator fun plus(v: List<Pair<String, Scheme>>): TypeEnv =
        v.fold(this) { acc, p -> acc + p }

    fun apply(s: Subst): TypeEnv =
        TypeEnv(values.mapValues { it.value.apply(s) }, adts)

    operator fun get(name: String): Scheme? = values[name]

    fun data(name: String): DataDefinition? = adts.find { it.name == name }

    fun generalise(type: Type): Scheme =
        Scheme(type.ftv() - ftv, type)
}

val emptyTypeEnv = TypeEnv(emptyMap(), emptyList())
val defaultTypeEnv = emptyTypeEnv
    .extend("string_length", Scheme(setOf(), TArr(typeString, typeInt)))
    .extend("string_concat", Scheme(setOf(), TArr(typeString, TArr(typeString, typeString))))
    .extend("string_substring", Scheme(setOf(), TArr(typeString, TArr(typeInt, TArr(typeInt, typeString)))))
    .extend("string_equal", Scheme(setOf(), TArr(typeString, TArr(typeString, typeBool))))
    .extend("string_compare", Scheme(setOf(), TArr(typeString, TArr(typeString, typeInt))))


data class Pump(private var counter: Int = 0) {
    fun next(): TVar {
        counter += 1
        return TVar("V$counter")
    }

    fun nextN(size: Int): List<TVar> =
        (1..size).map { next() }
}
