import Image from "next/image";
import HomePage from "@/components/homepage";
import Recorder from "@/components/recorder";
import { Conversation } from "@/components/conversation";

export default function Home() {
  return (
    <div className="font-sans">
      <HomePage />
      <Recorder />
    </div>

  );
}
