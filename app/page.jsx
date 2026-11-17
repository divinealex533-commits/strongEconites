import App from "@/components/App";

export default function Page() {
  return <App aiEnabled={Boolean(process.env.ANTHROPIC_API_KEY)} />;
}

export const dynamic = "force-dynamic";
