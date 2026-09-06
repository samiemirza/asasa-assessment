import { TabBar } from "@/components/TabBar";
import { TopBar } from "@/components/TopBar";

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopBar />
      {children}
      <TabBar />
    </>
  );
}
