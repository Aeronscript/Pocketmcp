// src/app/api/health/route.ts
// Endpoint de health check pour keep-alive (Solution B anti-sleep Render).
//
// Render free tier s'endort après 15 min d'inactivité. Quand il s'endort,
// toutes les données en RAM sont perdues et le fichier data/auth-codes.json
// est régénéré depuis GitHub (sans les sessions/users/adminDevices).
//
// Solution : un service externe (UptimeRobot, cron-job.org, GitHub Actions)
// ping cet endpoint toutes les 10 minutes pour garder le service réveillé.
//
// Config :
// 1. Va sur https://uptimerobot.com (gratuit)
// 2. Add Monitor → HTTP(s) → URL : https://pocketmcp.onrender.com/api/health
// 3. Monitoring interval : 10 minutes
// 4. Save
//
// Alternative : https://cron-job.org (gratuit, même principe)

export const dynamic = "force-static";

export async function GET() {
  return Response.json({
    ok: true,
    status: "alive",
    timestamp: Date.now(),
    service: "pocketmcp",
  });
}
