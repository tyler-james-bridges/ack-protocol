#!/usr/bin/env node
/**
 * Tests for ACK Health Checker
 * Verifies endpoint extraction, scoring, and review text generation.
 */

import { strict as assert } from 'assert';
import {
  CHAINS,
  extractDeclaredEndpoints,
  scoreHealthResults,
  buildReviewText,
} from './ack-health-checker.mjs';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  PASS ${name}`);
    passed++;
  } catch (error) {
    console.log(`  FAIL ${name}: ${error.message}`);
    failed++;
  }
}

console.log('\n=== ACK Health Checker Tests ===\n');

test('all chains have required fields', () => {
  for (const [key, chain] of Object.entries(CHAINS)) {
    assert.ok(chain.name, `${key} missing name`);
    assert.ok(chain.chainId, `${key} missing chainId`);
    assert.ok(chain.rpc, `${key} missing rpc`);
    assert.ok(chain.ackAgentId, `${key} missing ackAgentId`);
  }
});

test('extractDeclaredEndpoints finds web, a2a, and mcp endpoints', () => {
  const endpoints = extractDeclaredEndpoints({
    services: {
      Web: { endpoint: 'https://example.com' },
      A2A: { endpoint: 'https://agent.example.com/api/a2a' },
      MCP: { endpoint: 'https://agent.example.com/mcp' },
    },
  });

  assert.equal(endpoints.web, 'https://example.com');
  assert.equal(
    endpoints.a2a,
    'https://agent.example.com/api/a2a/.well-known/agent-card.json'
  );
  assert.equal(endpoints.mcp, 'https://agent.example.com/mcp');
});

test('extractDeclaredEndpoints supports array-shaped services', () => {
  const endpoints = extractDeclaredEndpoints({
    services: [
      { protocol: 'web', endpoint: 'https://web.example.com' },
      { protocol: 'a2a', endpoint: 'https://a2a.example.com' },
    ],
  });

  assert.equal(endpoints.web, 'https://web.example.com');
  assert.equal(
    endpoints.a2a,
    'https://a2a.example.com/.well-known/agent-card.json'
  );
});

test('scoreHealthResults gives 5 when all declared endpoints pass and at least two exist', () => {
  const result = scoreHealthResults({
    web: { success: true },
    a2a: { success: true },
  });

  assert.equal(result.value, 5);
  assert.equal(result.tag2, 'service_quality');
  assert.equal(result.status, 'healthy');
});

test('scoreHealthResults gives 3 when only one endpoint passes', () => {
  const result = scoreHealthResults({
    web: { success: true },
    a2a: { success: false },
  });

  assert.equal(result.value, 3);
  assert.equal(result.tag2, 'service_quality');
});

test('scoreHealthResults gives 1 when nothing responds', () => {
  const result = scoreHealthResults({
    web: { success: false },
    a2a: { success: false },
    mcp: { success: false },
  });

  assert.equal(result.value, 1);
  assert.equal(result.tag2, 'liveness');
  assert.equal(result.status, 'unreachable');
});

test('buildReviewText includes measured latency and operational summary', () => {
  const review = buildReviewText(
    {
      mcp: { protocol: 'mcp', success: true, latencyMs: 142, status: 200 },
      a2a: {
        protocol: 'a2a',
        success: true,
        latencyMs: 250,
        status: 200,
        skillsCount: 8,
      },
      web: { protocol: 'web', success: true, latencyMs: 89, status: 200 },
    },
    new Date('2026-03-25T18:00:00Z')
  );

  assert.ok(review.includes('MCP responds in 142ms'));
  assert.ok(review.includes('A2A card valid in 250ms with 8 skills'));
  assert.ok(review.includes('web returns 200 in 89ms'));
  assert.ok(review.endsWith('all declared services operational.'));
});

test('buildReviewText includes unreachable summary date', () => {
  const review = buildReviewText(
    {
      web: {
        protocol: 'web',
        success: false,
        status: 0,
        detail: 'timeout after 10s',
      },
      a2a: {
        protocol: 'a2a',
        success: false,
        status: 0,
        detail: 'timeout after 10s',
      },
    },
    new Date('2026-03-25T18:00:00Z')
  );

  assert.ok(review.includes('web timeout after 10s'));
  assert.ok(review.includes('A2A timeout after 10s'));
  assert.ok(
    review.endsWith(
      'all declared endpoints unreachable. last check: 2026-03-25.'
    )
  );
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
