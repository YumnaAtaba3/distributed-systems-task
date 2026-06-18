// ============================================================
// 1. دالة هاش قوية (MurmurHash3 المبسطة)
// ============================================================
export function hashToRing(key: string | number): number {
  const str = String(key);
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 0x85ebca6b);
    h2 = Math.imul(h2 ^ ch, 0xc2b2ae35);
  }
  
  h1 ^= h2 >>> 16;
  h2 ^= h1 >>> 16;
  
  // إرجاع قيمة بين 0 و 1 (بدون قصاصة % 1000)
  return (h1 >>> 0) / 0xFFFFFFFF;
}

// ============================================================
// 2. التوزيع بالنطاق (Range-Based) - النطاقات ثابتة!
// ============================================================
// تعريف النطاقات مسبقاً (ثابتة لا تتغير)
const SHARD_RANGES: { min: number; max: number; shard: number }[] = [
  { min: 1, max: 10, shard: 0 },
  { min: 11, max: 20, shard: 1 },
  { min: 21, max: Infinity, shard: 2 },
];

export function getRangeShard(id: number): number {
  for (const range of SHARD_RANGES) {
    if (id >= range.min && id <= range.max) {
      return range.shard;
    }
  }
  return 0; // Fallback (لن يحدث أبداً)
}

// دالة للحصول على النطاق كله (للعرض في الواجهة)
export function getRangeInfo(shardId: number): string {
  const range = SHARD_RANGES.find(r => r.shard === shardId);
  if (!range) return "N/A";
  const maxStr = range.max === Infinity ? "∞" : range.max.toString();
  return `${range.min}–${maxStr}`;
}

// ============================================================
// 3. حلقة التجزئة المتسقة (Consistent Hashing Ring)
// ============================================================
export interface RingNode {
  hash: number;
  shardId: number;
}

export class ConsistentHashRing {
  private ring: RingNode[] = [];
  private shardCount: number;
  private virtualNodes: number;

  constructor(shardCount: number, virtualNodes = 50) {
    this.shardCount = shardCount;
    this.virtualNodes = virtualNodes;
    this.rebuildRing();
  }

  private rebuildRing() {
    this.ring = [];
    for (let s = 0; s < this.shardCount; s++) {
      for (let v = 0; v < this.virtualNodes; v++) {
        // إضافة ملح (Salt) فريد لكل عقدة افتراضية
        const salt = v * 1000 + s * 500;
        const vnodeKey = `shard-${s}-vnode-${v}-salt-${salt}`;
        const nodeHash = hashToRing(vnodeKey);
        this.ring.push({
          hash: nodeHash,
          shardId: s,
        });
      }
    }
    // ترتيب تصاعدي
    this.ring.sort((a, b) => a.hash - b.hash);
  }

  public getShard(key: string | number): number {
    if (this.ring.length === 0) return 0;
    const keyHash = hashToRing(key);

    // بحث ثنائي عن أول عقدة هاشها >= مفتاح المستخدم
    let low = 0;
    let high = this.ring.length - 1;
    let foundIndex = 0;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (this.ring[mid].hash >= keyHash) {
        foundIndex = mid;
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }

    // إذا كان المفتاح أكبر من آخر عقدة، نبحث من البداية
    if (keyHash > this.ring[this.ring.length - 1].hash) {
      // ابحث عن أول عقدة مناسبة (قد تكون ring[0] أو غيرها)
      for (const node of this.ring) {
        if (node.hash >= keyHash) return node.shardId;
      }
      // إذا لم نجد (وهذا مستحيل عملياً)، ارجع أول عقدة
      return this.ring[0].shardId;
    }

    return this.ring[foundIndex].shardId;
  }

  // دالة لإعادة بناء الحلقة عند تغيير عدد الخوادم
  public updateShardCount(newCount: number) {
    if (newCount !== this.shardCount) {
      this.shardCount = newCount;
      this.rebuildRing();
    }
  }

  // دالة للحصول على إحصائيات الحلقة (للعرض)
  public getStats() {
    const stats: { shardId: number; count: number; hashes: number[] }[] = [];
    for (let i = 0; i < this.shardCount; i++) {
      stats.push({ shardId: i, count: 0, hashes: [] });
    }
    for (const node of this.ring) {
      stats[node.shardId].count++;
      stats[node.shardId].hashes.push(node.hash);
    }
    return stats;
  }
}
