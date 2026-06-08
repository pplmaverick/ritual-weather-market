import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { cookieStorage, createStorage } from "wagmi";
import { ritualChain } from "./chain";

export const wagmiConfig = getDefaultConfig({
  appName: "Weather Market",
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? "demo",
  chains: [ritualChain],
  ssr: true,
  storage: createStorage({ storage: cookieStorage }),
});
