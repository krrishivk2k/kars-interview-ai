import Image from "next/image";
import HomePage from "@/components/homepage";
import LandingPage from "@/components/landing-page";
import Recorder from "@/components/recorder";

export default function Home() {
  return (
    <div className="font-sans">
      <LandingPage />
      {/* <Recorder /> */}
    </div>

  );
}
