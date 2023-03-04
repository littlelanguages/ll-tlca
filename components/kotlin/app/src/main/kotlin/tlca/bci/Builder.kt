package tlca.bci

import java.io.File

data class CodeLabel(val name: String)
data class DataOffset(val offset: Int)

class Builder {
    private var labelNameGenerator = 0

    private val blocks = mutableListOf<BlockBuilder>()
    private val data = mutableListOf<Byte>()

    fun nextLabelName() = "L${labelNameGenerator++}"
    fun dataOffset(): DataOffset = DataOffset(data.size)

    private fun build(): List<Byte> {
        val result = mutableListOf<Byte>()
        val blockSizes = blocks.map { it.size() }
        val blockOffsets = blocks.zip(blockSizes.scan(4) { acc, size -> acc + size }) { block, offset -> block.name to offset }.toMap()
        val dataOffset = blockSizes.sum() + 4

        appendInt(dataOffset, result)

        for (block in blocks) {
            result.addAll(block.build(blockOffsets, dataOffset))
        }
        result.addAll(data)

        return result
    }

    fun writeTo(file: File) {
        file.delete()
        file.appendBytes(build().toByteArray())
    }

    fun createBlock(): BlockBuilder {
        val name = nextLabelName()
        val builder = BlockBuilder(CodeLabel(name), this)
        blocks.add(builder)
        return builder
    }

    fun writeIntToData(v: Int) =
        appendInt(v, data)

    fun writeStringToData(s: String) {
        data.addAll(s.map { it.code.toByte() })
        data.add(0.toByte())
    }
}

class BlockBuilder(val name: CodeLabel, val builder: Builder) {
    private val instructions = mutableListOf<Byte>()
    private val patches = mutableListOf<Pair<Int, CodeLabel>>()
    private val labels = mutableMapOf<CodeLabel, Int>()
    private val dataPatches = mutableListOf<Pair<Int, DataOffset>>()

    fun size() = instructions.size

    fun build(offsets: Map<CodeLabel, Int>, dataOffset: Int): List<Byte> {
        val myOffset = offsets[name]!!
        val result = instructions.toMutableList()
        for ((index, label) in patches) {
            val offset = offsets[label] ?: ((labels[label] ?: throw Exception("Unknown label $label")) + myOffset)
//            println("Patching $name - $label at $index to ${offset + myOffset} (${result.size})")
            writeIntAt(offset, index, result)
        }
        for ((index, offset) in dataPatches) {
            val actualOffset = dataOffset + offset.offset
            writeIntAt(actualOffset, index, result)
        }

        return result
    }

    fun writeIntToCode(v: Int) =
        appendInt(v, instructions)

    fun writeInToCodeAt(value: Int, i: Int) =
        writeIntAt(value, i, instructions)

    fun writeLabelToCode(label: CodeLabel) {
        patches.add(instructions.size to label)
        writeIntToCode(0)
    }

    fun writeDataOffsetToCode(offset: DataOffset) {
        dataPatches.add(Pair(instructions.size, offset))
        writeIntToCode(0)
    }

    fun writeOpCodeToCode(opCode: InstructionOpCode) {
        instructions.add(opCode.ordinal.toByte())
    }

    fun writeStringToCode(s: String) {
        instructions.addAll(s.map { it.code.toByte() })
        instructions.add(0.toByte())
    }

    fun dataOffset(): DataOffset = builder.dataOffset()

    fun writeIntToData(v: Int) =
        builder.writeIntToData(v)

    fun writeStringToData(s: String) =
        builder.writeStringToData(s)

    fun markCodeLabel(label: CodeLabel) {
        labels[label] = instructions.size
    }

    fun nextCodeLabelName(): CodeLabel =
        CodeLabel(builder.nextLabelName())

    fun currentDataOffset(): DataOffset =
        builder.dataOffset()

    fun emitPrintLn() {
        writeOpCodeToCode(InstructionOpCode.PUSH_BUILTIN)
        writeStringToCode("\$\$builtin-println")
        writeOpCodeToCode(InstructionOpCode.PUSH_UNIT)
        writeOpCodeToCode(InstructionOpCode.SWAP_CALL)
    }

    fun emitPrintString(s: String) {
        writeOpCodeToCode(InstructionOpCode.PUSH_BUILTIN)
        writeStringToCode("\$\$builtin-print")
        writeOpCodeToCode(InstructionOpCode.PUSH_STRING)
        writeStringToCode(s)
        writeOpCodeToCode(InstructionOpCode.SWAP_CALL)
    }

    fun emitPrintLiteralVariable(depth: Int, offset: Int) {
        writeOpCodeToCode(InstructionOpCode.PUSH_BUILTIN)
        writeStringToCode("\$\$builtin-print-literal")
        writeOpCodeToCode(InstructionOpCode.PUSH_VAR)
        writeIntToCode(depth)
        writeIntToCode(offset)
        writeOpCodeToCode(InstructionOpCode.SWAP_CALL)
    }

    fun emitPrintLiteralThing(thing: () -> Unit) {
        writeOpCodeToCode(InstructionOpCode.PUSH_BUILTIN)
        writeStringToCode("\$\$builtin-print-literal")
        thing()
        writeOpCodeToCode(InstructionOpCode.SWAP_CALL)
    }

    fun emitFatalError(reason: String, code: Int) {
        writeOpCodeToCode(InstructionOpCode.PUSH_BUILTIN)
        writeStringToCode("\$\$builtin-fatal-error")
        writeOpCodeToCode(InstructionOpCode.PUSH_STRING)
        writeStringToCode(reason)
        writeOpCodeToCode(InstructionOpCode.SWAP_CALL)
        writeOpCodeToCode(InstructionOpCode.PUSH_INT)
        writeIntToCode(code)
        writeOpCodeToCode(InstructionOpCode.SWAP_CALL)
    }
}

private fun writeIntAt(v: Int, at: Int, data: MutableList<Byte>) {
    data[at] = v.toByte()
    data[at + 1] = (v shr 8).toByte()
    data[at + 2] = (v shr 16).toByte()
    data[at + 3] = (v shr 24).toByte()
}

private fun appendInt(v: Int, data: MutableList<Byte>) {
    data.add(v.toByte())
    data.add((v shr 8).toByte())
    data.add((v shr 16).toByte())
    data.add((v shr 24).toByte())
}
