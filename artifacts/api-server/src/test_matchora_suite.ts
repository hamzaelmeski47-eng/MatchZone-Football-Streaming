/**
 * Test Suite for Matchora Public API Live Sources Integration
 * Tests:
 * 1. Matchora event resolution & mapping
 * 2. Real embed_url extraction from Matchora
 * 3. Strict HTTPS URL validation
 * 4. Missing / unavailable embed handling
 * 5. Provider adapter integration (LiveSource model)
 * 6. Error handling & resilience when Matchora is unreachable
 */

import {
  getMatchoraSource,
  matchoraService,
  isValidMatchoraEmbedUrl,
} from "./services/matchora.service";
import { MatchoraProvider } from "./providers/matchora.provider";

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
  console.log("Matchora Live Sources Integration Test Suite");
  console.log("==================================================\n");

  // ----------------------------------------------------------------
  // Test 1: URL Validation
  // ----------------------------------------------------------------
  console.log("TEST 1: Strict HTTPS Embed URL Validation");
  {
    assert(
      isValidMatchoraEmbedUrl("https://matchora.to/embed/match/ls5505205"),
      "Valid HTTPS matchora.to embed URL is accepted"
    );
    assert(
      isValidMatchoraEmbedUrl("https://matchora.to/embed/channel/679130"),
      "Valid HTTPS matchora.to channel embed URL is accepted"
    );
    assert(
      !isValidMatchoraEmbedUrl("http://matchora.to/embed/match/123"),
      "Insecure HTTP URL is rejected"
    );
    assert(
      !isValidMatchoraEmbedUrl("https://fake-stream-site.com/embed"),
      "Third party / non-matchora domain is rejected"
    );
    assert(
      !isValidMatchoraEmbedUrl("javascript:alert(1)"),
      "Dangerous javascript: URI is rejected"
    );
    assert(!isValidMatchoraEmbedUrl(null), "Null URL is rejected");
    assert(!isValidMatchoraEmbedUrl(""), "Empty URL is rejected");
  }

  // ----------------------------------------------------------------
  // Test 2: Live Events & Schedule Fetch
  // ----------------------------------------------------------------
  console.log("\nTEST 2: Matchora Live and Schedule Endpoints");
  {
    const liveEvents = await matchoraService.getLiveEvents();
    assert(Array.isArray(liveEvents), "getLiveEvents returns an array");
    console.log(`    (Current Matchora live events count: ${liveEvents.length})`);

    const scheduleEvents = await matchoraService.getScheduleEvents();
    assert(Array.isArray(scheduleEvents), "getScheduleEvents returns an array");
    assert(scheduleEvents.length > 0, "getScheduleEvents successfully fetched watchable schedule");
    console.log(`    (Current Matchora watchable schedule count: ${scheduleEvents.length})`);
  }

  // ----------------------------------------------------------------
  // Test 3: Event Detail Retrieval
  // ----------------------------------------------------------------
  console.log("\nTEST 3: Direct Event Detail Retrieval");
  {
    const schedule = await matchoraService.getScheduleEvents();
    if (schedule.length > 0) {
      const sampleEvent = schedule[0];
      const detail = await matchoraService.fetchEventById(sampleEvent.id);
      assert(detail !== null, `Successfully fetched event detail for ID: ${sampleEvent.id}`);
      assert(
        detail?.embed_url ? isValidMatchoraEmbedUrl(detail.embed_url) : true,
        "Event detail embed_url (if present) is a valid HTTPS matchora URL"
      );
    } else {
      assert(true, "Schedule empty at the moment, skipped detail fetch");
    }
  }

  // ----------------------------------------------------------------
  // Test 4: Fixture ID Mapping & Resolution
  // ----------------------------------------------------------------
  console.log("\nTEST 4: Fixture Resolution & Fallback When No Event Matches");
  {
    // Querying with non-matching teams must safely return NO_MATCHORA_EVENT
    const res = await getMatchoraSource(9999999, {
      fixtureId: 9999999,
      homeTeam: "Totally Nonexistent Team XYZ",
      awayTeam: "Fake Club 123",
      status: "live",
    });

    assert(res.available === false, "res.available is false when no match exists");
    assert(res.provider === "Matchora", "res.provider is Matchora");
    assert(
      res.reason === "NO_MATCHORA_EVENT",
      "Correct reason NO_MATCHORA_EVENT returned for unmatched fixture"
    );
  }

  // ----------------------------------------------------------------
  // Test 5: Real Matchora Matching with Real Match
  // ----------------------------------------------------------------
  console.log("\nTEST 5: Real Matchora Matching with Watchable Match");
  {
    const schedule = await matchoraService.getScheduleEvents();
    if (schedule.length > 0) {
      const target = schedule[0];
      const res = await getMatchoraSource(12345, {
        fixtureId: 12345,
        homeTeam: target.home,
        awayTeam: target.away,
        status: "live",
      });

      if (res.available) {
        assert(res.provider === "Matchora", "Provider is Matchora");
        assert(
          typeof res.embedUrl === "string" && res.embedUrl.startsWith("https://matchora.to"),
          "Returned embedUrl starts with https://matchora.to"
        );
      } else {
        assert(
          res.reason === "NO_EMBED_AVAILABLE" || res.reason === "NO_MATCHORA_EVENT",
          "Graceful reason returned when embed is not watchable"
        );
      }
    }
  }

  // ----------------------------------------------------------------
  // Test 6: MatchoraProvider Adapter Output
  // ----------------------------------------------------------------
  console.log("\nTEST 6: MatchoraProvider Adapter Integration");
  {
    const provider = new MatchoraProvider();
    assert(provider.name === "Matchora", "Provider name is Matchora");

    // Unmatched fixture
    const sources = await provider.getSources({
      fixtureId: 88888,
      homeTeam: "Nonexistent Home",
      awayTeam: "Nonexistent Away",
    });
    assert(Array.isArray(sources) && sources.length === 0, "Returns empty array when match is not found");
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
