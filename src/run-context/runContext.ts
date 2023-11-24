import {
  Op0NotRelocatable,
  Op0Undefined,
  Op1ImmediateOffsetError,
  RunContextError,
} from 'errors/runContext';
import { SignedInteger16 } from 'primitives/int';
import {
  ProgramCounter,
  Relocatable,
  MemoryPointer,
  MaybeRelocatable,
} from 'primitives/relocatable';
import { UnsignedInteger } from 'primitives/uint';
import { Op1Src, RegisterFlag } from 'vm/instruction';

export class RunContext {
  pc: ProgramCounter;
  ap: MemoryPointer;
  fp: MemoryPointer;

  static default() {
    return new RunContext(0, 0, 0);
  }

  constructor(pc: number, ap: number, fp: number) {
    this.pc = new ProgramCounter(pc);
    this.ap = new MemoryPointer(ap);
    this.fp = new MemoryPointer(fp);
  }

  incrementPc(instructionSize: number): void {
    this.pc = this.pc.add(instructionSize);
  }

  // Computes the address of the relocatable based on a register flag (ap or fp)
  // and an offset to apply to this register.
  computeAddress(register: RegisterFlag, offset: number): Relocatable {
    switch (register) {
      case RegisterFlag.AP:
        return applyOffsetOnBaseAddress(this.ap, offset);

      case RegisterFlag.FP:
        return applyOffsetOnBaseAddress(this.fp, offset);
    }
  }

  // Computes the address of the operand 1 based on the source, an offset to
  // apply to the source and the operand 0.
  computeOp1Address(
    op1Src: Op1Src,
    op1Offset: number,
    op0: MaybeRelocatable | undefined
  ): Relocatable {
    SignedInteger16.ensureInt16(op1Offset);
    // We start by computing the base address based on the source for
    // operand 1.
    let baseAddr: Relocatable;
    switch (op1Src) {
      case Op1Src.AP:
        baseAddr = this.ap;
        break;
      case Op1Src.FP:
        baseAddr = this.fp;
        break;
      case Op1Src.Imm:
        // In case of immediate as the source, the offset
        // has to be 1, otherwise we return an error.
        if (op1Offset == 1) {
          baseAddr = this.pc;
        } else {
          throw new RunContextError(Op1ImmediateOffsetError);
        }
        break;
      case Op1Src.Op0:
        // In case of operand 0 as the source, we have to check that
        // operand 0 is not undefined.
        if (op0 === undefined) {
          throw new RunContextError(Op0Undefined);
        }

        if (!Relocatable.isRelocatable(op0)) {
          throw new RunContextError(Op0NotRelocatable);
        }
        baseAddr = op0;
    }

    // We then apply the offset to the base address.
    return applyOffsetOnBaseAddress(baseAddr, op1Offset);
  }
}

// Applies an offset to a base address The offset can be negative.
function applyOffsetOnBaseAddress(
  baseAddr: Relocatable,
  offset: number
): Relocatable {
  SignedInteger16.ensureInt16(offset);
  const offsetIsNegative = offset < 0 ? 1 : 0;

  const value =
    -1 * offsetIsNegative * offset + (1 - offsetIsNegative) * offset;

  UnsignedInteger.ensureUint53(value);

  return offsetIsNegative ? baseAddr.sub(value) : baseAddr.add(value);
}
