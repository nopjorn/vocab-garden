import { test } from "node:test";
import assert from "node:assert/strict";

import { GIFTS, RARITIES, giftId, giftedOn, ownedGifts, pickGift } from "../../app/js/gifts.js";

test("every gift has a unique id that fits the medal key format and a known rarity", () => {
  const ids = GIFTS.map(giftId);
  assert.equal(new Set(ids).size, ids.length);
  ids.forEach((id) => assert.match(id, /^[a-z0-9-]{1,30}$/));
  GIFTS.forEach((gift) => assert.ok(gift.rarity in RARITIES, gift.id));
});

test("pickGift only picks gifts not owned yet", () => {
  const owned = Object.fromEntries(GIFTS.slice(1).map((gift) => [giftId(gift), 3]));
  assert.equal(pickGift(owned, () => 0.99), GIFTS[0]);
  assert.equal(pickGift(Object.fromEntries(GIFTS.map((gift) => [giftId(gift), 3]))), null);
});

test("pickGift weights by rarity: common gifts come up more often", () => {
  let seed = 7;
  const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const counts = { common: 0, rare: 0, legendary: 0 };
  for (let index = 0; index < 3000; index += 1) counts[pickGift({}, rng).rarity] += 1;
  assert.ok(counts.common > counts.rare && counts.rare > counts.legendary, JSON.stringify(counts));
  assert.ok(counts.legendary > 0);
});

test("giftedOn and ownedGifts read gift entries among other medals", () => {
  const medals = { "plant-1": 5, [giftId(GIFTS[2])]: 9 };
  assert.equal(giftedOn(medals, 9), true);
  assert.equal(giftedOn(medals, 10), false);
  assert.deepEqual(ownedGifts(medals), [GIFTS[2]]);
});
