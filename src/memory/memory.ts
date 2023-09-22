import {
  MaybeRelocatable,
  Relocatable,
  SegmentError,
} from './primitives/relocatable';
import { Uint, UnsignedInteger } from './primitives/uint';

export class MemoryError extends Error {}
export class WriteOnceError extends MemoryError {}
export class UnknownAddressError extends MemoryError {}

class Memory {
  data: Map<Relocatable, MaybeRelocatable>;
  numSegments: Uint;

  constructor(data: Map<Relocatable, MaybeRelocatable>, numSegments: number) {
    this.data = data;
    this.numSegments = UnsignedInteger.toUint(numSegments);
  }

  insert(address: Relocatable, value: MaybeRelocatable) {
    if (address.getSegmentIndex() >= this.numSegments) {
      throw new SegmentError();
    }

    if (this.data.get(address) !== undefined) {
      throw new WriteOnceError();
    }

    this.data.set(address, value);
  }

  get(address: Relocatable) {
    const value = this.data.get(address);
    if (value === undefined) {
      throw new UnknownAddressError();
    }
  }
}

class MemorySegmentManager {
  segmentSizes: Record<number, number>;
  memory: Memory;

  constructor(segmentSizes: Record<number, number>, memory: Memory) {
    this.segmentSizes = segmentSizes;
    this.memory = memory;
  }

  addSegment() {
    this.memory.numSegments = UnsignedInteger.toUint(
      this.memory.numSegments + 1
    );
    return new Relocatable(this.memory.numSegments - 1, 0);
  }

  loadData(address: Relocatable, data: MaybeRelocatable[]) {
    data.forEach((d, index) =>
      this.memory.insert(
        address.addPositiveNumber(UnsignedInteger.toUint(index)),
        d
      )
    );
    return address.addPositiveNumber(UnsignedInteger.toUint(data.length));
  }
}