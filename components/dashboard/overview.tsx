import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/utils";
import { listDeployments, type DeploymentRecord } from "@/lib/db";
import { Suspense } from "react";
import { Activity, BarChart3, CheckCircle2, Clock, Info } from "lucide-react";

async function DeploymentsTable() {
  const deployments = await listDeployments();

  const data: DeploymentRecord[] = deployments.length
    ? deployments
    : [
        {
          id: "demo-1",
          assetName: "Warehouse Lending SPV",
          chain: "Base Sepolia",
          status: "deployed",
          createdAt: new Date().toISOString(),
        },
        {
          id: "demo-2",
          assetName: "Carbon Credit Pool",
          chain: "Polygon Amoy",
          status: "pending",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
        },
      ];

  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Asset</th>
            <th className="px-4 py-3 font-medium">Chain</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Created</th>
          </tr>
        </thead>
        <tbody>
          {data.map((deployment) => (
            <tr key={deployment.id} className="border-t">
              <td className="px-4 py-3 font-medium">{deployment.assetName}</td>
              <td className="px-4 py-3 text-muted-foreground">{deployment.chain}</td>
              <td className="px-4 py-3">
                <Badge variant={deployment.status === "deployed" ? "default" : deployment.status === "pending" ? "secondary" : "outline"}>
                  {deployment.status}
                </Badge>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{formatDate(deployment.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const METRICS = [
  {
    title: "Issuances live",
    value: "4",
    description: "Contracts deployed across test networks",
    icon: CheckCircle2,
  },
  {
    title: "Disclosures drafted",
    value: "12",
    description: "AI-generated compliance documents this week",
    icon: Activity,
  },
  {
    title: "Pending reviews",
    value: "3",
    description: "Legal approvals awaiting counsel",
    icon: Clock,
  },
];

export function DashboardOverview() {
  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {METRICS.map((metric) => (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
              <metric.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{metric.value}</div>
              <p className="text-xs text-muted-foreground">{metric.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-muted-foreground/20">
          <CardHeader>
            <CardTitle>Deployment timeline</CardTitle>
            <CardDescription>Records synchronized from Neon using server components.</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<p className="text-sm text-muted-foreground">Loading deployments...</p>}>
              <DeploymentsTable />
            </Suspense>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Risk telemetry</CardTitle>
              <CardDescription>Track off-chain metrics and protocol signals.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              Integrate trustees and servicers through Neon-backed webhooks to surface covenant breaches, NAV drifts, and
              repayment anomalies directly in this dashboard.
            </p>
            <p>
              Add Chainlink Functions feeds to compare oracle pricing vs. trustee NAV, enabling automated alerts when
              spreads exceed configured thresholds.
            </p>
            <Separator />
            <div className="flex items-center gap-3 rounded-md border border-dashed border-primary/40 bg-primary/5 p-3 text-xs text-primary">
              <Info className="h-4 w-4" />
              Extend this panel with shadcn/ui charts or embed Metabase dashboards once telemetry endpoints are ready.
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
