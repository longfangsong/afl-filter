import type { D1Database } from "@cloudflare/workers-types";
import type { EventContext } from "@cloudflare/workers-types";
import type { Job } from "../../src/types/job";

interface Env {
  DB: D1Database;
}

export async function onRequestGet(context: EventContext<Env, string, unknown>) {
  const { request, env } = context;
  const url = new URL(request.url);
  const searchParams = new URLSearchParams(url.search);

  const region = searchParams.get("region");
  const field = searchParams.get("field");
  if (!field) {
    return new Response(JSON.stringify([]), {
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  const experience = searchParams.get("experience");
  const excludeSkills = searchParams.get("excludeSkills");
  const needsVisaSponsor = searchParams.get("needsVisaSponsor") === "true";
  const swedishFlunt = searchParams.get("swedishFlunt") === "true";

  let query = "SELECT * FROM Job WHERE field = ?";
  const params: (string | number)[] = [field];

  if (region) {
    query += " AND region = ?";
    params.push(region);
  }
  if (experience) {
    query += " AND (experience <= ? OR experience IS NULL)";
    params.push(parseInt(experience));
  }
  if (needsVisaSponsor) {
    query += " AND (visa_sponsor IS NULL OR visa_sponsor = true)";
  }
  if (!swedishFlunt) {
    query += " AND (swedish IS NULL OR swedish = 'false' OR swedish = 'likely')";
  }
  if (excludeSkills) {
    const skillsToExclude = excludeSkills.split(",").map(skill => skill.trim());
    const excludeConditions = skillsToExclude.map(skill => {
      return `(skills NOT LIKE ? AND skills NOT LIKE ? AND skills NOT LIKE ?)`;
    }).join(" AND ");
    query += ` AND (${excludeConditions})`;
    skillsToExclude.forEach(skill => {
      params.push(`%,${skill},%`);
      params.push(`${skill},%`);
      params.push(`%,${skill}`);
    });
  }

  query += " ORDER BY ";
  if (needsVisaSponsor) {
    query += "CASE WHEN visa_sponsor = true THEN 0 ELSE 1 END, ";
  }
  if (!swedishFlunt) {
    query += "CASE WHEN swedish = 'likely' THEN 1 ELSE 0 END, ";
  }
  query += "id";

  const stmt = env.DB.prepare(query);
  const results = await stmt.bind(...params).all<Job>();
  return new Response(JSON.stringify(results.results), {
    headers: {
      "Content-Type": "application/json",
    },
  });
} 