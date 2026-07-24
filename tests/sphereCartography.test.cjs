const assert = require('node:assert/strict');
const test = require('node:test');
const { createSphereCartography } = require('../.tmp-tests/domain/sphereCartography.js');
const { createDemoSphereMaterials } = require('../.tmp-tests/domain/sphereCartographyFixtures.js');

const now = new Date('2026-07-23T00:00:00.000Z');

test('creates stable deterministic node placement', () => {
  const materials = createDemoSphereMaterials();
  const first = createSphereCartography(materials, [], { now });
  const second = createSphereCartography(materials, [], { now });

  assert.deepEqual(first.nodes.map((node) => node.position), second.nodes.map((node) => node.position));
});

test('maps titles, creators, disciplines, practices, X/O markings, and support nodes', () => {
  const cartography = createSphereCartography(createDemoSphereMaterials(), [], { now });
  const attention = cartography.nodes.find((node) => node.title === 'Forms of Attention');

  assert.equal(attention?.creator, 'Mara Ellison');
  assert.equal(attention?.disciplines.includes('attention studies'), true);
  assert.equal(attention?.practices.includes('currently-reading'), true);
  assert.equal(attention?.xMark, true);
  assert.equal(cartography.nodes.some((node) => node.oMark), true);
  assert.equal(cartography.supportNodes.some((node) => node.label === 'mara ellison' && node.strength === 2), true);
});

test('calculates revisit, recency, co-visitation, rediscovery, and color overrides', () => {
  const cartography = createSphereCartography(createDemoSphereMaterials(), [], { now });
  const attention = cartography.nodes.find((node) => node.title === 'Forms of Attention');
  const path = cartography.paths.find((item) => item.keywords.includes('pedagogy'));

  assert.equal(attention?.engagement.rediscovered, true);
  assert.equal(attention?.color.source, 'student-confirmed');
  assert.equal(attention?.color.label, 'focus');
  assert.ok((attention?.density ?? 0) > 0.4);
  assert.ok((attention?.luminosity ?? 0) > 0.8);
  assert.ok((path?.coVisitCount ?? 0) > 0);
});

test('handles missing metadata and empty libraries', () => {
  const empty = createSphereCartography([], [], { now });
  const sparse = createSphereCartography([{
    id: 'sparse',
    title: 'Sparse Material',
    kind: 'reference',
    lifecycleStage: 'engagement',
    originPathway: 'library',
    currentPathways: ['library'],
    sourceMaterialIds: [],
    linkedMaterialIds: [],
    routeHistory: [],
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    searchIndexing: { status: 'not-indexed' },
  }], [], { now });

  assert.equal(empty.nodes.length, 0);
  assert.equal(sparse.nodes.length, 1);
  assert.equal(sparse.latitudeRegions[0].value, 'general study');
  assert.equal(sparse.longitudeRegions[0].value, 'engagement');
});
