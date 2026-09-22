export default async function handler(req, res) {
  // Only allow GET requests.
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  const query =
    typeof req.query.q === "string"
      ? req.query.q.trim()
      : "";

  // Don't send very short searches to Geoapify.
  if (query.length < 3) {
    return res.status(200).json({
      suggestions: [],
    });
  }

  const apiKey = process.env.GEOAPIFY_API_KEY;

  if (!apiKey) {
    console.error("GEOAPIFY_API_KEY is not configured.");

    return res.status(500).json({
      error: "Address suggestions are temporarily unavailable.",
    });
  }

  try {
    const params = new URLSearchParams({
      text: query,
      format: "json",
      limit: "10",
      filter: "countrycode:us",
      bias: "proximity:-73.9442,40.6782",
      apiKey: apiKey,
    });

    const response = await fetch(
      `https://api.geoapify.com/v1/geocode/autocomplete?${params.toString()}`
    );

    if (!response.ok) {
      console.error(
        "Geoapify autocomplete error:",
        response.status,
        await response.text()
      );

      return res.status(502).json({
        error: "Address suggestions are temporarily unavailable.",
      });
    }

    const data = await response.json();

    const results = Array.isArray(data.results)
      ? data.results
      : [];

    const suggestions = results
      .map((result) => {
        const city = String(result.city || "").toLowerCase().trim();
        const county = String(result.county || "").toLowerCase().trim();
        const district = String(result.district || "").toLowerCase().trim();
        const suburb = String(result.suburb || "").toLowerCase().trim();
        const borough = String(result.borough || "").toLowerCase().trim();
        const state = String(result.state || "").toLowerCase().trim();
        const stateCode = String(result.state_code || "").toLowerCase().trim();
        const formatted = String(result.formatted || "").toLowerCase();

        const isNewYork =
          state === "new york" ||
          stateCode === "ny";

        const isBrooklyn =
          city === "brooklyn" ||
          district === "brooklyn" ||
          suburb === "brooklyn" ||
          borough === "brooklyn" ||
          county === "kings" ||
          county === "kings county" ||
          formatted.includes("brooklyn, ny") ||
          formatted.includes("brooklyn, new york");

        const isQueens =
          city === "queens" ||
          district === "queens" ||
          suburb === "queens" ||
          borough === "queens" ||
          county === "queens" ||
          county === "queens county" ||
          formatted.includes("queens, ny") ||
          formatted.includes("queens, new york");

        // Explicitly reject NYC boroughs outside Heatspan's service area.
        const isOutsideNYCBorough =
          city === "manhattan" ||
          district === "manhattan" ||
          borough === "manhattan" ||
          county === "new york county" ||
          city === "bronx" ||
          district === "bronx" ||
          borough === "bronx" ||
          county === "bronx county" ||
          city === "staten island" ||
          district === "staten island" ||
          borough === "staten island" ||
          county === "richmond county" ||
          formatted.includes("manhattan, ny") ||
          formatted.includes("new york, ny") ||
          formatted.includes("bronx, ny") ||
          formatted.includes("staten island, ny");

        const inRange =
          isNewYork &&
          !isOutsideNYCBorough &&
          (isBrooklyn || isQueens);

        return {
          formatted: result.formatted || "",
          address_line1: result.address_line1 || "",
          address_line2: result.address_line2 || "",
          city: result.city || "",
          county: result.county || "",
          district: result.district || "",
          suburb: result.suburb || "",
          borough: result.borough || "",
          state: result.state || "",
          state_code: result.state_code || "",
          postcode: result.postcode || "",
          country: result.country || "",
          inRange,
        };
      })
      .filter(
        (result) =>
          result.formatted &&
          result.inRange === true
      )
      .slice(0, 6);

    // TEMPORARY DEBUG:
    // Returns the raw Geoapify results so we can see exactly
    // how Brooklyn and Queens addresses are classified.
    return res.status(200).json({
      suggestions,
      debug: results,
    });
  } catch (error) {
    console.error("Address autocomplete failed:", error);

    return res.status(500).json({
      error: "Address suggestions are temporarily unavailable.",
    });
  }
}
