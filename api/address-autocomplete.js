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

        const isNewYork =
          state === "new york" ||
          stateCode === "ny";

        // Brooklyn is officially Kings County.
        const isBrooklyn =
          county === "kings county" ||
          county === "kings" ||
          suburb === "brooklyn" ||
          district === "brooklyn" ||
          borough === "brooklyn" ||
          city === "brooklyn";

        // Queens is officially Queens County.
        const isQueens =
          county === "queens county" ||
          county === "queens" ||
          suburb === "queens" ||
          district === "queens" ||
          borough === "queens" ||
          city === "queens";

        // Explicitly reject the three NYC boroughs outside
        // Heatspan's Brooklyn + Queens service area.
        const isManhattan =
          county === "new york county" ||
          district === "manhattan" ||
          suburb === "manhattan" ||
          borough === "manhattan" ||
          city === "manhattan";

        const isBronx =
          county === "bronx county" ||
          district === "bronx" ||
          suburb === "bronx" ||
          borough === "bronx" ||
          city === "bronx";

        const isStatenIsland =
          county === "richmond county" ||
          district === "staten island" ||
          suburb === "staten island" ||
          borough === "staten island" ||
          city === "staten island";

        const inRange =
          isNewYork &&
          (isBrooklyn || isQueens) &&
          !isManhattan &&
          !isBronx &&
          !isStatenIsland;

        return {
          formatted: result.formatted || "",
          address_line1: result.address_line1 || "",
          address_line2: result.address_line2 || "",
          city: result.city || "",
          county: result.county || "",
          district: result.district || "",
          suburb: result.suburb || "",
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

    return res.status(200).json({
      suggestions,
    });
  } catch (error) {
    console.error("Address autocomplete failed:", error);

    return res.status(500).json({
      error: "Address suggestions are temporarily unavailable.",
    });
  }
}
