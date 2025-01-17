import { MemoryError, WriteOnceError } from 'errors/memory';
import { SegmentError } from 'errors/primitives';
import { MaybeRelocatable, Relocatable } from 'primitives/relocatable';

export class Memory {
  data: Array<Array<MaybeRelocatable>>;

  constructor() {
    this.data = [[]];
  }

  get(address: Relocatable): MaybeRelocatable | undefined {
    return this.data[address.getSegmentIndex()][address.getOffset()];
  }

  addSegment(): Relocatable {
    this.data.push([]);
    return new Relocatable(this.data.length - 1, 0);
  }

  getSegmentNumber(): number {
    return this.data.length;
  }

  setData(address: Relocatable, data: MaybeRelocatable[]): void {
    data.forEach((value, index) => {
      this.write(address.add(index), value);
    });
  }

  // Insert a value in the memory at the given address and increase
  // the segment size by 1.
  write(address: Relocatable, value: MaybeRelocatable): void {
    if (address.getSegmentIndex() >= this.getSegmentNumber()) {
      throw new MemoryError(
        `${SegmentError}: trying to insert at segment ${address.getSegmentIndex()} while there are only ${this.getSegmentNumber()} segments.`
      );
    }
    if (
      this.data[address.getSegmentIndex()][address.getOffset()] !== undefined
    ) {
      throw new MemoryError(WriteOnceError);
    }
    this.data[address.getSegmentIndex()][address.getOffset()] = value;
  }

  getSegmentSize(segmentIndex: number): number {
    return this.data[segmentIndex]?.length ?? 0;
  }
}
