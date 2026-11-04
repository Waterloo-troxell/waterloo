import type { MetadataRoute } from "next";

/**
 * Waterloo is private but lives at a public address, so the only correct
 * answer to any crawler is no.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
  };
}
