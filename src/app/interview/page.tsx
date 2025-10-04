import Recorder from "@/components/recorder";
import { Conversation } from "@/components/conversation";

export default function Interview() {
    return (
      <div className="font-sans">
        <Recorder />
        <Conversation />
      </div>
  
    );
  }