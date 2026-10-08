import { getLiveFixtures, getFixturesByDate } from "./src/services/api-football.service";
import { streamModel } from "./src/models/stream.model";

async function test() {
  console.log("=== Testing API-Football & Authorized Streams ===");

  try {
    console.log("\n1. Fetching live fixtures...");
    const live = await getLiveFixtures();
    console.log(`Live fixtures count: ${live.length}`);
  } catch (err: any) {
    console.error("API-Football test error:", err.message);
  }

  try {
    const today = new Date().toISOString().split("T")[0];
    console.log(`\n2. Fetching today's fixtures (${today})...`);
    const todayFixtures = await getFixturesByDate(today);
    console.log(`Today's fixtures count: ${todayFixtures.length}`);
  } catch (err: any) {
    console.error("Fixtures error:", err.message);
  }

  try {
    console.log("\n3. Testing authorized streams database...");
    const streams = await streamModel.findAll();
    console.log(`Configured streams count: ${streams.length}`);
  } catch (err: any) {
    console.error("Streams error:", err.message);
  }

  console.log("\n=== Test complete ===");
}

test();
