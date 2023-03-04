package tlca

import kotlin.test.Test
import kotlin.test.assertEquals

class SubstTest {
    @Test
    fun emptyCompose() {
        assertEquals(nullSubst, nullSubst compose nullSubst)
    }

    @Test
    fun nonOverlappingCompose() {
        assertEquals(
            Subst(
                mapOf(
                    Pair("a", typeBool), Pair("b", typeBool)
                )
            ), Subst(mapOf(Pair("a", typeBool))) compose Subst(mapOf(Pair("b", typeBool)))
        )
    }

    @Test
    fun trivialOverlappingCompose() {
        assertEquals(
            Subst(mapOf(Pair("a", typeBool))), Subst(mapOf(Pair("a", typeBool))) compose Subst(mapOf(Pair("a", typeInt)))
        )
    }

    @Test
    fun substituteOnCompose() {
        assertEquals(
            Subst(
                mapOf(
                    Pair("a", typeBool), Pair("b", typeBool)
                )
            ), Subst(mapOf(Pair("a", typeBool))) compose Subst(mapOf(Pair("b", TVar("a"))))
        )
    }

    @Test
    fun ignoreLeftSubstitutionOnCompose() {
        assertEquals(
            Subst(
                mapOf(
                    Pair("a", typeBool), Pair("b", TVar("a"))
                )
            ), Subst(mapOf(Pair("b", TVar("a")))) compose Subst(mapOf(Pair("a", typeBool)))
        )
    }
}
