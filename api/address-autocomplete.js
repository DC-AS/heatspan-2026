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
      limit: "6",
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
        const city = String(result.city || "").toLowerCase();
        const county = String(result.county || "").toLowerCase();
        const district = String(result.district || "").toLowerCase();
        const state = String(result.state || "").toLowerCase();

        const isNewYork =
          state === "new york" ||
          state === "ny";

        const isBrooklyn =
          city === "brooklyn" ||
          district === "brooklyn" ||
          county === "kings county" ||
          county === "kings";

        const isQueens =
          city === "queens" ||
          district === "queens" ||
          county === "queens county" ||
          county === "queens";

        return {
          ...result,
          inRange: isNewYork && (isBrooklyn || isQueens),
        };
      })
      .filter((result) => result.formatted && result.inRange === true);

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
