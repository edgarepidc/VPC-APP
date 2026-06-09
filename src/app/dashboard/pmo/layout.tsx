import { PmoSubnav } from "./pmo-subnav";

export default function PmoHubLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <PmoSubnav />
      {children}
    </>
  );
}
