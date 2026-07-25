#!/usr/bin/env node
/**
 * Kentiva Production Load & Rate-Limit Benchmark Tool
 * 
 * Target Standards (PROD-CHECKLIST.md):
 * - 100 req/sec sustained throughput
 * - p95 latency < 500 ms
 * - Error rate < 1%
 * - Standard 429 Rate-Limit response validation
 * 
 * Usage:
 *   node scripts/load-test.mjs --target http://localhost:8080 --concurrency 20 --duration 10
 */

import http from 'http';
import https from 'https';
import { URL } from 'url';

// Parse CLI flags
const args = process.argv.slice(2);
function getArg(flag, defaultValue) {
  const index = args.indexOf(flag);
  if (index !== -1 && args[index + 1]) {
    return args[index + 1];
  }
  return defaultValue;
}

const targetUrlStr = getArg('--target', 'http://localhost:8080');
const concurrency = parseInt(getArg('--concurrency', '20'), 10);
const durationSec = parseInt(getArg('--duration', '10'), 10);

const targetUrl = new URL(targetUrlStr);
const isHttps = targetUrl.protocol === 'https:';
const client = isHttps ? https : http;

const endpoints = [
  '/actuator/health/readiness',
  '/api/v1/public/municipalities',
  '/api/v1/reports/public-track?trackingNumber=DEMO-12345'
];

let totalRequests = 0;
let successRequests = 0;
let rateLimitedRequests = 0;
let errorRequests = 0;
const latencies = [];
const statusCodes = {};

let isRunning = true;
const startTime = Date.now();

function makeRequest() {
  if (!isRunning) return;

  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  const options = {
    hostname: targetUrl.hostname,
    port: targetUrl.port || (isHttps ? 443 : 80),
    path: endpoint,
    method: 'GET',
    headers: {
      'User-Agent': 'Kentiva-LoadTest/1.0',
      'Accept': 'application/json'
    },
    timeout: 5000
  };

  const reqStart = Date.now();
  totalRequests++;

  const req = client.request(options, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      const elapsed = Date.now() - reqStart;
      latencies.push(elapsed);

      const code = res.statusCode;
      statusCodes[code] = (statusCodes[code] || 0) + 1;

      if (code >= 200 && code < 400) {
        successRequests++;
      } else if (code === 429) {
        rateLimitedRequests++;
      } else {
        errorRequests++;
      }

      if (isRunning) setImmediate(makeRequest);
    });
  });

  req.on('error', (err) => {
    const elapsed = Date.now() - reqStart;
    latencies.push(elapsed);
    errorRequests++;
    statusCodes['ERR'] = (statusCodes['ERR'] || 0) + 1;

    if (isRunning) setImmediate(makeRequest);
  });

  req.on('timeout', () => {
    req.destroy();
  });

  req.end();
}

console.log(`🚀 Starting Kentiva Load Test...`);
console.log(`📍 Target: ${targetUrlStr}`);
console.log(`⚡ Concurrency: ${concurrency}`);
console.log(`⏱️ Duration: ${durationSec}s`);
console.log(`-----------------------------------------------`);

// Spawn concurrent workers
for (let i = 0; i < concurrency; i++) {
  makeRequest();
}

// Timer to stop test
setTimeout(() => {
  isRunning = false;
  const totalTimeSec = (Date.now() - startTime) / 1000;

  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.50)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
  const rps = (totalRequests / totalTimeSec).toFixed(2);
  const errRate = ((errorRequests / totalRequests) * 100).toFixed(2);

  console.log(`\n📊 LOAD TEST RESULTS SUMMARY`);
  console.log(`-----------------------------------------------`);
  console.log(`Total Requests Sent : ${totalRequests}`);
  console.log(`Successful (2xx/3xx): ${successRequests}`);
  console.log(`Rate-Limited (429)  : ${rateLimitedRequests}`);
  console.log(`Errors (5xx/Fail)   : ${errorRequests} (${errRate}%)`);
  console.log(`Throughput          : ${rps} req/sec`);
  console.log(`-----------------------------------------------`);
  console.log(`Latency p50         : ${p50} ms`);
  console.log(`Latency p95         : ${p95} ms (Target: < 500 ms)`);
  console.log(`Latency p99         : ${p99} ms`);
  console.log(`-----------------------------------------------`);
  console.log(`Status Codes        :`, statusCodes);
  console.log(`-----------------------------------------------`);

  if (p95 <= 500 && parseFloat(errRate) < 1.0) {
    console.log(`✅ VERDICT: PASSED PROD STANDARDS!`);
  } else {
    console.log(`⚠️ VERDICT: NEEDS OPTIMIZATION (p95 or error rate exceeded targets)`);
  }
}, durationSec * 1000);
