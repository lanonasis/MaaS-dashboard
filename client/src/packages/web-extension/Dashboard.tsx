import React from "react";
import { RichPanel } from "./RichPanel";

export const Dashboard = () => {
  return (
    <div className="h-screen w-full bg-[#0D0D0D] flex items-center justify-center p-8">
       <div className="w-full max-w-[400px] h-full border border-[#3C3C3C] rounded-lg overflow-hidden shadow-2xl">
          <RichPanel />
       </div>
    </div>
  );
}
