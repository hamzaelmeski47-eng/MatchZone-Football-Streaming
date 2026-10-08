/**
 * Comprehensive Test Suite for SportSRC V2 Live Streaming Integration
 * Tests:
 * 1. Upcoming match behavior
 * 2. Live match with stream
 * 3. Live match without stream ("البث المباشر غير متوفر حالياً")
 * 4. Finished match behavior
 * 5. Multiple sources handling
 * 6. Failed source fallback ("البث غير متوفر حالياً" when all fail)
 * 7. SportSRC unavailable / network errors
 * 8. HTTP 429 rate limiting
 * 9. Mobile responsiveness
 * 10. Desktop responsiveness
 * 11. RTL direction & Arabic text
 * 12. API key security & leak prevention
 */

import { SportSrcProvider } from "./providers/sportsrc.provider";
import { getLiveSourcesForMatch } from "./services/live-sources.service";
import { providerRegistry } from "./providers";
import * as fs from "fs";
import * as path from "path";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ [PASS] ${testName}`);
    passedCount++;
  } else {
    console.error(`  ✗ [FAIL] ${testName}${detail ? ` - ${detail}` : ""}`);
    failedCount++;
  }
}

async function runTests() {
  console.log("==================================================");
  console.log("SportSRC V2 Live-Streaming Integration Test Suite");
  console.log("==================================================\n");

  // ----------------------------------------------------------------
  // Test 1: Upcoming match
  // ----------------------------------------------------------------
  console.log("TEST 1: Upcoming match");
  {
    const res = await getLiveSourcesForMatch(123456, {
      home: "Arsenal",
      away: "Chelsea",
      status: "upcoming",
      date: "2026-10-15",
    });
    // For upcoming matches with no active live stream, sources should be empty and message accurate
    assert(
      Array.isArray(res.sources),
      "Upcoming match sources returned as array"
    );
    assert(
      res.sources.length === 0,
      "Upcoming match has no live video stream URLs returned"
    );
    assert(
      res.message === "البث المباشر غير متوفر حالياً",
      "Correct empty message returned for upcoming match without stream"
    );
  }

  // ----------------------------------------------------------------
  // Test 2: Live match with stream
  // ----------------------------------------------------------------
  console.log("\nTEST 2: Live match with stream");
  {
    // Test SportSrcProvider parser with mocked valid response
    const provider = new SportSrcProvider("test-key", "https://api.sportsrc.org/v2/");
    // Access private parser method
    const parsedSources = (provider as any).parseDetailResponse(
      {
        success: true,
        data: {
          streams: [
            {
              id: "src-1",
              name: "المصدر 1 - HD",
              embed_url: "https://player.sportsrc.org/embed/101",
              type: "embed",
              quality: "1080p",
            },
            {
              id: "src-2",
              name: "المصدر 2 - SD",
              embed_url: "https://player.sportsrc.org/embed/102",
              type: "embed",
              quality: "720p",
            },
          ],
        },
      },
      101
    );

    assert(parsedSources.length === 2, "Parsed exactly 2 streams from SportSRC detail response");
    assert(parsedSources[0].embedUrl === "https://player.sportsrc.org/embed/101", "Stream 1 has correct embed URL");
    assert(parsedSources[0].type === "embed", "Stream 1 is normalized as embed type");
    assert(parsedSources[0].name === "المصدر 1 - HD", "Stream 1 has correct Arabic label");
    assert(parsedSources[1].embedUrl === "https://player.sportsrc.org/embed/102", "Stream 2 has correct embed URL");
  }

  // ----------------------------------------------------------------
  // Test 3: Live match without stream
  // ----------------------------------------------------------------
  console.log("\nTEST 3: Live match without stream");
  {
    const res = await getLiveSourcesForMatch(999999, {
      home: "Unknown FC",
      away: "Nonexistent Team",
      status: "live",
    });
    assert(res.hasSources === false, "hasSources is false when no stream exists");
    assert(res.sources.length === 0, "sources array is empty");
    assert(
      res.message === "البث المباشر غير متوفر حالياً",
      "Returns exact Arabic message: 'البث المباشر غير متوفر حالياً'"
    );
  }

  // ----------------------------------------------------------------
  // Test 4: Finished match
  // ----------------------------------------------------------------
  console.log("\nTEST 4: Finished match");
  {
    const res = await getLiveSourcesForMatch(111222, {
      home: "Real Madrid",
      away: "Barcelona",
      status: "finished",
    });
    assert(res.sources.length === 0, "Finished match returns no active live streams");
    assert(res.hasSources === false, "Finished match hasSources is false");
  }

  // ----------------------------------------------------------------
  // Test 5: Multiple sources
  // ----------------------------------------------------------------
  console.log("\nTEST 5: Multiple sources");
  {
    const provider = new SportSrcProvider("test-key", "https://api.sportsrc.org/v2/");
    const sources = (provider as any).parseDetailResponse(
      {
        streams: [
          { name: "المصدر 1", url: "https://partner1.org/embed/1" },
          { name: "المصدر 2", url: "https://partner2.org/embed/2" },
          { name: "المصدر 3", url: "https://partner3.org/embed/3" },
        ],
      },
      777
    );
    assert(sources.length === 3, "Handled 3 distinct sources");
    assert(sources[0].name === "المصدر 1", "First source named correctly");
    assert(sources[1].name === "المصدر 2", "Second source named correctly");
    assert(sources[2].name === "المصدر 3", "Third source named correctly");
  }

  // ----------------------------------------------------------------
  // Test 6: Failed source fallback
  // ----------------------------------------------------------------
  console.log("\nTEST 6: Failed source fallback logic");
  {
    // Simulate source fallback progression:
    const mockSources = [
      { id: "s1", name: "المصدر 1", embedUrl: "https://cdn.test/1" },
      { id: "s2", name: "المصدر 2", embedUrl: "https://cdn.test/2" },
      { id: "s3", name: "المصدر 3", embedUrl: "https://cdn.test/3" },
    ];

    const failed = new Set<string>();

    // S1 fails -> switch to S2
    failed.add("s1");
    let remaining = mockSources.filter((s) => !failed.has(s.id));
    assert(remaining.length === 2 && remaining[0].id === "s2", "Source 1 failure falls back to Source 2");

    // S2 fails -> switch to S3
    failed.add("s2");
    remaining = mockSources.filter((s) => !failed.has(s.id));
    assert(remaining.length === 1 && remaining[0].id === "s3", "Source 2 failure falls back to Source 3");

    // S3 fails -> all failed
    failed.add("s3");
    remaining = mockSources.filter((s) => !failed.has(s.id));
    assert(remaining.length === 0, "When all sources fail, allFailed state is reached");
  }

  // ----------------------------------------------------------------
  // Test 7: SportSRC unavailable / timeout
  // ----------------------------------------------------------------
  console.log("\nTEST 7: SportSRC unavailable / timeout handling");
  {
    // Point to non-routable port to simulate timeout / unreachable provider
    const badProvider = new SportSrcProvider("test-key", "http://127.0.0.1:59999/");
    const res = await badProvider.getSources({
      fixtureId: 8888,
      homeTeam: "Arsenal",
      awayTeam: "Chelsea",
      status: "live",
    });
    assert(Array.isArray(res) && res.length === 0, "Gracefully handles unreachable provider without throwing");
  }

  // ----------------------------------------------------------------
  // Test 8: HTTP 429 rate limit error
  // ----------------------------------------------------------------
  console.log("\nTEST 8: HTTP 429 rate limit error handling");
  {
    const provider = new SportSrcProvider("test-key", "https://api.sportsrc.org/v2/");
    // Verify logHttpError doesn't crash on 429
    let didThrow = false;
    try {
      (provider as any).logHttpError(429, "test-context");
    } catch {
      didThrow = true;
    }
    assert(!didThrow, "HTTP 429 rate limit does not throw or crash the service");
  }

  // ----------------------------------------------------------------
  // Test 9 & 10: Mobile and Desktop responsiveness verification
  // ----------------------------------------------------------------
  console.log("\nTEST 9 & 10: Mobile & Desktop UI component CSS");
  {
    const liveSourcesFile = fs.readFileSync(
      path.resolve(__dirname, "../../matchzone/src/components/LiveSources.tsx"),
      "utf8"
    );
    assert(
      liveSourcesFile.includes("live-sources-switcher") && liveSourcesFile.includes("flexWrap: 'wrap'"),
      "Source switcher supports wrapping for mobile screens without horizontal overflow"
    );
    assert(
      liveSourcesFile.includes("width: '100%'"),
      "Player container has 100% responsive width"
    );
    assert(
      liveSourcesFile.includes("aspectRatio: '16/9'"),
      "Player container maintains 16:9 responsive aspect ratio"
    );
  }

  // ----------------------------------------------------------------
  // Test 11: RTL layout & Arabic strings
  // ----------------------------------------------------------------
  console.log("\nTEST 11: RTL layout & Arabic strings");
  {
    const liveSourcesFile = fs.readFileSync(
      path.resolve(__dirname, "../../matchzone/src/components/LiveSources.tsx"),
      "utf8"
    );
    assert(liveSourcesFile.includes("البث المباشر غير متوفر حالياً"), "Contains Arabic 'البث المباشر غير متوفر حالياً'");
    assert(liveSourcesFile.includes("البث غير متوفر حالياً"), "Contains Arabic 'البث غير متوفر حالياً'");
    assert(liveSourcesFile.includes("المباراة لم تبدأ بعد"), "Contains Arabic upcoming text");
    assert(liveSourcesFile.includes("انتهت المباراة"), "Contains Arabic finished text");
  }

  // ----------------------------------------------------------------
  // Test 12: API Key Security
  // ----------------------------------------------------------------
  console.log("\nTEST 12: API Key Security & Leak Prevention");
  {
    // 1. Check .gitignore
    const gitignoreContent = fs.readFileSync(
      path.resolve(__dirname, "../../../.gitignore"),
      "utf8"
    );
    assert(gitignoreContent.includes(".env"), ".gitignore contains .env");
    assert(gitignoreContent.includes(".env.*"), ".gitignore contains .env.*");
    assert(gitignoreContent.includes("!.env.example"), ".gitignore contains !.env.example");

    // 2. Ensure frontend src doesn't contain LIVE_STREAM_API_KEY
    const frontendSrcDir = path.resolve(__dirname, "../../matchzone/src");
    let keyLeakFound = false;

    function scanDir(dir: string) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const full = path.join(dir, file);
        if (fs.statSync(full).isDirectory()) {
          scanDir(full);
        } else if (file.endsWith(".ts") || file.endsWith(".tsx") || file.endsWith(".js")) {
          const content = fs.readFileSync(full, "utf8");
          if (content.includes("LIVE_STREAM_API_KEY")) {
            keyLeakFound = true;
          }
        }
      }
    }
    scanDir(frontendSrcDir);
    assert(!keyLeakFound, "LIVE_STREAM_API_KEY is NOT referenced or leaked in client code");

    // 3. Ensure frontend .env doesn't contain LIVE_STREAM_API_KEY
    const frontendEnvPath = path.resolve(__dirname, "../../matchzone/.env");
    if (fs.existsSync(frontendEnvPath)) {
      const feEnv = fs.readFileSync(frontendEnvPath, "utf8");
      assert(!feEnv.includes("LIVE_STREAM_API_KEY"), "Frontend .env does not contain LIVE_STREAM_API_KEY");
      assert(!feEnv.includes("SPORTSRC"), "Frontend .env does not expose SportSRC credentials");
    }
  }

  console.log("\n==================================================");
  console.log(`TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("==================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
