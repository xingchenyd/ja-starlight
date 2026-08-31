import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("homepage uses content-led cinematic storytelling", async () => {
  const [page, carousel, journey, impact, styles] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/HomeCarousel.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/HomeGrowthJourney.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/HomeImpactStories.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/home-experience.css", import.meta.url), "utf8"),
  ]);

  assert.match(page, /cinema-hero/);
  assert.match(page, /HomeGrowthJourney/);
  assert.match(page, /HomeImpactStories/);
  assert.match(carousel, /getPublicCatalog/);
  assert.match(carousel, /6500/);
  assert.match(carousel, /暂停轮播/);
  assert.match(journey, /IntersectionObserver/);
  assert.match(journey, /公开成长档案/);
  assert.match(impact, /7500/);
  assert.match(impact, /成长者故事/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(styles, /scroll-snap-type/);
});
