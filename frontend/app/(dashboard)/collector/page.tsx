import type { Metadata } from "next";
import Collector from "./collector";

export const metadata: Metadata = {
  title: "Web Collector",
  robots: { index: false, follow: false },
};

export default function CollectorPage() {
  return <Collector />;
}
